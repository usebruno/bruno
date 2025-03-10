const _ = require('lodash');
const {
  parseRequest,
  stringifyRequest,
  parseEnvironment,
  stringifyEnvironment,
  parseCollection,
  stringifyCollection,
  BruParserWorker
} = require('@usebruno/filestore');
const WorkerQueue = require("../workers");

// Create a BruParserWorker with the electron-specific WorkerQueue implementation
const fileParserWorker = new BruParserWorker({
  WorkerQueue,
  scriptsPath: __dirname + '/workers/scripts'
});

/**
 * Convert a collection file to JSON
 * @param {string} data - The file content
 * @param {boolean} parsed - Whether the data has already been parsed
 * @returns {Promise<Object>} - The parsed collection object
 */
const collectionFileToJson = async (data, parsed = false) => {
  try {
    return parseCollection(data);
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Convert a JSON collection to file format
 * @param {Object} json - The collection object
 * @param {boolean} isFolder - Whether this is a folder
 * @returns {Promise<string>} - The file content
 */
const jsonToCollectionFile = async (json, isFolder) => {
  try {
    return stringifyCollection(json, { isFolder });
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Convert an environment file to JSON
 * @param {string} fileContent - The file content
 * @returns {Promise<Object>} - The parsed environment object
 */
const envFileToJson = async (fileContent) => {
  try {
    return parseEnvironment(fileContent);
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Convert a JSON environment to file format
 * @param {Object} json - The environment object
 * @returns {Promise<string>} - The file content
 */
const envJsonToFile = async (json) => {
  try {
    return stringifyEnvironment(json);
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Convert a request file to JSON
 * @param {string} data - The file content
 * @param {boolean} parsed - Whether the data has already been parsed
 * @returns {Object} - The parsed request object
 */
const fileToJson = (data, parsed = false) => {
  try {
    return parseRequest(data);
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * Convert a request file to JSON using a worker thread
 * @param {string} data - The file content
 * @returns {Promise<Object>} - The parsed request object
 */
const fileToJsonViaWorker = async (data) => {
  try {
    const json = await fileParserWorker?.bruToJson(data);
    return parseRequest(json, { format: 'bru' });
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * Convert a JSON request to file format
 * @param {Object} json - The request object
 * @returns {Promise<string>} - The file content
 */
const jsonToFile = async (json) => {
  try {
    return stringifyRequest(json);
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Convert a JSON request to file format using a worker thread
 * @param {Object} json - The request object
 * @returns {Promise<string>} - The file content
 */
const jsonToFileViaWorker = async (json) => {
  try {
    return fileParserWorker?.jsonToBru(json);
  } catch (error) {
    return Promise.reject(error);
  }
};

module.exports = {
  fileToJson,
  fileToJsonViaWorker,
  jsonToFile,
  envFileToJson,
  envJsonToFile,
  collectionFileToJson,
  jsonToCollectionFile,
  jsonToFileViaWorker,
};
