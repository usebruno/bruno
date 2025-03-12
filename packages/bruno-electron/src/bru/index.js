const _ = require('lodash');
const {
  parseRequest: _parseRequest,
  stringifyRequest: _stringifyRequest,
  parseEnvironment: _parseEnvironment,
  stringifyEnvironment: _stringifyEnvironment,
  parseCollection: _parseCollection,
  stringifyCollection: _stringifyCollection,
  BruParserWorker
} = require('@usebruno/filestore');
const WorkerQueue = require("../workers");

// Create a BruParserWorker with the electron-specific WorkerQueue implementation
const fileParserWorker = new BruParserWorker({
  WorkerQueue,
  scriptsPath: __dirname + '/workers/scripts'
});

/**
 * Parse a collection from text content
 * @param {string} data - The content
 * @param {boolean} parsed - Whether the data has already been parsed
 * @returns {Promise<Object>} - The parsed collection object
 */
const parseCollection = async (data, parsed = false) => {
  try {
    return _parseCollection(data);
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Stringify a collection object to text content
 * @param {Object} json - The collection object
 * @param {boolean} isFolder - Whether this is a folder
 * @returns {Promise<string>} - The stringified content
 */
const stringifyCollection = async (json, isFolder) => {
  try {
    return _stringifyCollection(json, { isFolder });
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Parse an environment from text content
 * @param {string} content - The content
 * @returns {Promise<Object>} - The parsed environment object
 */
const parseEnv = async (content) => {
  try {
    return _parseEnvironment(content);
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Stringify an environment object to text content
 * @param {Object} json - The environment object
 * @returns {Promise<string>} - The stringified content
 */
const stringifyEnv = async (json) => {
  try {
    return _stringifyEnvironment(json);
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Parse a request from text content
 * @param {string} data - The content
 * @param {boolean} parsed - Whether the data has already been parsed
 * @returns {Object} - The parsed request object
 */
const parse = (data, parsed = false) => {
  try {
    return _parseRequest(data);
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * Parse a request from text content using a worker thread
 * @param {string} data - The content
 * @returns {Promise<Object>} - The parsed request object
 */
const parseViaWorker = async (data) => {
  try {
    const json = await fileParserWorker?.parse(data);
    return _parseRequest(json, { format: 'bru' });
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * Stringify a request object to text content
 * @param {Object} json - The request object
 * @returns {Promise<string>} - The stringified content
 */
const stringify = async (json) => {
  try {
    return _stringifyRequest(json);
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Stringify a request object to text content using a worker thread
 * @param {Object} json - The request object
 * @returns {Promise<string>} - The stringified content
 */
const stringifyViaWorker = async (json) => {
  try {
    return fileParserWorker?.stringify(json);
  } catch (error) {
    return Promise.reject(error);
  }
};

module.exports = {
  parse,
  parseViaWorker,
  stringify,
  parseEnv,
  stringifyEnv,
  parseCollection,
  stringifyCollection,
  stringifyViaWorker
};
