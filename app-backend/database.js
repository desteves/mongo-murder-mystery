const { MongoClient, ServerApiVersion } = require('mongodb');
const logger = require('./logger');

let client = null;
let db = null;
let isConnecting = false;
let connectionPromise = null;

const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mmm';
const dbName = process.env.MONGODB_DBNAME || 'mmm';
const MAX_RETRIES = parseInt(process.env.MONGODB_MAX_RETRIES || '5', 10);
const INITIAL_RETRY_DELAY_MS = 100;

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

  // If another connection attempt is in progress, wait for it
  if (isConnecting && connectionPromise) {
    return connectionPromise;
  }

  isConnecting = true;
  connectionPromise = attemptConnection();

  try {
    const result = await connectionPromise;
    return result;
  } finally {
    isConnecting = false;
    connectionPromise = null;
  }
};

async function attemptConnection(retryCount = 0) {
  try {
    logger.info({ attempt: retryCount + 1, maxRetries: MAX_RETRIES }, 'Connecting to MongoDB...');
    const mongoClient = new MongoClient(dbURI, {
      appName: 'devrel-github-mmm',
      // Serverless profile: one shared client, pool sized to Cloud Run per-instance concurrency, no idle
      // connections held by scaled-to-zero instances, fail fast.
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL || '10', 10),
      minPoolSize: parseInt(process.env.MONGODB_MIN_POOL || '0', 10),
      maxIdleTimeMS: parseInt(process.env.MONGODB_MAX_IDLE_TIME_MS || '30000', 10),
      connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT_MS || '10000', 10),
      serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || '5000', 10),
      socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT_MS || '20000', 10),
      compressors: ['zlib'], // built into Node; zstd/snappy need optional native packages
      retryReads: true,
      retryWrites: true,
      serverApi: ServerApiVersion.v1
    });

    client = await mongoClient.connect();
    db = client.db(dbName);
    logger.info({ database: dbName }, 'Connected to MongoDB');
    return db;
  } catch (err) {
    if (retryCount < MAX_RETRIES) {
      // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms
      const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
      logger.warn({
        error: err.message,
        retryCount: retryCount + 1,
        maxRetries: MAX_RETRIES,
        delayMs
      }, 'MongoDB connection failed, retrying...');

      await new Promise(resolve => setTimeout(resolve, delayMs));
      return attemptConnection(retryCount + 1);
    }

    logger.error({
      error: err.message,
      retriesExhausted: MAX_RETRIES
    }, 'Failed to connect to MongoDB after max retries');
    throw new Error(`MongoDB connection failed after ${MAX_RETRIES} retries: ${err.message}`);
  }
}

// Closes the shared client; index.js calls this after the HTTP server has drained (SIGTERM/SIGINT).
const closeDB = async () => {
  if (client) {
    await client.close();
    client = null;
    db = null;
    logger.info('MongoDB connection closed');
  }
};

module.exports = connectDB;
module.exports.closeDB = closeDB;
