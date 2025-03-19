/**
 * Shared BruParserWorker utility for Bruno Electron
 */
const { BruParserWorker, parseRequest } = require('@usebruno/filestore');
const WorkerQueue = require("./index");
const path = require('path');

// Create a singleton BruParserWorker instance with the electron-specific WorkerQueue implementation
const fileParserWorker = new BruParserWorker({
  WorkerQueue,
  scriptsPath: path.join(__dirname, '../bru/workers/scripts')
});

/**
 * Parse a request from text content using a worker thread
 * @param {string} data - The content
 * @returns {Promise<Object>} - The parsed request object
 */
const parseViaWorker = async (data) => {
  try {
    const json = await fileParserWorker.parse(data);
    return parseRequest(json, { format: 'bru' });
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * Stringify a request object to text content using a worker thread
 * @param {Object} json - The request object
 * @returns {Promise<string>} - The stringified content
 */
const stringifyViaWorker = async (json) => {
  try {
    return await fileParserWorker.stringify(json);
  } catch (error) {
    return Promise.reject(error);
  }
};

module.exports = {
  fileParserWorker,
  parseViaWorker,
  stringifyViaWorker
}; 