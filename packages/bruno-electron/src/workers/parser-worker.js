/**
 * Shared worker configuration for Bruno Electron
 */
const WorkerQueue = require("./index");
const path = require('path');

// Create worker configuration
const workerConfig = {
  WorkerQueue,
  scriptsPath: path.join(__dirname, '../bru/workers/scripts')
};

module.exports = {
  workerConfig
}; 