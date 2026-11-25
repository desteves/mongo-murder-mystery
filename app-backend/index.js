// Load environment variables from .env file
require('dotenv').config();

const { app } = require('./server');
const connectDB = require('./database');
const { closeDB } = connectDB;
const { closeAIDB } = require('./database-ai');
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

let server;

// Cloud Run sends SIGTERM and allows ~10 s: stop accepting requests, let in-flight ones finish, then close DBs.
let shuttingDown = false;
const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Shutting down: draining requests');
  const force = setTimeout(() => {
    logger.warn('Drain timeout, forcing exit');
    process.exit(1);
  }, 8000);
  force.unref();
  const done = async () => {
    try { await closeAIDB(); } catch (err) { logger.warn({ error: err.message }, 'AI DB close failed'); }
    try { await closeDB(); } catch (err) { logger.warn({ error: err.message }, 'DB close failed'); }
    process.exit(0);
  };
  if (server) server.close(done); else done();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

connectDB().then(() => {
  server = app.listen(PORT, () => logger.info({ port: PORT }, 'Server is running'));
}).catch((error) => {
  logger.error({ error: error.message }, 'Failed to connect to database');
  process.exit(1);
});
