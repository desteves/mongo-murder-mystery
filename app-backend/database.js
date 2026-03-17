const { MongoClient, ServerApiVersion } = require('mongodb');
const logger = require('./logger');

let client = null;
let db = null;
let isConnecting = false;

const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mmm';
const dbName = process.env.MONGODB_DBNAME || 'mmm';

const connectDB = async () => {
  // Check if already connected and healthy
  if (db && client) {
    try {
      await client.db('admin').command({ ping: 1 });
      return db;
    } catch (err) {
      logger.warn('Connection lost, reconnecting...');
      client = null;
      db = null;
    }
  }

  // Wait if another connection attempt is in progress
  if (isConnecting) {
    await new Promise(resolve => setTimeout(resolve, 100));
    return connectDB();
  }

  isConnecting = true;
  try {
    logger.info('Connecting to MongoDB...');
    const mongoClient = new MongoClient(dbURI, {
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL || '20', 10),
      minPoolSize: parseInt(process.env.MONGODB_MIN_POOL || '2', 10),
      serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || '5000', 10),
      socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT_MS || '20000', 10),
      serverApi: ServerApiVersion.v1
    });

    client = await mongoClient.connect();
    db = client.db(dbName);
    logger.info({ database: dbName }, 'Connected to MongoDB');
    isConnecting = false;
    return db;
  } catch (err) {
    isConnecting = false;
    logger.error({ error: err.message }, 'Failed to connect to MongoDB');
    throw err;
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing MongoDB connection...');
  if (client) {
    await client.close();
    logger.info('MongoDB connection closed');
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing MongoDB connection...');
  if (client) {
    await client.close();
    logger.info('MongoDB connection closed');
  }
  process.exit(0);
});

module.exports = connectDB;
