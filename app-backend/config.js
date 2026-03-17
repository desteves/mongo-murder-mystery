const logger = require('./logger');

// Required environment variables for the application to function
const requiredEnvVars = [
  'MONGODB_URI',
  'INTERNAL_API_KEY',
  'SALT',
  'CLUE_CRIME'
];

// Optional but recommended environment variables
const recommendedEnvVars = [
  'ALLOWED_ORIGIN',
  'MONGODB_DBNAME',
  'LOG_LEVEL'
];

// Agent-specific environment variables (only required if using /agent endpoint)
const agentEnvVars = [
  'OPENAI_API_KEY',
  'MDB_MCP_CONNECTION_STRING',
  'MCP_SERVER_URL'
];

/**
 * Validates that all required environment variables are set
 * @throws {Error} If any required environment variables are missing
 */
function validateEnv() {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    const errorMsg = `Missing required environment variables: ${missing.join(', ')}`;
    logger.error({ missing }, errorMsg);
    throw new Error(errorMsg);
  }

  // Check recommended variables
  const missingRecommended = recommendedEnvVars.filter(key => !process.env[key]);
  if (missingRecommended.length > 0) {
    logger.warn({ missingRecommended }, 'Missing recommended environment variables');
  }

  // Check agent variables
  const missingAgent = agentEnvVars.filter(key => !process.env[key]);
  if (missingAgent.length > 0) {
    logger.warn({ missingAgent }, 'Agent endpoint will be unavailable - missing environment variables');
  }

  logger.info('Environment validation passed');
}

/**
 * Get configuration object with validated values
 */
function getConfig() {
  return {
    port: parseInt(process.env.PORT || '8080', 10),
    mongodb: {
      uri: process.env.MONGODB_URI,
      dbName: process.env.MONGODB_DBNAME || 'mmm',
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL || '20', 10),
      minPoolSize: parseInt(process.env.MONGODB_MIN_POOL || '2', 10),
      serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || '5000', 10),
      socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT_MS || '20000', 10)
    },
    security: {
      internalApiKey: process.env.INTERNAL_API_KEY,
      allowedOrigins: [
        process.env.ALLOWED_ORIGIN,
        'https://mongomurdermystery.com',
        'https://mongodbmurdermystery.com'
      ].filter(Boolean)
    },
    mystery: {
      salt: process.env.SALT,
      clueCrime: process.env.CLUE_CRIME,
      clueWitness1: process.env.CLUE_WITNESS1,
      clueWitness2: process.env.CLUE_WITNESS2,
      clueSuspect: process.env.CLUE_SUSPECT
    },
    agent: {
      enabled: agentEnvVars.every(key => process.env[key]),
      openaiApiKey: process.env.OPENAI_API_KEY,
      mcpConnectionString: process.env.MDB_MCP_CONNECTION_STRING,
      mcpServerUrl: process.env.MCP_SERVER_URL,
      openaiModel: process.env.OPENAI_MODEL || 'tngtech/deepseek-r1t2-chimera:free'
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info'
    }
  };
}

module.exports = {
  validateEnv,
  getConfig
};

