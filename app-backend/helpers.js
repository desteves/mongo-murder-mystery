
const connectDB = require('./database'); // Import your database connection module
const { ObjectId } = require('mongodb');

class APIError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'APIError';
    this.code = code; // HTTP Status Code
  }
}

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

// operator Regex to match fields starting with $ that are not quoted
// name Regex to match field names that are not quoted.
const matchField =
{

  operator: /(?<=\{|\s)(\$[a-zA-Z_][a-zA-Z0-9_]*)\s*:/g,
  name: /(?<=\{|\s)([a-zA-Z_][\w.]*)\s*:/g

};

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
function quoteJsonKeys(jsonString, regex) {
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

      const quotedOperators = quoteJsonKeys(match[1], matchField.operator);
      const cleanedRegex = cleanRegexValues(quotedOperators);
      const quotedFields = quoteJsonKeys(cleanedRegex, matchField.name);

      filter = JSON.parse(quotedFields);
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




async function processQuery(Q) {

  let db = null;
  let desc = ''; // for jests

  try {
    db = await connectDB();
  } catch (error) {
    throw new APIError("Database connection failed", 500);
  }


  if (isGetCollections(Q)) {
    try {
      desc = 'db.listCollections().toArray()';
      result = await db.listCollections().toArray().map(item => item.name).filter(coll => coll !== 'solution');
      return [result, desc];
    } catch (error) {
      throw new APIError("Cannot list collections", 500);
    }
  } else if (!hasCollectionName(Q)) {
    throw new APIError("Missing collection name", 400);
  }


  const coll = getCollectionName(Q);

  // Locate segments
  const distinctStart = Q.indexOf(readCommand.DISTINCT);
  const limitStart = Q.indexOf(readCommand.LIMIT);
  const countStart = Q.indexOf(readCommand.COUNT);
  const sortStart = Q.indexOf(readCommand.SORT);
  const findStart = Q.indexOf(readCommand.FIND);

  if (coll === 'solution') {

    if (findStart === -1) {
      throw new APIError("Not allowed. This is a restricted collection", 400);
    }
    const start = findStart + readCommand.FIND.length;
    const end = Q.indexOf(')', start);
    const args = Q.substring(start, end).trim();

    if (!isSolutionCheck(args)) {
      throw new APIError("Not allowed. This is a restricted collection", 400);
    }

    const suspect = parseSolutionCheck(args);

    if (!suspect) {
      throw new APIError("Missing suspect name", 400);
    }

    try {
      desc = `db.solution.find({ "name": "${suspect}" })`;
      result = await db.collection('solution').updateOne({ "_id": suspect + SALT }, { $inc: { "count": 1 } });
      if (result.modifiedCount === 1) {
        result = { verdict: 'YOU DID IT! YOU SOLVED THE MONGODB MURDER MYSTERY!!!' };
      } else {
        result = { verdict: "OH NO YOU HAVE ACCUSED THE WRONG PERSON. YIKES." };
      }
      return [result, desc];
    } catch (error) {
      throw new APIError("Cannot check suspect", 500);
    }


  }

  // is a distinct query
  if (distinctStart !== -1) {

    const start = distinctStart + readCommand.DISTINCT.length;
    const end = Q.indexOf(')', start);
    const field = parseStringField(Q.substring(start, end));

    if (!field || field.length === 0) {
      throw new Error("Distinct field missing");
    }

    try {
      desc = `db.${coll}.distinct('${field}')`;
      result = await db.collection(coll).distinct(field);
      return [result, desc];
    } catch (error) {
      throw new Error("Cannot run distinct query");
    }
  }

  // just a count query, process it (no find)
  if (countStart !== -1 && findStart === -1) {

    // debating on supporting this....not at this moment
    // const start = countStart + readCommand.COUNT.length;
    // const end = Q.indexOf(')', start);
    // let filter = Q.substring(start, end).trim();

    // if (filter.length > 0) {
    //   try {
    //     filter = JSON.parse(filter);
    //   } catch (error) {
    //     throw new APIError("Invalid count filter JSON", 400);
    //   }
    // } else {
    //   filter = None;
    // }

    try {
      desc = `db.${coll}.count()`;
      result = await db.collection(coll).count();
      return [result, desc];
    } catch (error) {
      throw new APIError("Cannot run count query", 500);
    }
  }

  // process the find query.
  if (findStart !== -1) {
    const start = findStart + readCommand.FIND.length;
    const end = Q.indexOf(')', start);
    const args = Q.substring(start, end).trim();

    if (!isFindArgs(args)) { // okay to be missing / empty
      throw new APIError("Invalid find arguments", 400);
    }

    const [filter, projection] = parseFindArgs(args);
    const addLimit = (limitStart !== -1);
    const addSort = (sortStart !== -1);
    const addCount = (countStart !== -1);

    let limitFilter = 30;
    let sortFilter = { "_id": 1 };
    // let countFilter = {}; // not supported

    if (addCount) {

      try {
        desc = `db.${coll}.find(${JSON.stringify(filter)}, ${JSON.stringify(projection)}).count()`;
        result = await db.collection(coll).find(filter, projection).count();
        return [result, desc];
      }
      catch (error) {
        throw new APIError("Cannot run find-count query", 500);
      }
    } // end count


    // has a limit, process it
    if (addLimit) {
      const start = limitStart + readCommand.LIMIT.length;
      const end = Q.indexOf(')', start);

      limit = parseInt(Q.substring(start, end));
      if (isNaN(limit)) {
        throw new APIError("Limit needs to be a number", 400);
      }
      if (limit < 1 || limit > 30) {
        limit = 30;
      }
      limitFilter = limit;
    }

    // has a sort, process it
    if (addSort) {
      const start = sortStart + readCommand.SORT.length;
      const end = Q.indexOf(')', start);
      const filter = Q.substring(start, end).trim();

      try {
        sortFilter = JSON.parse(filter);
      } catch (error) {
        throw new APIError("Invalid sort filter JSON", 400);
      }
    } // end sort

    try {
      desc = `db.${coll}.find(${JSON.stringify(filter)}, ${JSON.stringify(projection)}).limit(${limitFilter}).sort(${JSON.stringify(sortFilter)}).toArray()`;
      result = await db.collection(coll).find(filter, projection).limit(limitFilter).sort(sortFilter).toArray();
      if (coll === 'crime' && result.length === 1 && result[0]?._id.equals(CLUE_CRIME)) {
        result[0].isClue = true;
      } else if (coll === 'person' && result.length === 1) {
        if (result[0]?.name &&
          (result[0].name === CLUE_WITNESS1 ||
            result[0].name === CLUE_WITNESS2 ||
            result[0].name === CLUE_SUSPECT
          )) {
          result[0].isClue = 1;
        }
      }
      return [result, desc];
    } catch (error) {
      throw new APIError("Cannot run find query", 500);
    }
  }
  throw new APIError("Unsupported query", 400);

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
  processQuery,
  matchField
};