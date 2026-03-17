const { app } = require('./server');
const connectDB = require('./database');
const logger = require('./logger');
const { validateEnv, getConfig } = require('./config');

// Validate environment variables before starting
try {
  validateEnv();
} catch (error) {
  logger.error({ error: error.message }, 'Environment validation failed');
  process.exit(1);
}

const config = getConfig();
const PORT = config.port;

connectDB().then(() => {
  app.listen(PORT, () => logger.info({ port: PORT }, 'Server is running'));
}).catch((error) => {
  logger.error({ error: error.message }, 'Failed to connect to database');
  process.exit(1);
});
