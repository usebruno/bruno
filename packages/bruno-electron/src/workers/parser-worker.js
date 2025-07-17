const WorkerQueue = require("./index");
const path = require('path');

// Create worker configuration
const workerConfig = {
  WorkerQueue,
  scriptsPath: path.join(__dirname, './scripts')
};

module.exports = {
  workerConfig
}; 