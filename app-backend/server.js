const express = require('express');
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
  'https://mongodbmurdermystery.com',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000',
];

app.use(express.json());
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

// Rate limit the agent endpoint to reduce abuse
const agentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  handler: (_req, res) => {
    res.status(429).json({ err: 'Too many requests. Please slow down and retry in a minute.' });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/agent', agentLimiter, async (req, res) => {
  try {
    const prompt = req.body?.prompt;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ err: 'Missing prompt' });
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
