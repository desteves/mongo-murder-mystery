// require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./database'); // Import your database connection module
const helpers = require('./helpers');


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

const readCommand = {
  COLLECTION: "db",
  FIND: "find(",
  LIMIT: ".limit(",
  SORT: ".sort(",
  COUNT: ".count(",
  DISTINCT: ".distinct(",
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
// Generic endpoint to evaluate MongoDB queries from the frontend
app.get('/eval', async (req, res) => {

  const queryStr = validateQueryString(req, res);
  if (!queryStr) return;


  let result = null

  try {

    const db = await connectDB();
    // Evaluate query type and execute corresponding operation
    if (helpers.isGetCollections(Q)) {
      console.log('Get collections query');
      result = await db.listCollections().toArray();
      result = result.map(item => item.name);
      result = result.filter(coll => coll !== 'solution');
      return res.json(result);


    } else { // parse complex query

      if (!helpers.hasCollectionName(Q)) {
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
            const suspect = helpers.parseSolutionCheck(args);

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
