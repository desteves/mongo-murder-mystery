const { isGetCollections,
  hasCollectionName,
  getCollectionName,
  cleanCollectionName,
  parseStringField,
  isSolutionCheck,
  parseSolutionCheck,
  isFindArgs,
  cleanRegexValues,
  parseFindArgs,
  quoteJsonKeys } = require('./helpers');

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
  test("should quote unquoted $-prefixed field names in flat JSON", () => {
    const input = '{ $regex: "[a-z]+", $options: "i", normalField: 123 }';
    const expected = '{ "$regex": "[a-z]+", "$options": "i", normalField: 123 }';
    expect(quoteJsonKeys(input)).toBe(expected);
  });
  test("should handle nested JSON with unquoted $-prefixed fields", () => {
    const input = '{ $regex: "[a-z]+", nested: { $options: "i", otherField: 42 } }';
    const expected = '{ "$regex": "[a-z]+", nested: { "$options": "i", otherField: 42 } }';
    expect(quoteJsonKeys(input)).toBe(expected);
  });
  test("should not modify already quoted $-prefixed field names", () => {
    const input = '{ "$regex": "[a-z]+", "$options": "i", normalField: 123 }';
    const expected = '{ "$regex": "[a-z]+", "$options": "i", normalField: 123 }';
    expect(quoteJsonKeys(input)).toBe(expected);
  });
  test("should handle JSON with no $-prefixed fields", () => {
    const input = '{ normalField: 123, anotherField: true, nested: { field: "value" } }';
    const expected = '{ normalField: 123, anotherField: true, nested: { field: "value" } }';
    expect(quoteJsonKeys(input)).toBe(expected);
  });
  test("should handle JSON with one unquoted $-prefixed field", () => {
    const input = '{ $field: "value" }';
    const expected = '{ "$field": "value" }';
    expect(quoteJsonKeys(input)).toBe(expected);
  });
  test("should handle empty JSON string", () => {
    const input = '{}';
    const expected = '{}';
    expect(quoteJsonKeys(input)).toBe(expected);
  });


  test("should handle malformed JSON gracefully without crashing", () => {
    const input = '{ $field: "value", $badKey :';
    const expected = '{ "$field": "value", "$badKey":'; // Still surrounds what it finds
    expect(quoteJsonKeys(input)).toBe(expected);
  });

  test("should handle JSON with whitespace around field names", () => {
    const input = '{    $regex    : "[a-z]+",  $options:    "i"  }';
    const expected = '{    "$regex": "[a-z]+",  "$options":    "i"  }';
    expect(quoteJsonKeys(input)).toBe(expected);
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
    expect(quoteJsonKeys(input)).toBe(expected);
  });
  test("should handle $field with numeric values", () => {
    const input = '{ $key: 42 }';
    const expected = '{ "$key": 42 }';
    expect(quoteJsonKeys(input)).toBe(expected);
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
    expect(quoteJsonKeys(input)).toBe(expected);
  });
});