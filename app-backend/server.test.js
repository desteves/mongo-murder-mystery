const request = require('supertest'); // Import Supertest
const { app } = require('./server.js'); // Adjust the path as necessary
const helpers = require('./helpers');


describe('Dummy test suite', () => {
  test('should pass the dummy test', () => {
    expect(1 + 1).toBe(2); // This will always pass
  });
});


// describe('GET /eval', () => {


//   const testCases = [
//     {
//       queryParam: '',
//       expectedStatus: 400,
//       expectedBody: undefined,
//       // expectedBody: { err: 'Query parameter is required' }
//     },
//     // Add more test scenarios as needed
//   ];


// testCases.forEach(({ queryParam, expectedStatus, expectedBody }) => {
//   test(`should return ${expectedStatus} for ${queryParam}}`, async () => {
//     // Make the request
//     const response = await request(app).get('/eval').query(queryParam);
//     // Assert the response status
//     expect(response.statusCode).toBe(expectedStatus);
//     // Assert the response body (if applicable)
//     if (expectedBody !== undefined) {
//       expect(response.body).toEqual(expectedBody);
//     }
//   });
// });
// });
