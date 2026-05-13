const { MongoClient } = require('mongodb');
const logger = require('./logger');
const { getConfig } = require('./config');

let client = null;
let db = null;

const INITIAL_RETRY_DELAY_MS = 100;
const MAX_RETRIES = parseInt(process.env.MONGODB_MAX_RETRIES || '5', 10);

/**
 * Connect to MongoDB AI database with exponential backoff retry
 */
async function connectAIDB() {
  if (client && db) {
    return { client, db };
  }

  const config = getConfig();
  const uri = config.agent.mongodbUriAI;
  const dbName = config.agent.dbNameAI;

  if (!uri) {
    throw new Error('MONGODB_URI_AI is not configured');
  }

  async function attemptConnection(retryCount = 0) {
    try {
      logger.info({ attempt: retryCount + 1, maxRetries: MAX_RETRIES, database: dbName }, 'Connecting to MongoDB AI database...');

      client = new MongoClient(uri, {
        appName: 'devrel-github-mmm',
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 20000
      });

      await client.connect();
      db = client.db(dbName);

      logger.info({ database: dbName }, 'Connected to MongoDB AI database');
      return { client, db };
    } catch (err) {
      if (retryCount < MAX_RETRIES) {
        const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
        logger.warn(
          { attempt: retryCount + 1, maxRetries: MAX_RETRIES, delayMs, error: err.message },
          'MongoDB AI connection failed, retrying...'
        );
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return attemptConnection(retryCount + 1);
      }

      logger.error({ error: err.message, maxRetries: MAX_RETRIES }, 'MongoDB AI connection failed after retries');
      throw new Error(`MongoDB AI connection failed after ${MAX_RETRIES} retries: ${err.message}`);
    }
  }

  return attemptConnection();
}

/**
 * Close the MongoDB AI connection
 */
async function closeAIDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    logger.info('MongoDB AI connection closed');
  }
}

module.exports = connectAIDB;
module.exports.closeAIDB = closeAIDB;
