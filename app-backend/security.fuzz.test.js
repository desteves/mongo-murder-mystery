// Property-style fuzz test for the /eval query path (helpers.js::processQuery). Whatever string a user sends,
// the database layer must only ever see read operations on game collections, plus the single allowed
// update ($inc count) on `solution`, and filters must not smuggle in server-side JavaScript or write stages.
// Deterministic (seeded) so failures reproduce; raise FUZZ_ITERATIONS for a longer run in CI.
const connectDB = require('./database');
jest.mock('./database');
const { processQuery } = require('./helpers');
const { findForbiddenBsonType } = require('./ejson');

const ITERATIONS = parseInt(process.env.FUZZ_ITERATIONS || '2000', 10);
const FORBIDDEN = ['$where', '$function', '$accumulator', '$out', '$merge', '$lookup', '$unionWith'];
const READ_METHODS = new Set(['distinct', 'find', 'countDocuments', 'estimatedDocumentCount']);

// mulberry32: small seeded PRNG
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COLLS = ['person', 'crime', 'gymCheckin', 'socialEventCheckin', 'solution', 'system.profile', 'a.b', '$cmd', ''];
const METHODS = ['find', 'findOne', 'distinct', 'countDocuments', 'estimatedDocumentCount', 'aggregate', 'insertOne',
  'insertMany', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'drop', 'createIndex', 'renameCollection', 'bulkWrite'];
const ARGS = ['', '{}', '{"name": "x"}', '{ $where: "sleep(1000)" }', '{"$where":"1"}', '{ name: { $function: {} } }',
  '{"name":{"$regex":".*"}}', '{"_id": "Bob"}', '{"a":{"$out":"x"}}', '[{"$merge":{"into":"solution"}}]',
  '"name"', '"name", {}', '{}, {"projection": {"a": 1}}', '{"$expr":{"$function":{"body":"x","args":[],"lang":"js"}}}',
  // Extended JSON / mongosh literals: ordinary types must parse; JavaScript and references must never reach the driver
  '{"x": {"$code": "sleep(5000)"}}', '{"x": {"$code": "1", "$scope": {}}}', '{"_id": {"$ref": "solution", "$id": 1}}',
  '{"_id": {"$oid": "5f9f1b9f1b9f1b9f1b9f1b9f"}}', '{"_id": ObjectId("5f9f1b9f1b9f1b9f1b9f1b9f")}', '{"d": ISODate("2018-01-15")}',
  '{"d": {"$date": "2018-01-15T00:00:00Z"}}', '{"n": NumberLong("9007199254740993")}',
  '{"r": {"$regularExpression": {"pattern": "^a", "options": "i"}}}', '{"a": {"$code": "x"}, "b": ObjectId("5f9f1b9f1b9f1b9f1b9f1b9f")}'];
const TAILS = ['', '.limit(5)', '.limit(999999)', '.sort({"a":1})', '.sort({"$natural":-1})', '.count()', '.toArray()', '.limit(-1)',
  '.drop()', '.limit(5).sort({"a":1})', ';db.dropDatabase()', ' ; db.solution.deleteMany({})'];
const JUNK = ['%', '%00', '\u0000', '..', '$', '{', '}', '(', ')', '"', "'", '\\', '\n', 'db.', 'solution'];

function randomQuery(r) {
  const pick = (xs) => xs[Math.floor(r() * xs.length)];
  let q = `db.${pick(COLLS)}.${pick(METHODS)}(${pick(ARGS)})${pick(TAILS)}`;
  if (r() < 0.3) q = pick(['db.getCollectionNames()', 'db.getSiblingDB("admin").', 'use admin;', '']) + q;
  if (r() < 0.4) { // mutate: insert junk at a random position
    const i = Math.floor(r() * (q.length + 1));
    q = q.slice(0, i) + pick(JUNK) + q.slice(i);
  }
  if (r() < 0.2) q = q.replace(/db\.([A-Za-z]+)/, (m) => (r() < 0.5 ? m.toUpperCase() : m));
  return q;
}

describe('processQuery security invariants (fuzz)', () => {
  let calls;
  const fakeCursor = () => {
    const c = { sort: () => c, limit: () => c, toArray: async () => [] };
    return c;
  };

  beforeEach(() => {
    calls = [];
    const record = (coll, method, args) => calls.push({ coll, method, args });
    const db = {
      listCollections: () => ({ toArray: async () => [{ name: 'person' }, { name: 'solution' }] }),
      collection: (name) => new Proxy({}, {
        get: (_t, method) => (...args) => {
          record(name, String(method), args);
          if (method === 'find') return fakeCursor();
          if (method === 'updateOne') return { modifiedCount: 1 };
          return READ_METHODS.has(String(method)) ? (method === 'distinct' ? [] : 0) : undefined;
        },
      }),
    };
    connectDB.mockReturnValue(db);
  });

  test(`never reaches the database with a dangerous operation (${ITERATIONS} random queries)`, async () => {
    const r = rng(0xc0ffee);
    for (let i = 0; i < ITERATIONS; i += 1) {
      const q = randomQuery(r);
      calls.length = 0;
      try { await processQuery(q); } catch { /* rejecting is the expected outcome for most inputs */ }

      for (const { coll, method, args } of calls) {
        const ctx = `query: ${JSON.stringify(q)} -> ${coll}.${method}`;
        if (coll === 'solution') {
          // Only the single allowed update, with exactly an $inc on count.
          expect([ctx, method]).toEqual([ctx, 'updateOne']);
          expect([ctx, JSON.stringify(args[1])]).toEqual([ctx, JSON.stringify({ $inc: { count: 1 } })]);
        } else {
          expect([ctx, READ_METHODS.has(method)]).toEqual([ctx, true]);
        }
        expect([ctx, /^[A-Za-z0-9_]+$/.test(coll)]).toEqual([ctx, true]);
        if (method === 'distinct') {
          // The argument is a field path (a string), never an expression: "$where" here is just a field name.
          expect([ctx, typeof args[0]]).toEqual([ctx, 'string']);
          continue;
        }
        // JavaScript (Code) and references (DBRef) are never allowed, however they are spelled
        expect([ctx, findForbiddenBsonType(args)]).toEqual([ctx, undefined]);
        // Exact operator keys at any depth (a field merely *containing* "$where" is just a field name).
        const keys = [];
        const walk = (v) => {
          if (Array.isArray(v)) v.forEach(walk);
          else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { keys.push(k); walk(x); }
        };
        walk(args);
        for (const bad of FORBIDDEN) expect([ctx, keys.includes(bad)]).toEqual([ctx, false]);
      }
    }
  });
});
