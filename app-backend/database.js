const { MongoClient, ServerApiVersion } = require('mongodb');

let client = null;
let db = null;

const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mmm';
const dbName = process.env.MONGODB_DBNAME || 'mmm';

const connectDB = async () => {
  if (db && client) {
    return db;
  }

  const mongoClient = new MongoClient(dbURI, {
    maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL || '20', 10),
    minPoolSize: parseInt(process.env.MONGODB_MIN_POOL || '2', 10),
    serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || '5000', 10),
    socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT_MS || '20000', 10),
    serverApi: ServerApiVersion.v1
  });

  client = await mongoClient.connect();
  db = client.db(dbName);
  return db;
};

module.exports = connectDB;
