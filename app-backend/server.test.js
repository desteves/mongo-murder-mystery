const request = require('supertest'); // Import Supertest
const { app } = require('./server.js'); // Adjust the path as necessary
const helpers = require('./helpers');
const { ObjectId } = require('mongodb');


// Define the ObjectId based on the mocked environment variable
const CLUE_CRIME = new ObjectId(process.env.CLUE_CRIME);


describe('GET /eval', () => {

  // beforeEach(() => {
  //   jest.clearAllMocks();
  // });

  // Define your test cases
  const testCases = [
    // Test case: Invalid query causing validateQueryString to throw error
    {
      queryParam: 'foo=bar',  // Represents an invalid query string
      expectedStatus: 400,
      expectedBody: { err: expect.stringContaining('Query is required') }, // Assuming this is part of the error message
    },
    // Test case: Query causes parsing error in helpers.parseComplexQuery
    // {
    //   queryParam: 'invalidMongoQuery={ x: "}" }',  // An intentionally malformed query
    //   expectedStatus: 400,
    //   expectedBody: { err: expect.stringContaining('Parsing error') }, // Assuming this is part of the error message
    // },
    // // Test case: Execution of query leads to an error
    // {
    //   queryParam: 'mongoQueryWithExecutionFail={ find: "nonexistent" }',  // Query expected to fail
    //   expectedStatus: 500,
    //   expectedBody: { err: expect.stringContaining('Execution error') }, // Assuming this is part of the error message
    // },
    // // Test case: getCollections path
    // {
    //   queryParam: 'mongoGetCollectionsQuery={ listCollections: 1 }',
    //   expectedStatus: 200,
    //   expectedBody: ['collection1', 'collection2'], // Assuming 'solution' collection is filtered out
    // },
    // // Test case: solutionCheck path leading to success
    // {
    //   queryParam: 'query={ update: "cases", updates: [{ q: {}, u: {}, multi: false }] }',
    //   expectedStatus: 200,
    //   expectedBody: { verdict: '' }, // Assuming this is the expected response
    //   }
  ];;


  testCases.forEach(({ queryParam, expectedStatus, expectedBody }) => {
    test(`should return ${expectedStatus} for ${queryParam}}`, async () => {
      // Make the request
      const response = await request(app).get('/eval').query(queryParam);
      // Assert the response status
      expect(response.statusCode).toBe(expectedStatus);
      // Assert the response body (if applicable)
      if (expectedBody !== undefined) {
        expect(response.body).toEqual(expectedBody);
      }
    });
  });
});
