const {
  bruToJsonV2,
  jsonToBruV2,
  bruToEnvJsonV2,
  envJsonToBruV2,
  collectionBruToJson,
  jsonToCollectionBru,
  dotenvToJson
} = require('@usebruno/lang');

/**
 * Parse a request from a file
 * @param {string} content - The content of the file
 * @param {Object} options - Options for parsing (e.g., format)
 * @returns {Object} - Parsed request object
 */
const parseRequest = (content, options = { format: 'bru' }) => {
  if (options.format === 'bru') {
    return bruToJsonV2(content);
  }
  // Future implementations for other formats (e.g., YAML)
  throw new Error(`Unsupported format: ${options.format}`);
};

/**
 * Stringify a request object to file content
 * @param {Object} requestObj - The request object to stringify
 * @param {Object} options - Options for stringifying (e.g., format)
 * @returns {string} - Stringified request content
 */
const stringifyRequest = (requestObj, options = { format: 'bru' }) => {
  if (options.format === 'bru') {
    return jsonToBruV2(requestObj);
  }
  // Future implementations for other formats (e.g., YAML)
  throw new Error(`Unsupported format: ${options.format}`);
};

/**
 * Parse a collection from a file
 * @param {string} content - The content of the file
 * @param {Object} options - Options for parsing (e.g., format)
 * @returns {Object} - Parsed collection object
 */
const parseCollection = (content, options = { format: 'bru' }) => {
  if (options.format === 'bru') {
    return collectionBruToJson(content);
  }
  // Future implementations for other formats (e.g., YAML)
  throw new Error(`Unsupported format: ${options.format}`);
};

/**
 * Stringify a collection object to file content
 * @param {Object} collectionObj - The collection object to stringify
 * @param {Object} options - Options for stringifying (e.g., format)
 * @returns {string} - Stringified collection content
 */
const stringifyCollection = (collectionObj, options = { format: 'bru' }) => {
  if (options.format === 'bru') {
    return jsonToCollectionBru(collectionObj);
  }
  // Future implementations for other formats (e.g., YAML)
  throw new Error(`Unsupported format: ${options.format}`);
};

/**
 * Parse a folder from a file
 * @param {string} content - The content of the file
 * @param {Object} options - Options for parsing (e.g., format)
 * @returns {Object} - Parsed folder object
 */
const parseFolder = (content, options = { format: 'bru' }) => {
  if (options.format === 'bru') {
    return collectionBruToJson(content);
  }
  // Future implementations for other formats (e.g., YAML)
  throw new Error(`Unsupported format: ${options.format}`);
};

/**
 * Stringify a folder object to file content
 * @param {Object} folderObj - The folder object to stringify
 * @param {Object} options - Options for stringifying (e.g., format)
 * @returns {string} - Stringified folder content
 */
const stringifyFolder = (folderObj, options = { format: 'bru' }) => {
  if (options.format === 'bru') {
    return jsonToCollectionBru(folderObj);
  }
  // Future implementations for other formats (e.g., YAML)
  throw new Error(`Unsupported format: ${options.format}`);
};

/**
 * Parse an environment from a file
 * @param {string} content - The content of the file
 * @param {Object} options - Options for parsing (e.g., format)
 * @returns {Object} - Parsed environment object
 */
const parseEnvironment = (content, options = { format: 'bru' }) => {
  if (options.format === 'bru') {
    return bruToEnvJsonV2(content);
  }
  // Future implementations for other formats (e.g., YAML)
  throw new Error(`Unsupported format: ${options.format}`);
};

/**
 * Stringify an environment object to file content
 * @param {Object} envObj - The environment object to stringify
 * @param {Object} options - Options for stringifying (e.g., format)
 * @returns {string} - Stringified environment content
 */
const stringifyEnvironment = (envObj, options = { format: 'bru' }) => {
  if (options.format === 'bru') {
    return envJsonToBruV2(envObj);
  }
  // Future implementations for other formats (e.g., YAML)
  throw new Error(`Unsupported format: ${options.format}`);
};

/**
 * Parse .env file to JSON
 * @param {string} content - The content of the .env file
 * @returns {Object} - Parsed environment variables as key-value pairs
 */
const parseDotEnv = (content) => {
  return dotenvToJson(content);
};

module.exports = {
  parseRequest,
  stringifyRequest,
  parseCollection,
  stringifyCollection,
  parseFolder,
  stringifyFolder,
  parseEnvironment,
  stringifyEnvironment,
  parseDotEnv
}; 