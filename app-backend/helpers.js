
const connectDB = require('./database'); // Import your database connection module
const { ObjectId } = require('mongodb');


// Global regexes for MongoDB query patterns
const regexes = {
  getCollections: /^db\.getCollectionNames\(\);?$/, // e.g., db.getCollectionNames()
  collName: /^db(\.\w+\.|\['\w+'\]|\["\w+"\])/, // e.g., db.<collName>.
  stringField: /['"]([^'"]+)['"]/, //  e.g., db.collection.distinct("<field>")
  noArgs: /^$/,
  findArgs: /^\s*(\{\s*[\s\S]*?\s*\})\s*(?:,\s*(\{\s*[\s\S]*?\s*\}))?\s*$/m,
  sol: /^\s*{\s*"name"\s*:\s*"(.*?)"\s*\}\s*$/m,
};

// const PORT = 8080;
const SALT = process.env.SALT || ''; // Salt for solution check


const readCommand = {
  COLLECTION: "db",
  FIND: "find(",
  LIMIT: ".limit(",
  SORT: ".sort(",
  COUNT: ".count(",
  DISTINCT: ".distinct(",
};


// Function to validate and decode the query string
function validateQueryString(query) {
  if (!query || typeof query !== "string" || query === null) {
    throw new Error("Query is required");
  } else if (query.length > 1024) {
    throw new Error("Query too large");
  }

  try {
    const decodedQuery = decodeURIComponent(query);
    if (!decodedQuery.trim()) {
      throw new Error("Query is empty or whitespace");
    }
    return decodedQuery;
  } catch (error) {
    throw new Error(`Bad input.`);

  }
}

// Check if query is db.getCollectionNames()
function isGetCollections(Q) {
  return regexes.getCollections.test(Q);
}


function hasCollectionName(Q) {
  return regexes.collName.test(Q);
}

function getCollectionName(Q) {
  if (hasCollectionName(Q)) {
    const match = Q.match(regexes.collName);
    return cleanCollectionName(match[1]);
  } else
    return null;
}

function cleanCollectionName(collectionName) {

  if (!collectionName) return null;

  if (collectionName.startsWith('[')) {
    collectionName = collectionName.slice(2, -2).replace(/^['"]|['"]$/g, '');
  } else if (collectionName.startsWith('.')) {
    collectionName = collectionName.slice(1, -1); // remove the dots
  }
  // console.log('cleanCollectionName: ', collectionName);
  return collectionName;

}

function parseStringField(Q) {
  if (!regexes.stringField.test(Q)) {
    return null;
  } else {

    const match = Q.match(regexes.stringField);
    return match[1];
  }
}

function isSolutionCheck(Q) {
  return regexes.sol.test(Q);
}

function parseSolutionCheck(Q) {
  if (isSolutionCheck(Q)) {
    const match = Q.match(regexes.sol);
    return match[1];
  } else {
    return null;
  }
}

function isFindArgs(Q) {
  return regexes.noArgs.test(Q) || regexes.findArgs.test(Q);
}


// Quote unquoted JSON keys, only those that are MongoDB Operators, starting with $
function quoteJsonKeys(jsonString) {
  // Regex to match fields starting with $ that are not quoted
  const regex = /(?<=\{|\s)(\$[a-zA-Z_][a-zA-Z0-9_]*)\s*:/g;
  // Replace unquoted field names with quoted ones
  const fixedJsonString = jsonString.replace(regex, '"$1":');
  return fixedJsonString;
}


function cleanRegexValues(inputString) {


  // Check for the various possible formats, modify each transformation accordingly
  // https://www.mongodb.com/docs/manual/reference/operator/query/regex/#syntax

  // regexDoc_json   { "$regex": "pattern", "$options": "<imxsu>" }
  // regexDoc_hybrid { "$regex": /pattern/, "$options":"<imxsu>" }
  // regexDoc_object { "$regex": /pattern/<imxsu> }
  // regexVal_object /pattern/<imxsu>
  const formats = {
    regexDoc_json: /\{\s*(?:"\$regex")\s*:\s*"[^"]*"\s*(?:,\s*(?:"\$options")\s*:\s*"([imxsu]{0,5})?")?\s*\}/,
    regexDoc_hybrid: /\{\s*(?:"\$regex")\s*:\s*\/(.*?)\/\s*(?:,\s*(?:"\$options")\s*:\s*"([imxsu]{0,5})?")?\s*\}/,
    regexDoc_object: /\{\s*(?:"\$regex")\s*:\s*\/(.*?)\/([imxsu]{0,5})?\s*\}/,
    regexVal_object: /\/(.*?)\/([imxsu]{0,5})?/
  };

  let regexPattern;

  if (formats.regexDoc_json.test(inputString)) {
    // console.log('cleanRegexValues: Found regexDoc_json, skipping transformation');
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
    // console.log('cleanRegexValues: No regex pattern found');
    return inputString;
  }

  // Will only transform one kind of regex pattern, even if such appears multiple times in the input string.
  const transformedString = inputString.replace(regexPattern, (match, pattern, flags) => {
    // console.log('regex pattern found: ', match);
    const regexObj = { $regex: pattern };
    if (flags) {
      regexObj.$options = flags;
    }
    return JSON.stringify(regexObj); // Convert regex object to JSON string
  });

  // console.log('transformedString:', transformedString);

  // checking for valid JSON

  try {
    JSON.parse(transformedString);
  } catch (error) {
    console.log('cleanRegexValues: Invalid JSON after transformation');
    console.log('cleanRegexValues: Error message: ', error.message);
    console.log('cleanRegexValues: Returning original input');
    return inputString;

  }
  return transformedString;

}

function parseFindArgs(Q) {
  // check empty args
  if (regexes.noArgs.test(Q)) {
    // console.log('parseFindArgs: No args found');
    return [{}, {}];
  }

  const match = Q.match(regexes.findArgs);
  if (!match) throw new Error("Invalid input format");

  let filter = {};
  let projection = {};

  // console.log('match is ', match);

  try {
    if (match[1] && match[1] !== '{}') {
      filter = JSON.parse(cleanRegexValues(quoteJsonKeys(match[1])));
    } else {
      // console.log('parseFindArgs: Empty filter');
    }
  } catch (error) {
    throw new Error(`Error parsing filter: ${error.message}`);
  }

  try {
    if (match[2] && match[2] !== '{}') {
      projection = JSON.parse(match[2]);
    } else {
      // console.log('parseFindArgs: Empty projection');
    }
  } catch (error) {
    throw new Error(`Error parsing projection: ${error.message}`);
  }

  return [filter, projection];
}


async function parseComplexQuery(Q) {

  // this could 500'd if the connection fails but eval does 400
  const db = await connectDB();
  let queryDescription = '';
  let query = null;
  let type = '';

  if (isGetCollections(Q)) {
    query = db.listCollections().toArray();
    queryDescription = 'db.listCollections().toArray()';
    type = "getCollections";
    return [query, queryDescription, type];
  }

  // parse complex query
  if (!hasCollectionName(Q)) {
    throw new Error("Missing collection name.");
  }

  const coll = getCollectionName(Q);

  query = db.collection(coll);
  queryDescription = `db.collection('${coll}')`;

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
      const args = Q.substring(start, end).trim();

      if (isSolutionCheck(args)) {
        const suspect = parseSolutionCheck(args);
        if (!suspect) {
          throw new Error("Missing suspect name.");
        }
        query = db.collection('solution').updateOne({ "_id": suspect + SALT }, { $inc: { "count": 1 } });
        queryDescription = `db.collection('solution').updateOne({ "_id": "${suspect}" }, { $inc: { "count": 1 } })`;
        type = "solutionCheck";
        return [query, queryDescription, type];

      } else {
        throw new Error("Not allowed. This is a restricted collection.");
      }
    } else {
      throw new Error("Not allowed. This is a restricted collection.");
    }
  }

  // is a distinct query
  if (distinctStart !== -1) {

    const start = distinctStart + readCommand.DISTINCT.length;
    const end = Q.indexOf(')', start);
    const field = parseStringField(Q.substring(start, end));

    query = query.distinct(field);
    queryDescription = `db.collection('${coll}').distinct('${field}')`;
    type = "distinct";

    return [query, queryDescription, type];
  }


  // has a count, process it
  if (countStart !== -1) {
    const start = countStart + readCommand.COUNT.length;
    const end = Q.indexOf(')', start);
    const filter = Q.substring(start, end).trim(); // debating on supporting this....

    if (filter.length > 0) {
      try {
        query = query.count(JSON.parse(filter));
        queryDescription = `db.collection('${coll}').count(${filter})`;
      } catch (error) {
        throw new Error("Invalid count filter JSON");
      }
    } else { // just do a count
      query = query.count();
      queryDescription = `db.collection('${coll}').count()`;
    }

    if (findStart === -1) {
      type = "count";
      return [query, queryDescription, type];
    }
  }

  // process the find args.
  if (findStart !== -1) {
    const start = findStart + readCommand.FIND.length;
    const end = Q.indexOf(')', start);
    const args = Q.substring(start, end).trim();

    if (isFindArgs(args)) { // okay to be missing / empty
      const [filter, projection] = parseFindArgs(args);
      query = query.find(filter, { projection });
      queryDescription = `db.collection('${coll}').find(${filter}, ${projection})`;


      // has a limit, process it
      if (limitStart !== -1) {
        const start = limitStart + readCommand.LIMIT.length;
        const end = Q.indexOf(')', start);

        let limit = 30;
        limit = parseInt(Q.substring(start, end));
        if (isNaN(limit)) {
          throw new Error("Limit needs to be a number");
        }
        if (limit < 1 || limit > 30) {
          limit = 30;
        }
        query = query.limit(limit);
        queryDescription = `${queryDescription}.limit(${limit})`;
      } // end limit

      // has a sort, process it
      if (sortStart !== -1) {
        const start = sortStart + readCommand.SORT.length;
        const end = Q.indexOf(')', start);
        const filter = Q.substring(start, end).trim();

        try {
          query = query.sort(JSON.parse(filter));
          queryDescription = `${queryDescription}.sort(${filter})`;
        } catch (error) {
          throw new Error("Invalid sort filter JSON");
        }
      } // end sort

      // not a count query and no limit specified, add it
      if (limitStart === -1 && countStart === -1) {
        console.log('No limit specified for non-count query. Setting limit to 30.');
        query = query.limit(30);
        queryDescription = `${queryDescription}.limit(30)`;
      }

      // not a count query, exhaust the cursor
      if (countStart === -1) {
        query = query.toArray();
        queryDescription = `${queryDescription}.toArray()`;
      }

      if (coll === 'crime') {
        return [query, queryDescription, "findCrimeClueCheck"];
      } else if (coll === 'person') {
        return [query, queryDescription, "findPersonClueCheck"];
      } else {
        return [query, queryDescription, "find"];
      }

    } else {
      throw new Error("Invalid find arguments.");
    }
  } // end find
  throw new Error("Unsupported query.");
}

// Export all at once
module.exports = {
  validateQueryString,
  isGetCollections,
  hasCollectionName,
  getCollectionName,
  cleanCollectionName,
  parseStringField,
  isSolutionCheck,
  parseSolutionCheck,
  isFindArgs,
  cleanRegexValues,
  parseFindArgs,
  quoteJsonKeys,
  parseComplexQuery
};