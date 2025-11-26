const express = require('express');
const compression = require('compression');
const cors = require('cors');
const helpers = require('./helpers');
const { runAgent } = require('./agent');
const rateLimit = require('express-rate-limit');
const app = express();

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
app.get('/eval', async (req, res) => {

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
    console.log("Ran query:", desc);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.code || 500).json({ err: `${error.message || "Internal Server Error"}` });
  }
});

// // // Rate limit all endpoint
// const rateLimit = rateLimit({
//   windowMs: 60 * 1000,
//   max: 20,
//   handler: (_req, res) => {
//     res.status(429).json({ err: 'Too many requests. Please slow down and retry in a minute.' });
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// // Apply to all routes
// app.use(rateLimit);

const requiredAgentEnvs = ['OPENAI_API_KEY', 'MDB_MCP_CONNECTION_STRING', 'MCP_SERVER_URL'];
const getMissingAgentEnvs = () => requiredAgentEnvs.filter((key) => !process.env[key]);
const MAX_PROMPT_LENGTH = 512;

app.post('/agent', /*agentLimiter,*/ async (req, res) => {
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
      console.error('Agent envs missing:', missing.join(', '));
      return res.status(503).json({ err: `Agent unavailable. Missing envs: ${missing.join(', ')}` });
    }

    const { reply } = await runAgent(prompt.trim());
    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Agent error:', error);
    return res.status(500).json({ err: error.message || 'Agent failed' });
  }
});

module.exports = {
  app
};
