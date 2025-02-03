const express = require('express');
const cors = require('cors');
const helpers = require('./helpers');
const app = express();
const allowedOrigins = [
  process.env.ALLOWED_ORIGIN,
  'https://mongomurdermystery.com',
  'https://mongodbmurdermystery.com'
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
  methods: ['GET'], // Only allow GET requests
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

module.exports = {
  app
};