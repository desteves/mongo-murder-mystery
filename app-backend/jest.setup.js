// jest.setup.js
require('dotenv').config();

// Mock environment variables for testing
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mmm-test';
process.env.INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'test-api-key-12345';
process.env.SALT = process.env.SALT || 'test-salt';
process.env.CLUE_CRIME = '5f9f1b9f1b9f1b9f1b9f1b9f'; // Sample ObjectId string
process.env.CLUE_WITNESS1 = 'WOOF WOOF';
process.env.CLUE_WITNESS2 = 'MEOW MEOW';
process.env.CLUE_SUSPECT = 'QUACK QUACK';
