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
  addQuotesToWords } = require('./helpers');

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
  test('should return true for db.<collName>', () => {
    const query = 'db.users';
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
