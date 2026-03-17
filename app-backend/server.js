const express = require('express');
const compression = require('compression');
const cors = require('cors');
const helpers = require('./helpers');
const { runAgent } = require('./agent');
const rateLimit = require('express-rate-limit');
const connectDB = require('./database');
const logger = require('./logger');
const pinoHttp = require('pino-http');
const app = express();

// Add request logging middleware (skip health checks)
app.use(pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => req.url === '/health' || req.url === '/readiness'
  }
}));

// Request timeout middleware
const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10); // 30 seconds default

app.use((req, res, next) => {
  // Set timeout for the request
  req.setTimeout(REQUEST_TIMEOUT_MS, () => {
    req.log.warn({ url: req.url, timeout: REQUEST_TIMEOUT_MS }, 'Request timeout');
    if (!res.headersSent) {
      res.status(408).json({ err: 'Request timeout' });
    }
  });

  // Set timeout for the response
  res.setTimeout(REQUEST_TIMEOUT_MS, () => {
    req.log.warn({ url: req.url, timeout: REQUEST_TIMEOUT_MS }, 'Response timeout');
    if (!res.headersSent) {
      res.status(503).json({ err: 'Service timeout' });
    }
  });

  next();
});

// Trust the first proxy (e.g., Cloud Run/NGINX) so rate limiting can read X-Forwarded-For correctly.
app.set('trust proxy', 1);
const allowedOrigins = [
  process.env.ALLOWED_ORIGIN,
  'https://mongomurdermystery.com',
  'https://mongodbmurdermystery.com'
];

function requireApiKey(req, res, next) {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    return res.status(400).json({ error: "Missing API key" });
  }

  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  next();
}

// Health check endpoints (no API key required)
app.get('/health', async (req, res) => {
  try {
    const db = await connectDB();
    await db.admin().ping();
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/readiness', async (req, res) => {
  const missing = getMissingAgentEnvs();
  if (missing.length) {
    return res.status(503).json({
      ready: false,
      missing,
      timestamp: new Date().toISOString()
    });
  }
  res.status(200).json({
    ready: true,
    timestamp: new Date().toISOString()
  });
});

app.use(requireApiKey);
app.use(express.json({ limit: '64kb' }));
app.use(compression());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true); // Allow request
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'], // Allow GET and POST
}));

// Generic endpoint to evaluate MongoDB queries from the browser
app.get('/eval', evalLimiter, async (req, res) => {

  let queryTerm; // valid query string
  let result = null; // result from executing the query

  try {

    if (!req.query || !req.query.query) {
      return res.status(400).json({ err: 'Missing query term: query' });
    }
    queryTerm = helpers.validateQueryString(req.query.query);
  } catch (error) {
    return res.status(400).json({ err: `Cannot validate ${error.message}` });
  }

  try {
    [result, desc] = await helpers.processQuery(queryTerm);
    req.log.info({ query: desc }, "Query executed successfully");
    return res.status(200).json(result);
  } catch (error) {
    req.log.error({ error: error.message, code: error.code }, "Query execution failed");
    return res.status(error.code || 500).json({ err: `${error.message || "Internal Server Error"}` });
  }
});

// Rate limiting for query endpoint
const evalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ err: 'Too many requests. Please slow down and retry in a minute.' });
  },
});

// Rate limiting for agent endpoint (more restrictive)
const agentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ err: 'Too many agent requests. Please slow down and retry in a minute.' });
  },
});

const requiredAgentEnvs = ['OPENAI_API_KEY', 'MDB_MCP_CONNECTION_STRING', 'MCP_SERVER_URL'];
const getMissingAgentEnvs = () => requiredAgentEnvs.filter((key) => !process.env[key]);
const MAX_PROMPT_LENGTH = 512;

app.post('/agent', agentLimiter, async (req, res) => {
  try {
    const prompt = req.body?.prompt;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ err: 'Missing prompt' });
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return res.status(400).json({ err: `Prompt too long (max ${MAX_PROMPT_LENGTH} characters).` });
    }

    const missing = getMissingAgentEnvs();
    if (missing.length) {
      req.log.error({ missing }, 'Agent envs missing');
      return res.status(503).json({ err: `Agent unavailable. Missing envs: ${missing.join(', ')}` });
    }

    const { reply } = await runAgent(prompt.trim());
    req.log.info({ promptLength: prompt.length }, 'Agent request completed');
    return res.status(200).json({ reply });
  } catch (error) {
    req.log.error({ error: error.message }, 'Agent error');
    return res.status(500).json({ err: error.message || 'Agent failed' });
  }
});

// Global error handler - must be last middleware
app.use((err, req, res, next) => {
  // Log the error
  req.log.error({ error: err.message, stack: err.stack }, 'Unhandled error');

  // Handle APIError instances
  if (err.name === 'APIError' && err.code) {
    return res.status(err.code).json({ err: err.message });
  }

  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ err: 'CORS policy violation' });
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ err: 'Invalid JSON in request body' });
  }

  // Default to 500 for unknown errors
  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  return res.status(statusCode).json({ err: message });
});

module.exports = {
  app
};
