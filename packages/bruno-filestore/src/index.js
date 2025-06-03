const {
  bruRequestToJson,
  jsonRequestToBru,
  bruCollectionToJson,
  jsonCollectionToBru,
  bruEnvironmentToJson,
  jsonEnvironmentToBru
} = require('./formats/bru');
const { dotenvToJson } = require('@usebruno/lang');
const { BruParserWorker } = require('./workers');

/**
 * Parse a request from a file
 * @param {string} content - The content of the file
 * @param {Object} options - Options for parsing (e.g., format)
 * @returns {Object} - Parsed request object
 */
const parseRequest = (content, options = { format: 'bru' }) => {
  if (options.format === 'bru') {
    return bruRequestToJson(content);
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
    return jsonRequestToBru(requestObj);
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
    return bruCollectionToJson(content);
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
    return jsonCollectionToBru(collectionObj);
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
    return bruCollectionToJson(content);
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
    // Pass isFolder=true to indicate this is a folder not a collection
    return jsonCollectionToBru(folderObj, true);
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
    return bruEnvironmentToJson(content);
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
    return jsonEnvironmentToBru(envObj);
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

// Enhanced parse function with worker support
const parseRequestViaWorker = async (data, options = {}) => {
  if (options?.worker) {
    if (!options.workerConfig) {
      throw new Error('Worker configuration must be provided when using worker option');
    }
    
    const { WorkerQueue, scriptsPath } = options.workerConfig;
    const fileParserWorker = new BruParserWorker({
      WorkerQueue,
      scriptsPath
    });

    const json = await fileParserWorker.parseRequest(data);
    return parseRequest(json, { format: 'bru' });
  }
  
  return parseRequest(data, options);
};

// Enhanced stringify function with worker support
const stringifyRequestViaWorker = async (data, options = { format: 'bru' }) => {
  if (options?.worker) {
    if (!options.workerConfig) {
      throw new Error('Worker configuration must be provided when using worker option');
    }
    
    const { WorkerQueue, scriptsPath } = options.workerConfig;
    const fileParserWorker = new BruParserWorker({
      WorkerQueue,
      scriptsPath
    });

    return fileParserWorker.stringifyRequest(data);
  }
  
  return stringifyRequest(data, options);
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
  parseDotEnv,
  BruParserWorker,
  
  // Enhanced functions with worker support
  parseRequestViaWorker,
  stringifyRequestViaWorker
}; 