const { parseEjson, toEjsonString, shellLiteralsToEJSON, findForbiddenBsonType } = require('./ejson');
const { ObjectId, Long } = require('mongodb');
jest.mock('./database');
const connectDB = require('./database');
const { parseFindArgs, processQuery } = require('./helpers');

describe('shellLiteralsToEJSON', () => {
  test('rewrites mongosh literals outside strings', () => {
    expect(shellLiteralsToEJSON('{"_id": ObjectId("5f9f1b9f1b9f1b9f1b9f1b9f")}')).toBe('{"_id": {"$oid":"5f9f1b9f1b9f1b9f1b9f1b9f"}}');
    expect(shellLiteralsToEJSON('{"d": ISODate("2018-01-15")}')).toBe('{"d": {"$date":"2018-01-15"}}');
    expect(shellLiteralsToEJSON('{"d": new Date("2018-01-15T10:00:00Z")}')).toBe('{"d": {"$date":"2018-01-15T10:00:00Z"}}');
    expect(shellLiteralsToEJSON('{"n": NumberLong("9007199254740993")}')).toBe('{"n": {"$numberLong":"9007199254740993"}}');
    expect(shellLiteralsToEJSON('{"n": NumberInt(5)}')).toBe('{"n": 5}');
  });

  test('leaves string contents and bad arguments alone', () => {
    const s = '{"name": "ObjectId(\\"abc\\")", "x": ObjectId("nothex")}';
    expect(shellLiteralsToEJSON(s)).toBe(s);
  });
});

describe('parseEjson', () => {
  test('plain JSON parses exactly as before', () => {
    expect(parseEjson('{"type":"theft","n":{"$gt":3}}')).toEqual({ type: 'theft', n: { $gt: 3 } });
  });

  test('wrappers and literals become real BSON types', () => {
    const v = parseEjson('{"_id": {"$oid": "5f9f1b9f1b9f1b9f1b9f1b9f"}, "b": ObjectId("5f9f1b9f1b9f1b9f1b9f1b9f"), "d": ISODate("2018-01-15")}');
    expect(v._id).toBeInstanceOf(ObjectId);
    expect(v.b).toBeInstanceOf(ObjectId);
    expect(v.d).toBeInstanceOf(Date);
    expect(v.d.toISOString()).toBe('2018-01-15T00:00:00.000Z');
  });

  test('invalid input throws', () => {
    expect(() => parseEjson('{not json}')).toThrow();
  });
});

describe('toEjsonString', () => {
  test('keeps ObjectId and Date types (relaxed) instead of flattening to strings', () => {
    const out = JSON.parse(toEjsonString([{ _id: new ObjectId('5f9f1b9f1b9f1b9f1b9f1b9f'), at: new Date(0), n: 5, big: Long.fromNumber(7) }]));
    expect(out[0]._id).toEqual({ $oid: '5f9f1b9f1b9f1b9f1b9f1b9f' });
    expect(out[0].at).toEqual({ $date: '1970-01-01T00:00:00Z' });
    expect(out[0].n).toBe(5);
    expect(out[0].big).toBe(7);
  });

  test('plain data is unchanged', () => {
    expect(JSON.parse(toEjsonString(['a', 1, { x: [true, null] }]))).toEqual(['a', 1, { x: [true, null] }]);
  });
});

describe('security: forbidden BSON types', () => {
  test('finds Code and DBRef at any depth, allows ordinary types', () => {
    expect(findForbiddenBsonType(parseEjson('{"a": {"b": [{"$code": "sleep(1)"}]}}'))).toBe('Code');
    expect(findForbiddenBsonType(parseEjson('{"a": {"$ref": "c", "$id": 1}}'))).toBe('DBRef');
    expect(findForbiddenBsonType(parseEjson('{"a": ObjectId("5f9f1b9f1b9f1b9f1b9f1b9f"), "d": ISODate("2018-01-15"), "n": NumberLong("5")}'))).toBeUndefined();
  });
});

describe('parseFindArgs with EJSON', () => {
  test('accepts an ObjectId literal and an EJSON wrapper in the filter', () => {
    const [filter] = parseFindArgs('{ "_id": ObjectId("5f9f1b9f1b9f1b9f1b9f1b9f") }');
    expect(filter._id).toBeInstanceOf(ObjectId);
    const [filter2] = parseFindArgs('{ "_id": {"$oid": "5f9f1b9f1b9f1b9f1b9f1b9f"} }');
    expect(filter2._id).toBeInstanceOf(ObjectId);
  });

  test('existing plain filters, operators and regex literals still work', () => {
    expect(parseFindArgs('{ "type": "theft", "city": "Chicago" }')[0]).toEqual({ type: 'theft', city: 'Chicago' });
    expect(parseFindArgs('{ date: { $gt: 20180115, $lt: 20190215 } }')[0]).toEqual({ date: { $gt: 20180115, $lt: 20190215 } });
    expect(parseFindArgs('{ "city": /^I/ }')[0]).toEqual({ city: { $regex: '^I' } });
  });
});

describe('processQuery with literals that contain parentheses', () => {

  test('find({ _id: ObjectId(...) }) reaches the driver with a real ObjectId', async () => {
    const calls = [];
    connectDB.mockReturnValue({
      collection: () => ({ find: (filter) => { calls.push(filter); return { limit: () => ({ sort: () => ({ toArray: async () => [] }) }) }; } }),
    });
    await processQuery('db.person.find({ "_id": ObjectId("5f9f1b9f1b9f1b9f1b9f1b9f") }).limit(3)');
    expect(calls[0]._id).toBeInstanceOf(ObjectId);
  });

  test('a ")" inside a string value does not cut the arguments short', async () => {
    const calls = [];
    connectDB.mockReturnValue({
      collection: () => ({ find: (filter) => { calls.push(filter); return { limit: () => ({ sort: () => ({ toArray: async () => [] }) }) }; } }),
    });
    await processQuery('db.person.find({ "name": "Smith (Jr)" })');
    expect(calls[0]).toEqual({ name: 'Smith (Jr)' });
  });
});
