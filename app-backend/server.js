// require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb'); // Import ObjectId

const app = express();
app.use(express.json());

const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://mongomurdermystery.com';


app.use(cors({
  origin: allowedOrigin, // Allow requests from this origin
  methods: ['GET'], // Only allow GET requests
}));

const PORT = 8080;
const SALT = process.env.SALT || ''; // Salt for solution check
const CLUE_CRIME = new ObjectId(process.env.CLUE_CRIME) || 'missing';
const CLUE_WITNESS1 = process.env.CLUE_WITNESS1 || 'missing';
const CLUE_WITNESS2 = process.env.CLUE_WITNESS2 || 'missing';
const CLUE_SUSPECT = process.env.CLUE_SUSPECT || 'missing';

// Connect to MongoDB
const dbName = 'mmm';
let db;

// MongoDB connection
MongoClient.connect(process.env.MONGODB_URI)
  .then(client => {
    db = client.db(dbName);
    console.log('Connected to MongoDB Atlas');
  })
  .catch(error => console.error('Could not connect to MongoDB Atlas:', error));

// Global regexes for MongoDB query patterns
const regexes = {
  getCollections: /^db\.getCollectionNames\(\);?$/, // e.g., db.getCollectionNames()
  collName: /^db(\.\w+|\['\w+'\]|\["\w+"\])/, // e.g., db.<collName>
  stringField: /['"]([^'"]+)['"]/, //  e.g., db.collection.distinct("<field>")
  findArgs: /^(\{[\s\S]*?\s*\})?\s*(,\s*(\{[\s\S]*?\s\}))?\s*\)?$/m,
  sol: /^\{\s*"name"\s*:\s*"(.*?)"\s*\}$/m,
};

const readCommand = {
  COLLECTION: "db",
  FIND: "find(",
  LIMIT: ".limit(",
  SORT: ".sort(",
  COUNT: ".count(",
  DISTINCT: ".distinct(",
};

const group = {
  COLLNAME: 1,
  FILTER: 2,
  PROJ: 4,
  LIMIT_OR_SORT: 5,
  LIMIT: 6
};

// Function to validate and decode the query string
function validateQueryString(req, res) {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ err: "Query parameter is required" });
    }

    if (query.length > 1024) {
      return res.status(400).json({ err: "Query string too large" });
    }

    const decodedQuery = decodeURIComponent(query);

    if (!decodedQuery.trim()) {
      return res.status(400).json({ err: "Query string is empty or whitespace." });
    }

    return decodedQuery;
  } catch (error) {
    return res.status(400).json({ err: `Error decoding query string: ${error.message}` });
  }
}

// Regex matchers and parser functions for each query type

// Check if query is db.getCollectionNames()
function isGetCollections(Q) {
  return regexes.getCollections.test(Q);
}


function hasCollectionName(Q) {
  return regexes.collName.test(Q);
}

function getCollectionName(Q) {
  const match = Q.match(regexes.collName);
  return cleanCollectionName(match[group.COLLNAME]);
}

function cleanCollectionName(collectionName) {
  if (collectionName.startsWith('[')) {
    collectionName = collectionName.slice(2, -2).replace(/^['"]|['"]$/g, '');
  } else if (collectionName.startsWith('.')) {
    collectionName = collectionName.slice(1);
  }
  // console.log('cleanCollectionName: ', collectionName);
  return collectionName;
}

function parseStringField(Q) {
  const match = Q.match(regexes.stringField);
  return match[1];
}

function isSolutionCheck(Q) {
  return regexes.sol.test(Q);
}

function parseSolutionCheck(Q) {
  const match = Q.match(regexes.sol);
  return match[1];
}

function isFindArgs(Q) {
  return regexes.findArgs.test(Q);
}


// TODO - test this function
function cleanRegexValues(inputString) {

  // Check for the various possible formats, modify each transformation accordingly
  // https://www.mongodb.com/docs/manual/reference/operator/query/regex/#syntax
  const formats = {

    // { "$regex": "pattern", "$options": "<imxsu>" }
    regexDoc_json: /^\{\s*"\$regex":\s*"[^"]*"(?:,\s*"\$options":\s*"[imxsu]*")?\s*\}$/,

    // { "$regex": /pattern/, "$options":"<imxsu>" }
    regexDoc_hybrid: /^\{\s*"\$regex":\s*\/(.*?)\/(?:,\s*"\$options":\s*"([imxsu]*)")?\s*\}$/,

    // { "$regex": /pattern/<imxsu> }
    regexDoc_object: /"\$regex":\s*\/(.*?)\/([imxsu])*/,

    // /pattern/<imxsu>
    regexVal_object: /\/(.*?)\/([imxsu]*)/
  };

  let regexPattern;

  if (formats.regexDoc_json.test(inputString)) {
    console.log('cleanRegexValues: Found regexDoc_json, skipping transformation');
    return inputString;
  } else if (formats.regexDoc_hybrid.test(inputString)) {

    // FROM
    // { "<field>": { "$regex": /pattern/, "$options":"<options>" } }
    // TO
    // { "<field>": { "$regex": "pattern", "$options": "<options>" } }
    regexPattern = formats.regexDoc_hybrid;

  } else if (formats.regexDoc_object.test(inputString)) {

    // FROM
    // { "<field>": { "$regex": /pattern/<options> } }
    // TO
    // { "<field>": { "$regex": "pattern", "$options": "<options>" } }
    regexPattern = formats.regexDoc_object;

  } else if (formats.regexVal_object.test(inputString)) {

    // FROM
    // { "<field>":  /pattern/<options> }
    // TO
    // { "<field>": { "$regex": "pattern", "$options": "<options>" } }
    regexPattern = formats.regexVal_object;

  } else {
    console.log('cleanRegexValues: No regex pattern found');
    return inputString;
  }

  // Will only transform one kind of regex pattern, even if such appears multiple times in the input string.
  const transformedString = inputString.replace(regexPattern, (match, pattern, flags) => {
    console.log('regex pattern found: ', match);
    const regexObj = { $regex: pattern };
    if (flags) {
      regexObj.$options = flags;
    }
    return JSON.stringify(regexObj); // Convert regex object to JSON string
  });

  console.log('transformedString:', transformedString);
  return transformedString;

}

function parseFindArgs(Q) {
  const match = Q.match(regexes.findArgs);
  if (!match) throw new Error("Invalid input format");

  let filter = {};
  let projection = {};

  try {
    filter = match[1] ? JSON.parse(cleanRegexValues(match[1])) : {};
  } catch (error) {
    throw new Error(`Error parsing filter: ${error.message}`);
  }

  try {
    projection = match[3] ? JSON.parse(match[3]) : {};
  } catch (error) {
    throw new Error(`Error parsing projection: ${error.message}`);
  }

  return [filter, projection];
}


function addQuotesToWords(input) {
  console.log('addQuotesToWords feature is under construction, as-is for now.');
  return input;


  // Regex to tokenize the string:
  // Matches content enclosed in double quotes, /slashes/, or standalone words/numbers
  const tokens = input.match(/"[^"]*"|\/[^\/]*\/|\S+/g);


  // Process each token
  const processedTokens = tokens.map((token) => {
    // Check if token is enclosed in double quotes
    const isQuoted = token.startsWith('"') && token.endsWith('"');

    // Check if token starts with a slash and contains another slash
    const isSlashWrapped = token.startsWith('/') && token.slice(1).includes('/');

    // If token is already wrapped (either in quotes or slashes), leave it unchanged
    if (isQuoted || isSlashWrapped) {
      return token;
    }

    // If the token is purely numerical, leave it as is
    if (/^\d+$/.test(token)) {
      return token;
    }

    // If the token is not quoted, and is non-numerical, wrap it in quotes
    return `"${token}"`;
  });
  // Combine tokens back into a single string
  return processedTokens.join(' ');
}

// Generic endpoint to evaluate MongoDB queries from the frontend
app.get('/eval', async (req, res) => {
  const queryStr = validateQueryString(req, res);
  if (!queryStr) return;

  const Q = queryStr.trim();
  console.log('Evaluating query:', Q);

  let result = null

  try {
    // Evaluate query type and execute corresponding operation
    if (isGetCollections(Q)) {
      console.log('Get collections query');
      result = await db.listCollections().toArray();
      result = result.map(item => item.name);
      result = result.filter(coll => coll !== 'solution');
      return res.json(result);


    } else { // parse complex query

      if (!hasCollectionName(Q)) {
        return res.status(400).json({ err: "Missing collection name." })
      }
      const coll = getCollectionName(Q);

      // Start assembling the query in segments
      let query = db.collection(coll);

      // Locate segments
      const distinctStart = Q.indexOf(readCommand.DISTINCT);
      const limitStart = Q.indexOf(readCommand.LIMIT);
      const countStart = Q.indexOf(readCommand.COUNT);
      const sortStart = Q.indexOf(readCommand.SORT);
      const findStart = Q.indexOf(readCommand.FIND);


      if (coll === 'solution') {

        if (findStart !== -1) {
          const start = findStart + readCommand.FIND.length;
          const end = Q.indexOf(')', start);
          const args = addQuotesToWords(Q.substring(start, end).trim());
          console.log("solution args is ", args);

          if (isSolutionCheck(args)) {
            const suspect = parseSolutionCheck(args);

            if (!suspect) {
              console.error("Missing suspect name.")
              return res.status(400).json({ err: "Missing suspect name." });
            }
            console.log("suspect is ", suspect);

            try {


              result = await db.collection('solution').updateOne({ "_id": suspect + SALT }, { $inc: { "count": 1 } });
              console.log("solution result is ", result);
              if (result.modifiedCount === 1) {
                return res.status(200).json({ verdict: 'YOU DID IT! YOU SOLVED THE MONGODB MURDER MYSTERY!!!' });
              }
              else {
                return res.status(200).json({ verdict: "OH NO YOU HAVE ACCUSED THE WRONG PERSON. YIKES." });
              }
            } catch (error) {
              console.error('Internal error with solution query: ', error.message);
              result = { err: 'Internal error with solution query' };
              return res.status(500).json(result);
            }
          } else {
            console.error("Solution query not allowed.")
            return res.status(400).json({ err: "Not allowed. This is a restricted collection." });
          }
        } else {

          console.error("Solution query not allowed.")
          return res.status(400).json({ err: "Not allowed. This is a restricted collection." });
        }
      }

      // is a distinct query
      if (distinctStart !== -1) {

        const start = distinctStart + readCommand.DISTINCT.length;
        const end = Q.indexOf(')', start);
        const field = parseStringField(Q.substring(start, end));

        console.log("distinct field is ", field)

        try {
          result = await query.distinct(field);
          console.log("distinct value(s) are ", result)
          return res.status(200).json(result);
        } catch (error) {
          console.error('Internal error with distinct query: ', error.message);
          result = { err: 'Internal error with distinct query' };
          return res.status(500).json(result);
        }

      }


      // has a count, process it
      if (countStart !== -1) {
        const start = countStart + readCommand.COUNT.length;
        const end = Q.indexOf(')', start);
        const filter = Q.substring(start, end).trim(); // debating on supporting this....
        console.log("count filter is ", filter);
        if (filter.length > 0) {
          try {
            query = query.count(JSON.parse(filter));
          } catch (error) {
            console.error('Illegal count filter:', error.message);
            return res.status(400).json({ err: "Invalid filter JSON." });
          }
        } else { // just do a count
          console.log("counting all");
          query = query.count();
        }

        if (findStart === -1) {
          console.log('No find, executing count query.');
          try {
            result = await query;
            console.log("count result is ", result);
            return res.json(result);
          } catch (error) {
            console.error('Internal error with count query: ', error.message);
            result = { err: 'Internal error with count query' };
            return res.status(500).json(result);
          }
        }
      }

      // process the find args.
      if (findStart !== -1) {
        const start = findStart + readCommand.FIND.length;
        const end = Q.indexOf(')', start);
        const args = Q.substring(start, end).trim();
        // console.log("args is ", args);

        if (isFindArgs(args)) { // okay to be missing / empty


          // Usage
          try {
            const [filter, projection] = parseFindArgs(args);
            console.log('Filter is :', filter);
            console.log('Projection is:', projection);
            query = query.find(filter, { projection });

          } catch (error) {
            console.error('Error in parseFindArgs:', error.message);
            return res.status(400).json({ err: "Invalid format -- " + error.message });
          }

          // has a limit, process it
          if (limitStart !== -1) {
            const start = limitStart + readCommand.LIMIT.length;
            const end = Q.indexOf(')', start);

            let limit = 30;
            try {
              limit = parseInt(Q.substring(start, end));
              if (isNaN(limit)) {
                result = { err: 'Limit needs to be a number' };
                return res.status(400).json(result);
              }
              console.log("user-provided limit is ", limit);
            } catch (error) {
              console.error('Internal error with limit: ', error.message);
              result = { err: 'Internal error with limit' };
              return res.status(500).json(result);

            }
            if (limit < 1 || limit > 30) {
              limit = 30;
              // console.log('Limit must be between 1 and 30. Updating to 30.');
            }
            query = query.limit(limit);
            console.log("Set limit to ", limit);
          } // end limit

          // has a sort, process it
          if (sortStart !== -1) {
            const start = sortStart + readCommand.SORT.length;
            const end = Q.indexOf(')', start);
            const filter = Q.substring(start, end).trim();
            console.log("Sort is ", filter);

            try {
              query = query.sort(JSON.parse(filter));
            } catch (error) {
              console.error('Illegal sort filter:', error.message);
              return res.status(400).json({ err: "Invalid sort JSON." });
            }
          } // end sort

          // not a count query and no limit specified, add it
          if (limitStart === -1 && countStart === -1) {
            console.log('No limit specified for non-count query. Setting limit to 30.');
            query = query.limit(30);
          }

          // not a count query, exhaust the cursor
          if (countStart === -1) {
            query = query.toArray();
          }

          try {
            result = await query;

            console.log("find result matched ", result.length);

            if (result.length === 1) {
              // Clues for murder found
              if (coll === 'crime' && result[0]?._id.equals(CLUE_CRIME)) {
                result[0].isClue = true;
                console.log('Clue found for CRIME');

              } else if (coll === 'person') {
                // Clues for witnesses, suspect or mastermind found
                if (result[0]?.name &&
                  (result[0].name === CLUE_WITNESS1 ||
                    result[0].name === CLUE_WITNESS2 ||
                    result[0].name === CLUE_SUSPECT
                  )) {
                  // Perform your action here
                  result[0].isClue = 1;
                  console.log('Clue found for PERSON');
                }
              }
              // console.log("single result is ", result[0]);
            }

            return res.status(200).json(result);

          } catch (error) {
            console.error('Internal error with find query: ', error.message);
            result = { err: 'Internal error with find query' };
            return res.status(500).json(result);
          }

        } else {
          console.error('Invalid find arguments.');
          return res.status(400).json({ err: "Invalid find arguments." });
        }
      } // end find


      console.log('Unsupported query type');
      return res.status(400).json({ err: 'Unsupported query' });
    }

  } catch (error) {
    console.error('Error evaluating query:', error);
    result = { err: 'Error evaluating query' };
    return res.status(500).json(result);
  }

});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
