// require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helpers = require('./helpers');
const app = express();
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://mongomurdermystery.com';

app.use(express.json());
app.use(cors({
  origin: allowedOrigin, // Allow requests from this origin
  methods: ['GET'], // Only allow GET requests
}));

// Generic endpoint to evaluate MongoDB queries from the browser
app.get('/eval', async (req, res) => {

  let Q; // decoded query string
  try {
    Q = validateQueryString(req.query);
  } catch (error) {
    return res.status(400).json({ err: `${error.message}` });
  }

  // Evaluate query type and execute corresponding operation
  let result = null
  let type = '';
  try {
    query, type = helpers.parseComplexQuery(Q);
  } catch (error) {
    return res.status(400).json({ err: `${error.message}` });
  }
  try {
    result = await query;
    switch (type) {
      case "getCollections":
        result = result.map(item => item.name);
        result = result.filter(coll => coll !== 'solution');
        break;
      case "solutionCheck":
        if (result.modifiedCount === 1) {
          result = { verdict: 'YOU DID IT! YOU SOLVED THE MONGODB MURDER MYSTERY!!!' };
        } else {
          result = { verdict: "OH NO YOU HAVE ACCUSED THE WRONG PERSON. YIKES." };
        }
        break;
      case "findCrimeClueCheck":
        if (result.length === 1 && result[0]?._id.equals(CLUE_CRIME)) {
          result[0].isClue = true;

        }
        break;
      case "findPersonClueCheck":
        if (result.length === 1) {
          // Clues for witnesses, suspect or mastermind found
          if (result[0]?.name &&
            (result[0].name === CLUE_WITNESS1 ||
              result[0].name === CLUE_WITNESS2 ||
              result[0].name === CLUE_SUSPECT
            )) {
            result[0].isClue = 1;
          }
        }
        break;
    }
  } catch (error) {
    return res.status(500).json({ err: `${error.message}` });
  }
  return res.status(200).json(result);
});

// Export all at once
module.exports = {
  app // for testing
};