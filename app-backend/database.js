const { MongoClient } = require('mongodb');

let db = null;

const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mydatabase';
const dbName = 'mmm';

const connectDB = async () => {
  if (db) {
    console.log('Reusing existing MongoDB connection');
    return db;
  }

  try {
    const client = await MongoClient.connect(dbURI);
    db = client.db(dbName);
    console.log('Connected to MongoDB');
    return db;
  } catch (error) {
    console.error('Could not connect to MongoDB:', error);
    throw error;
  }
};

module.exports = connectDB;
