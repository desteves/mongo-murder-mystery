// Extended JSON (EJSON) support for the /eval path.
//
// Input:  filters/projections may contain EJSON wrappers ({"$oid": ...}, {"$date": ...}, {"$numberLong": ...}) and the
//         mongosh literals ObjectId("..."), ISODate("..."), NumberLong(...), NumberInt(...), NumberDecimal("...").
//         Plain JSON is a subset, so existing queries parse identically.
// Output: results are written as relaxed EJSON, so ObjectId/Date/Long keep their type instead of flattening to strings.
//
// Security: EJSON can express types plain JSON cannot (notably {"$code": ...}, which becomes server-side JavaScript).
//           assertNoForbiddenBsonTypes() rejects those on the parsed value; helpers.js calls it with the operator denylist.
const { BSON } = require('mongodb');
const { EJSON } = BSON;

// BSON types a game query has no business sending: JavaScript and references.
const FORBIDDEN_BSON_TYPES = new Set(['Code', 'DBRef', 'BSONSymbol']);

// One pass over the text: a double-quoted string is copied untouched; a literal outside strings is rewritten.
const LITERAL_RE = /"(?:[^"\\]|\\.)*"|(?:new\s+)?\b(ObjectId|ISODate|Date|NumberLong|NumberInt|NumberDecimal)\(\s*(?:"([^"]*)"|'([^']*)'|(-?\d+))\s*\)/g;

function shellLiteralsToEJSON(text) {
  return text.replace(LITERAL_RE, (match, fn, dq, sq, num) => {
    if (!fn) return match; // a string literal
    const arg = dq ?? sq ?? num;
    switch (fn) {
      case 'ObjectId':
        return /^[0-9a-fA-F]{24}$/.test(arg) ? `{"$oid":"${arg}"}` : match;
      case 'ISODate':
      case 'Date':
        return /^[0-9TZ:.+\- ]+$/.test(arg ?? '') ? `{"$date":"${arg.replace(' ', 'T')}"}` : match;
      case 'NumberLong':
        return /^-?\d+$/.test(arg) ? `{"$numberLong":"${arg}"}` : match;
      case 'NumberInt':
        return /^-?\d+$/.test(arg) ? arg : match;
      case 'NumberDecimal':
        return /^-?[0-9.eE+]+$/.test(arg) ? `{"$numberDecimal":"${arg}"}` : match;
      default:
        return match;
    }
  });
}

// EJSON treats {"$regex": ..., "$options": ...} as a legacy BSON regular expression *value*. In a query it is the $regex
// query operator, so those two keys are renamed around the parse and restored afterwards (queries behave as before).
function protectOperatorKeys(text) {
  return text.replace(/"\$regex"\s*:/g, '"__mmm_regex__":').replace(/"\$options"\s*:/g, '"__mmm_options__":');
}

function restoreOperatorKeys(value) {
  if (Array.isArray(value)) return value.map(restoreOperatorKeys);
  if (value && typeof value === 'object' && !value._bsontype && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k === '__mmm_regex__' ? '$regex' : k === '__mmm_options__' ? '$options' : k, restoreOperatorKeys(v)]));
  }
  return value;
}

/** Parses JSON or EJSON text into a value holding real BSON types. Throws on invalid input. */
function parseEjson(text) {
  return restoreOperatorKeys(EJSON.parse(protectOperatorKeys(shellLiteralsToEJSON(text))));
}

/** Serializes a driver result as relaxed EJSON (valid JSON text). */
function toEjsonString(value) {
  return EJSON.stringify(value, { relaxed: true });
}

/** Throws (via the callback) when a parsed value holds a forbidden BSON type at any depth. */
function findForbiddenBsonType(value) {
  if (Array.isArray(value)) {
    for (const v of value) {
      const hit = findForbiddenBsonType(v);
      if (hit) return hit;
    }
  } else if (value && typeof value === 'object') {
    if (value._bsontype) return FORBIDDEN_BSON_TYPES.has(value._bsontype) ? value._bsontype : undefined;
    for (const v of Object.values(value)) {
      const hit = findForbiddenBsonType(v);
      if (hit) return hit;
    }
  }
  return undefined;
}

module.exports = { parseEjson, toEjsonString, shellLiteralsToEJSON, findForbiddenBsonType, FORBIDDEN_BSON_TYPES };
