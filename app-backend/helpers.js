
// Global regexes for MongoDB query patterns
const regexes = {
  getCollections: /^db\.getCollectionNames\(\);?$/, // e.g., db.getCollectionNames()
  collName: /^db(\.\w+\.|\['\w+'\]|\["\w+"\])/, // e.g., db.<collName>.
  stringField: /['"]([^'"]+)['"]/, //  e.g., db.collection.distinct("<field>")
  noArgs: /^$/,
  findArgs: /^\s*(\{\s*[\s\S]*?\s*\})\s*(?:,\s*(\{\s*[\s\S]*?\s*\}))?\s*$/m,
  ///^(\{[\s\S]*?\s*\})?\s*(,\s*(\{[\s\S]*?\s\}))?\s*\)?$/m,
  sol: /^\s*{\s*"name"\s*:\s*"(.*?)"\s*\}\s*$/m,
};

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
  console.log('cleanCollectionName: ', collectionName);
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

function cleanRegexValues(inputString) {

  // Check for the various possible formats, modify each transformation accordingly
  // https://www.mongodb.com/docs/manual/reference/operator/query/regex/#syntax

  // regexDoc_json   { "$regex": "pattern", "$options": "<imxsu>" }
  // regexDoc_hybrid { "$regex": /pattern/, "$options":"<imxsu>" }
  // regexDoc_object { "$regex": /pattern/<imxsu> }
  // regexVal_object /pattern/<imxsu>
  const formats = {
    regexDoc_json: /^\{\s*(?:"\$regex"|\$regex)\s*:\s*"[^"]*"\s*(?:,\s*(?:"\$options"|\$options)\s*:\s*"([imxsu]{0,5})?")?\s*\}(.*?)/,
    regexDoc_hybrid: /^\{\s*(?:"\$regex"|\$regex)\s*:\s*\/(.*?)\/\s*(?:,\s*(?:"\$options"|\$options)\s*:\s*"([imxsu]{0,5})?")?\s*\}(.*?)/,
    regexDoc_object: /^\{\s*(?:"\$regex"|\$regex)\s*:\s*\/(.*?)\/([imxsu]{0,5})?\s*\}(.*?)/,
    regexVal_object: /^\/(.*?)\/([imxsu]{0,5})?$/
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
  // check empty args
  if (regexes.noArgs.test(Q)) {
    console.log('parseFindArgs: No args found');
    return [{}, {}];
  }

  const match = Q.match(regexes.findArgs);
  if (!match) throw new Error("Invalid input format");

  let filter = {};
  let projection = {};

  console.log('match is ', match);

  try {
    if (match[1] && match[1] !== '{}') {
      filter = JSON.parse(cleanRegexValues(match[1]));
    } else {
      console.log('parseFindArgs: Empty filter');
    }
  } catch (error) {
    throw new Error(`Error parsing filter: ${error.message}`);
  }

  try {
    if (match[2] && match[2] !== '{}') {
      projection = JSON.parse(match[2]);
    } else {
      console.log('parseFindArgs: Empty projection');
    }
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
// Export all at once
module.exports = {
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
  addQuotesToWords


};