const connectDB = require('./database'); // Replace with actual filename
jest.mock('./database'); // Mock `connectDB`


const { validateQueryString,
  isGetCollections,
  hasCollectionName,
  getCollectionName,
  cleanCollectionName,
  parseStringField,
  isSolutionCheck,
  parseSolutionCheck,
  isFindArgs,
  cleanRegexValues,
  parseFindArgs,
  quoteJsonKeys,
  matchField,
  processQuery } = require('./helpers');

describe('processQuery', () => {
  let mockDB;
  beforeEach(() => {
    mockDB = {
      collection: jest.fn(() => ({
        distinct: jest.fn(() => ['v1', 'v2']), // Mock return value directly
        updateOne: jest.fn(() => ({ modifiedCount: 1 })), // Mock return value directly
        find: jest.fn(() => ({
          sort: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          toArray: jest.fn(() => [{ name: 'John Doe' }, { name: 'Jane Doe' }]), // Mock return value directly
        })),
        count: jest.fn(() => 5), // Mock return value directly
      })),
      listCollections: jest.fn(() => ({
        toArray: jest.fn(() => ['c1', 'c2']), // Mock return value directly
      })),
    };
    connectDB.mockReturnValue(mockDB); // Mock connection return value directly


  });
  // Valid queries
  test('should handle listing collections', async () => {
    const query = 'db.getCollectionNames()';
    const [_, desc] = await processQuery(query);
    expect(desc).toBe('db.listCollections().toArray()');
  });
  test('should handle valid solution collection suspect check', async () => {
    const query = 'db.solution.find({ "name": "suspectId" })';
    const [_, desc] = await processQuery(query);
    expect(desc).toBe(query);
  });
  test('should parse a distinct query', async () => {
    const query = 'db.collection.distinct("fieldName")';
    const [_, desc] = await processQuery(query);
    expect(desc).toBe(`db.collection.distinct('fieldName')`);
  });
  // not yet supported
  // test('should handle count query with filter', async () => {
  //   const query = 'db.collection.count({"age":{"$gt":21}})';
  //   const [_, desc] = await processQuery(query);
  //   expect(desc).toBe(query);
  // });
  test('should handle count query without filter', async () => {
    const query = 'db.collection.count()';
    const [_, desc] = await processQuery(query);
    expect(desc).toBe(`db.collection.count()`);
  });
  test('should perform a find query without sort and limit', async () => {
    const query = 'db.crime.find({}, {})';
    const [_, desc] = await processQuery(query);
    expect(desc).toBe(`db.crime.find({}, {}).limit(30).sort({"_id":1}).toArray()`);
  });
  test('should perform a find query with sort and limit', async () => {
    const query = 'db.person.find({}, {}).limit(5).sort({"name": 1})';
    const [_, desc] = await processQuery(query);
    expect(desc).toBe(`db.person.find({}, {}).limit(5).sort({"name":1}).toArray()`);
  });
  test('should correctly handle find queries with multiple modifiers', async () => {
    const query = 'db.person.find({}, {}).sort({"name": 1}).limit(5)';
    const [_, desc] = await processQuery(query);
    expect(desc).toBe(`db.person.find({}, {}).limit(5).sort({"name":1}).toArray()`);
  });
  // test.only('should throw an error when collection name is missing', async () => {
  //   await expect(processQuery('db.find()')).rejects.toThrow('Missing collection name');
  // });
  test('should throw an error when "solution" collection is accessed without the correct find argument', async () => {
    const query = 'db.solution.find()'; // No arguments passed
    await expect(processQuery(query)).rejects.toThrow('Not allowed. This is a restricted collection');
  });
  test('should throw an error when solution check arguments are invalid', async () => {
    const query = 'db.solution.find({ "name": "" })'; // Invalid ID or missing suspect name
    await expect(processQuery(query)).rejects.toThrow('Missing suspect name');
  });
  test('should throw an error when trying to access a restricted collection', async () => {
    const query = 'db.solution.update({})'; // Access to a restricted collection in unsupported manner
    await expect(processQuery(query)).rejects.toThrow('Not allowed. This is a restricted collection');
  });
  test('should throw an error when a distinct field is missing in a distinct query', async () => {
    const query = 'db.collection.distinct()'; // No field name provided
    await expect(processQuery(query)).rejects.toThrow('Distinct field missing');
  });
  // not yet supported
  // test('should throw an error for invalid JSON in a count query filter', async () => {
  //   const query = 'db.collection.count({ invalid JSON })'; // Malformed JSON
  //   await expect(processQuery(query)).rejects.toThrow('Invalid count filter JSON');
  // });
  test('should throw an error when limit argument is not a number', async () => {
    const query = 'db.collection.find().limit("abc")'; // Non-numeric limit
    await expect(processQuery(query)).rejects.toThrow('Limit needs to be a number');
  });
  test('should throw an error when sort argument is invalid JSON', async () => {
    const query = 'db.collection.find().sort({ invalid JSON })'; // Malformed JSON
    await expect(processQuery(query)).rejects.toThrow('Invalid sort filter JSON');
  });
  test('should throw an error for unsupported queries', async () => {
    const query = 'db.unknownFunction("test")'; // Unsupported function
    await expect(processQuery(query)).rejects.toThrow('Missing collection name');
  });

  test('should throw an error for unsupported queries', async () => {
    const query = 'db["test"].update()'; // Unsupported function
    await expect(processQuery(query)).rejects.toThrow('Unsupported query');
  });

  test('should throw an error for invalid find arguments', async () => {
    const query = 'db.collection.find({ invalid })'; // Invalid JSON in find arguments
    await expect(processQuery(query)).rejects.toThrow("Error parsing filter: Expected property name or '}' in JSON at position 2 (line 1 column 3)");
  });
});


describe('validateQueryString', () => {
  test('should decode a valid query string', () => {
    const query = encodeURIComponent('valid query');
    expect(validateQueryString(query)).toBe('valid query');
  });
  test('should throw an error if query is missing', () => {
    expect(() => validateQueryString(null)).toThrow('Query is required');
    expect(() => validateQueryString({})).toThrow('Query is required');
  });
  test('should throw an error if query is too large', () => {
    const largeQuery = 'a'.repeat(1025); // 1025 characters
    expect(() => validateQueryString(largeQuery)).toThrow('Query too large');
  });
  test('should throw an error if query is empty or only whitespace', () => {
    const emptyQuery = encodeURIComponent('   ');
    expect(() => validateQueryString(emptyQuery)).toThrow('Bad input');
  });
  test('should throw an error if decoding fails', () => {
    const invalidQuery = '%E0%A4%A'; // Incomplete percent encoding
    expect(() => validateQueryString(invalidQuery)).toThrow('Bad input');
  });
});

describe('isGetCollections', () => {
  test('should return true for db.getCollectionNames()', () => {
    const query = 'db.getCollectionNames()';
    expect(isGetCollections(query)).toBe(true);
  });

  test('should return true for db.getCollectionNames();', () => {
    const query = 'db.getCollectionNames();';
    expect(isGetCollections(query)).toBe(true);
  });

  test('should return false for a query with extra characters', () => {
    const query = 'db.getCollectionNames(1)';
    expect(isGetCollections(query)).toBe(false);
  });

  test('should return false for a query without db.getCollectionNames()', () => {
    const query = 'db.someOtherFunction()';
    expect(isGetCollections(query)).toBe(false);
  });

  test('should return false for an empty string', () => {
    const query = '';
    expect(isGetCollections(query)).toBe(false);
  });

  test('should return false for undefined', () => {
    const query = undefined;
    expect(isGetCollections(query)).toBe(false);
  });
});

describe('hasCollectionName', () => {
  test('should return true for db.<collName>.', () => {
    const query = 'db.users.';
    expect(hasCollectionName(query)).toBe(true);
  });

  test('should return true for db["users"]', () => {
    const query = 'db["users"]';
    expect(hasCollectionName(query)).toBe(true);
  });

  test('should return true for db[\'users\']', () => {
    const query = "db['users']";
    expect(hasCollectionName(query)).toBe(true);
  });

  test('should return false for db.getCollectionNames()', () => {
    const query = 'db.getCollectionNames()';
    expect(hasCollectionName(query)).toBe(false);
  });

  test('should return false for a query without a collection name', () => {
    const query = 'db.someOtherFunction()';
    expect(hasCollectionName(query)).toBe(false);
  });

  test('should return false for an empty string', () => {
    const query = '';
    expect(hasCollectionName(query)).toBe(false);
  });

  test('should return false for undefined', () => {
    const query = undefined;
    expect(hasCollectionName(query)).toBe(false);
  });
});


describe('cleanCollectionName', () => {
  test('should clean collection name db.users.', () => {
    expect(cleanCollectionName('.users.')).toBe('users');
  });

  test('should clean collection name db["users"]', () => {
    const collectionName = '["users"]';
    expect(cleanCollectionName(collectionName)).toBe('users');
  });

  test('should clean collection name db[\'users\']', () => {
    const collectionName = "['users']";
    expect(cleanCollectionName(collectionName)).toBe('users');
  });

  test('should clean collection name db.myCollection.', () => {
    const collectionName = '.myCollection.';
    expect(cleanCollectionName(collectionName)).toBe('myCollection');
  });

  test('should clean collection name db["myCollection"]', () => {
    const collectionName = '["myCollection"]';
    expect(cleanCollectionName(collectionName)).toBe('myCollection');
  });

  test('should clean collection name db[\'myCollection\']', () => {
    const collectionName = "['myCollection']";
    expect(cleanCollectionName(collectionName)).toBe('myCollection');
  });

  test('should return collection name without change when no quotes or brackets', () => {
    const collectionName = 'users';
    expect(cleanCollectionName(collectionName)).toBe('users');
  });
});

describe('getCollectionName', () => {
  test('should return "users" for db.users.', () => {
    const query = 'db.users.';
    expect(getCollectionName(query)).toBe('users');
  });

  test('should return "users" for db["users"]', () => {
    const query = 'db["users"]';
    expect(getCollectionName(query)).toBe('users');
  });

  test('should return "users" for db[\'users\']', () => {
    const query = "db['users']";
    expect(getCollectionName(query)).toBe('users');
  });

  test('should return "myCollection" for db.myCollection.', () => {
    const query = 'db.myCollection.';
    expect(getCollectionName(query)).toBe('myCollection');
  });

  test('should return "myCollection" for db["myCollection"]', () => {
    const query = 'db["myCollection"]';
    expect(getCollectionName(query)).toBe('myCollection');
  });

  test('should return "myCollection" for db[\'myCollection\']', () => {
    const query = "db['myCollection']";
    expect(getCollectionName(query)).toBe('myCollection');
  });

  test('should return null for db.someOtherFunction()', () => {
    const query = 'db.someOtherFunction()';
    expect(getCollectionName(query)).toBeNull();
  });

  test('should return null for an empty string', () => {
    const query = '';
    expect(getCollectionName(query)).toBeNull();
  });

  test('should return null for undefined', () => {
    const query = undefined;
    expect(getCollectionName(query)).toBeNull();
  });
});


describe('parseStringField', () => {
  test('should return the string field when a valid string is present in double quotes', () => {
    const query = 'db.collection.distinct("fieldName")';
    expect(parseStringField(query)).toBe('fieldName');
  });

  test('should return the string field when a valid string is present in single quotes', () => {
    const query = "db.collection.distinct('fieldName')";
    expect(parseStringField(query)).toBe('fieldName');
  });

  test('should return null when no string field is present', () => {
    const query = 'db.collection.distinct()';
    expect(parseStringField(query)).toBeNull();
  });

  test('should return null for an empty string', () => {
    const query = '';
    expect(parseStringField(query)).toBeNull();
  });

  test('should return null for undefined input', () => {
    const query = undefined;
    expect(parseStringField(query)).toBeNull();
  });

  // test('should handle queries with additional arguments', () => {
  //   const query = 'db.collection.find({"key": "value"}, "fieldName")';
  //   expect(parseStringField(query)).toBe('fieldName');
  // });

  test('should return null for a malformed query', () => {
    const query = 'db.collection.distinct(fieldName)';
    expect(parseStringField(query)).toBeNull();
  });
});


describe('isSolutionCheck', () => {
  test('should return true for a valid JSON string matching the solution regex', () => {
    const query = '{"name": "solution1"}';
    expect(isSolutionCheck(query)).toBe(true);
  });

  test('should return false for a JSON string with an invalid structure', () => {
    const query = '{"name": 123}';
    expect(isSolutionCheck(query)).toBe(false);
  });

  test('should return false for a JSON string missing the "name" field', () => {
    const query = '{"id": "solution1"}';
    expect(isSolutionCheck(query)).toBe(false);
  });

  test('should return false for an empty string', () => {
    const query = '';
    expect(isSolutionCheck(query)).toBe(false);
  });

  test('should return false for undefined input', () => {
    const query = undefined;
    expect(isSolutionCheck(query)).toBe(false);
  });

  test('should return false for a malformed JSON string', () => {
    const query = '{name: "solution1"}';
    expect(isSolutionCheck(query)).toBe(false);
  });

  test('should return false for non-JSON strings', () => {
    const query = 'solution1';
    expect(isSolutionCheck(query)).toBe(false);
  });
});

describe('parseSolutionCheck', () => {
  test('should return the solution name for a valid JSON string matching the solution regex', () => {
    const query = '{"name": "solution1"}';
    expect(parseSolutionCheck(query)).toBe('solution1');
  });

  test('should return null for a JSON string with an invalid structure', () => {
    const query = '{"name": 123}';
    expect(parseSolutionCheck(query)).toBeNull();
  });

  test('should return null for a JSON string missing the "name" field', () => {
    const query = '{"id": "solution1"}';
    expect(parseSolutionCheck(query)).toBeNull();
  });

  test('should return null for an empty string', () => {
    const query = '';
    expect(parseSolutionCheck(query)).toBeNull();
  });

  test('should return null for undefined input', () => {
    const query = undefined;
    expect(parseSolutionCheck(query)).toBeNull();
  });

  test('should return null for a malformed JSON string', () => {
    const query = '{name: "solution1"}';
    expect(parseSolutionCheck(query)).toBeNull();
  });

  test('should return null for non-JSON strings', () => {
    const query = 'solution1';
    expect(parseSolutionCheck(query)).toBeNull();
  });
});


describe('isFindArgs', () => {
  test('should return true for valid find arguments (single argument)', () => {
    const query = '{"name": "value"}';
    expect(isFindArgs(query)).toBe(true);
  });

  test('should return true for valid find arguments (multiple arguments)', () => {
    const query = '{"name": "value"}, {"field": 1}';
    expect(isFindArgs(query)).toBe(true);
  });

  test('should return true for valid find arguments with whitespace', () => {
    const query = `
      {
        "name": "value"
      },
      {
        "field": 1
      }
    `;
    expect(isFindArgs(query)).toBe(true);
  });

  test('should return true for valid find arguments with no arguments', () => {
    const query = '';
    expect(isFindArgs(query)).toBe(true);
  });

  test('should return false for invalid find arguments (malformed JSON)', () => {
    const query = '{"name": "value", "field": 1';
    expect(isFindArgs(query)).toBe(false);
  });

  test('should return false for invalid find arguments (non-JSON string)', () => {
    const query = 'name: value';
    expect(isFindArgs(query)).toBe(false);
  });

  test('should return false for null input', () => {
    const query = null;
    expect(isFindArgs(query)).toBe(false);
  });

  test('should return false for undefined input', () => {
    const query = undefined;
    expect(isFindArgs(query)).toBe(false);
  });
});


describe('cleanRegexValues', () => {
  test('should return the input string unchanged for regexDoc_json format', () => {
    const input = '{"$regex": "pattern", "$options": "i"}';
    const output = cleanRegexValues(input);
    expect(output).toBe(input);
  });

  test('should transform regexDoc_hybrid format correctly', () => {
    const input = '{"$regex": /pattern/, "$options": "i"}';
    const expected = '{"$regex":"pattern","$options":"i"}';
    const output = cleanRegexValues(input);
    expect(output).toBe(expected);
  });

  test('should transform regexDoc_object format correctly', () => {
    const input = '{"field":{ "$regex": /pattern/i }}';
    const expected = JSON.stringify(JSON.parse('{"field": {"$regex":"pattern","$options":"i"}}'));
    const output = cleanRegexValues(input);
    expect(output).toBe(expected);
  });

  test('should transform regexVal_object format correctly', () => {
    const input = '{"field": /pattern/i}';
    const expected = '{"field": {"$regex":"pattern","$options":"i"}}';
    const output = cleanRegexValues(input);
    expect(output).toBe(expected);
  });


  // Not supported at this point
  // test('should handle multiple regex patterns correctly', () => {
  //   const input = '{"field1": /pattern1/i, "field2": /pattern2/m}';
  //   const expected = JSON.stringify(JSON.parse('{"field1": {"$regex":"pattern1","$options":"i"}, "field2":/pattern2/m }'));
  //   const output = cleanRegexValues(input);
  //   expect(output).toBe(expected);
  // });

  test('should handle input without any regex patterns', () => {
    const input = '{"field": "value"}';
    const output = cleanRegexValues(input);
    expect(output).toBe(input);
  });

  test('should handle malformed JSON strings gracefully', () => {
    const input = '{"field": /pattern/i';
    const output = cleanRegexValues(input);
    expect(output).toBe(input); // No transformation should occur
  });

  test('should handle empty input string', () => {
    const input = '';
    const output = cleanRegexValues(input);
    expect(output).toBe(input);
  });

  test('should handle null input', () => {
    const input = null;
    const output = cleanRegexValues(input);
    expect(output).toBe(null);
  });

  test('should handle undefined input', () => {
    const input = undefined;
    const output = cleanRegexValues(input);
    expect(output).toBe(undefined);
  });

  test('should handle input with no matching regex formats', () => {
    const input = '{"field": "non-regex-value"}';
    const output = cleanRegexValues(input);
    expect(output).toBe(input);
  });
});


describe('parseFindArgs', () => {
  test('should parse valid find arguments with filter', () => {
    const query = '{"name": "value"}';
    const expectedFilter = { "name": "value" };
    const expectedProjection = {};
    const [filter, projection] = parseFindArgs(query);
    expect(filter).toEqual(expectedFilter);
    expect(projection).toEqual(expectedProjection);
  });

  test('should parse valid find arguments with filter and projection', () => {
    const query = '{"name": "value"}, {"field": 1}';
    const expectedFilter = { "name": "value" };
    const expectedProjection = { "field": 1 };
    const [filter, projection] = parseFindArgs(query);
    expect(filter).toEqual(expectedFilter);
    expect(projection).toEqual(expectedProjection);
  });

  test('should parse valid find arguments with empty input', () => {
    const query = '';
    const expectedFilter = {};
    const expectedProjection = {};
    const [filter, projection] = parseFindArgs(query);
    expect(filter).toEqual(expectedFilter);
    expect(projection).toEqual(expectedProjection);
  });

  test('should parse find arguments with regex patterns', () => {
    const query = '{"name": { "$regex": "pattern", "$options": "i" }}';
    const expectedFilter = { name: { $regex: 'pattern', $options: 'i' } };
    const expectedProjection = {};
    const [filter, projection] = parseFindArgs(query);
    expect(filter).toEqual(expectedFilter);
    expect(projection).toEqual(expectedProjection);
  });

  test('should throw an error for invalid JSON in filter', () => {
    const query = '{"name": "value",';
    expect(() => parseFindArgs(query)).toThrow('Invalid input format');
  });

  test('should throw an error for invalid JSON in projection', () => {
    const query = '{"name": "value"}, {"field":';
    expect(() => parseFindArgs(query)).toThrow('Invalid input format');
  });

  test('should throw an error for invalid input format', () => {
    const query = 'invalid input';
    expect(() => parseFindArgs(query)).toThrow('Invalid input format');
  });

  test('should handle valid input with whitespace and newlines', () => {
    const query = `
      {
        "name": "value"
      },
      {
        "field": 1
      }
    `;
    const expectedFilter = JSON.parse('{ "name": "value" }');
    const expectedProjection = JSON.parse('{ "field": 1 }');
    const [filter, projection] = parseFindArgs(query);
    expect(filter).toEqual(expectedFilter);
    expect(projection).toEqual(expectedProjection);
  });

  test('should handle filter with no projection', () => {
    const query = '{"age": { "$gte": 18 }}';
    const expectedFilter = { age: { $gte: 18 } };
    const expectedProjection = {};
    const [filter, projection] = parseFindArgs(query);
    expect(filter).toEqual(expectedFilter);
    expect(projection).toEqual(expectedProjection);
  });

  test('should handle projection with no filter', () => {
    const query = '{}, {"field": 1}';
    const expectedFilter = {};
    const expectedProjection = { "field": 1 };
    const [filter, projection] = parseFindArgs(query);
    expect(filter).toEqual(expectedFilter);
    expect(projection).toEqual(expectedProjection);
  });
});



describe("quoteJsonKeys", () => {

  // Jest Tests for `matchField.operator`

  test("should quote unquoted $-prefixed field names in flat JSON", () => {
    const input = '{ $regex: "[a-z]+", $options: "i", normalField: 123 }';
    const expected = '{ "$regex": "[a-z]+", "$options": "i", normalField: 123 }';
    expect(quoteJsonKeys(input, matchField.operator)).toBe(expected);
  });
  test("should handle nested JSON with unquoted $-prefixed fields", () => {
    const input = '{ $regex: "[a-z]+", nested: { $options: "i", otherField: 42 } }';
    const expected = '{ "$regex": "[a-z]+", nested: { "$options": "i", otherField: 42 } }';
    expect(quoteJsonKeys(input, matchField.operator)).toBe(expected);
  });
  test("should not modify already quoted $-prefixed field names", () => {
    const input = '{ "$regex": "[a-z]+", "$options": "i", normalField: 123 }';
    const expected = '{ "$regex": "[a-z]+", "$options": "i", normalField: 123 }';
    expect(quoteJsonKeys(input, matchField.operator)).toBe(expected);
  });
  test("should handle JSON with no $-prefixed fields", () => {
    const input = '{ normalField: 123, anotherField: true, nested: { field: "value" } }';
    const expected = '{ normalField: 123, anotherField: true, nested: { field: "value" } }';
    expect(quoteJsonKeys(input, matchField.operator)).toBe(expected);
  });
  test("should handle JSON with one unquoted $-prefixed field", () => {
    const input = '{ $field: "value" }';
    const expected = '{ "$field": "value" }';
    expect(quoteJsonKeys(input, matchField.operator)).toBe(expected);
  });
  test("should handle empty JSON string", () => {
    const input = '{}';
    const expected = '{}';
    expect(quoteJsonKeys(input, matchField.operator)).toBe(expected);
  });


  test("should handle malformed JSON gracefully without crashing", () => {
    const input = '{ $field: "value", $badKey :';
    const expected = '{ "$field": "value", "$badKey":'; // Still surrounds what it finds
    expect(quoteJsonKeys(input, matchField.operator)).toBe(expected);
  });

  test("should handle JSON with whitespace around field names", () => {
    const input = '{    $regex    : "[a-z]+",  $options:    "i"  }';
    const expected = '{    "$regex": "[a-z]+",  "$options":    "i"  }';
    expect(quoteJsonKeys(input, matchField.operator)).toBe(expected);
  });

  // not yet supported
  // test("should handle JSON with $-prefixed fields and special characters", () => {
  //   const input = '{ $field_name$: "value", normalField: 123 }';
  //   const expected = '{ "$field_name$": "value", normalField: 123 }';
  //   expect(quoteJsonKeys(input)).toBe(expected);
  // });

  test("should not quote non-$ fields", () => {
    const input = '{ field: "value", anotherField: 123 }';
    const expected = '{ field: "value", anotherField: 123 }';
    expect(quoteJsonKeys(input)).toBe(expected);
  });
  test("should handle JSON with extraneous spaces", () => {
    const input = '  {    $key   :   "value"     }   ';
    const expected = '  {    "$key":   "value"     }   ';
    expect(quoteJsonKeys(input, matchField.operator)).toBe(expected);
  });
  test("should handle $field with numeric values", () => {
    const input = '{ $key: 42 }';
    const expected = '{ "$key": 42 }';
    expect(quoteJsonKeys(input, matchField.operator)).toBe(expected);
  });
  test("should handle complex nested $-prefixed fields", () => {
    const input = `{
            $outer: {
                $inner: {
                    $deep: "value"
                },
                regularField: true
            },
            $anotherOuter: "value"
        }`;
    const expected = `{
            "$outer": {
                "$inner": {
                    "$deep": "value"
                },
                regularField: true
            },
            "$anotherOuter": "value"
        }`;
    expect(quoteJsonKeys(input, matchField.operator)).toBe(expected);
  });



  // Jest Tests for `matchField.name`
  test("should quote unquoted field names starting with letters or underscores", () => {
    const input = '{ _fieldName: "value", anotherField: 123 }';
    const expected = '{ "_fieldName": "value", "anotherField": 123 }';
    expect(quoteJsonKeys(input, matchField.name)).toBe(expected);
  });
  test("should not modify already quoted field names", () => {
    const input = '{ "_fieldName": "value", "anotherField": 123 }';
    const expected = '{ "_fieldName": "value", "anotherField": 123 }';
    expect(quoteJsonKeys(input, matchField.name)).toBe(expected);
  });
  test("should handle nested JSON with unquoted field names", () => {
    const input = '{ _outer: { _inner: "value", regularField: true } }';
    const expected = '{ "_outer": { "_inner": "value", "regularField": true } }';
    expect(quoteJsonKeys(input, matchField.name)).toBe(expected);
  });
  test("should quote multiple unquoted field names", () => {
    const input = '{ _field: 1, anotherField: true, nestedField: { innerField: "text" } }';
    const expected = '{ "_field": 1, "anotherField": true, "nestedField": { "innerField": "text" } }';
    expect(quoteJsonKeys(input, matchField.name)).toBe(expected);
  });
  test("should handle JSON with extraneous spaces and unquoted field names", () => {
    const input = '{    _key   :   "value"     ,    another  :  42    }';
    const expected = '{    "_key":   "value"     ,    "another":  42    }';
    expect(quoteJsonKeys(input, matchField.name)).toBe(expected);
  });
  test("should handle JSON with numeric values", () => {
    const input = '{ firstField: 42, _secondField: 1000 }';
    const expected = '{ "firstField": 42, "_secondField": 1000 }';
    expect(quoteJsonKeys(input, matchField.name)).toBe(expected);
  });
  test("should handle an empty JSON string", () => {
    const input = '{}';
    const expected = '{}';
    expect(quoteJsonKeys(input, matchField.name)).toBe(expected);
  });
  test("should handle malformed JSON gracefully without crashing", () => {
    const input = '{ validField: "value", _another :';
    const expected = '{ "validField": "value", "_another":';
    expect(quoteJsonKeys(input, matchField.name)).toBe(expected);
  });
  test("should handle complex nested unquoted field names", () => {
    const input = `{
          _outer: {
              innerField: {
                  deepestField: "value"
              },
              regularField: true
          },
          anotherOuter: "value"
      }`;
    const expected = `{
          "_outer": {
              "innerField": {
                  "deepestField": "value"
              },
              "regularField": true
          },
          "anotherOuter": "value"
      }`;
    expect(quoteJsonKeys(input, matchField.name)).toBe(expected);
  });
  test("should not modify numeric or boolean values", () => {
    const input = '{ _booleanField: true, _numberField: 12345 }';
    const expected = '{ "_booleanField": true, "_numberField": 12345 }';
    expect(quoteJsonKeys(input, matchField.name)).toBe(expected);
  });
  test("should handle unquoted field names containing dots", () => {
    const input = '{ outer.inner.field: "value", anotherField: 42 }';
    const expected = '{ "outer.inner.field": "value", "anotherField": 42 }';
    expect(quoteJsonKeys(input, matchField.name)).toBe(expected);
  });
  test("should not quote $-prefixed fields when using matchField.name", () => {
    const input = '{ $operatorField: "value", _otherField: 123 }';
    const expected = '{ $operatorField: "value", "_otherField": 123 }';
    expect(quoteJsonKeys(input, matchField.name)).toBe(expected);
  });
  test("should handle JSON with whitespace around keys", () => {
    const input = '{    regularField  :    "value" ,    _otherField  : true }';
    const expected = '{    "regularField":    "value" ,    "_otherField": true }';
    expect(quoteJsonKeys(input, matchField.name)).toBe(expected);
  });
});