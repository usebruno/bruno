const path = require("path");

/**
 * Get size of data in MB
 * @param {string|Object} data - Data to measure
 * @returns {number} Size in MB
 */
const getSize = (data) => {
  const bytes = typeof data === 'string' 
    ? Buffer.byteLength(data, 'utf8') 
    : Buffer.byteLength(JSON.stringify(data), 'utf8');
  
  return bytes / (1024 * 1024); // Convert to MB
}

/**
 * Lanes are used to determine which worker queue to use based on the size of the data.
 * 
 * This helps with parsing performance by using different queues for different file sizes.
 */
const LANES = [{
  maxSize: 0.005
},{
  maxSize: 0.1
},{
  maxSize: 1
},{
  maxSize: 10
},{
  maxSize: 100
}];

/**
 * WorkerQueue interface - this is a placeholder that will be implemented
 * by the electron or CLI app since worker implementation is platform-specific
 */
class DummyWorkerQueue {
  constructor() {}
  
  enqueue() {
    throw new Error("WorkerQueue not implemented. You must provide your own WorkerQueue implementation.");
  }
}

/**
 * BruParserWorker class for handling async parsing tasks
 */
class BruParserWorker {
  /**
   * Create a new BruParserWorker
   * @param {Object} options - Options
   * @param {Function} options.WorkerQueue - WorkerQueue implementation
   */
  constructor(options = {}) {
    const { WorkerQueue, scriptsPath } = options;

    if (!WorkerQueue) {
      throw new Error('WorkerQueue implementation is required');
    }

    if (!scriptsPath) {
      throw new Error('scriptsPath is required');
    }

    this.WorkerQueue = WorkerQueue;
    this.scriptsPath = scriptsPath;
  }

  /**
   * Get the appropriate worker queue for the data size
   * @param {number} size - Size of data in MB
   * @returns {Object} Worker queue
   */
  getWorkerQueue(size) {
    // Find the first queue that can handle the given size
    // or fallback to the last queue for largest files
    const queueForSize = LANES.find((lane) => 
      lane.maxSize >= size
    );

    return queueForSize?.workerQueue ?? LANES.at(-1).workerQueue;
  }

  /**
   * Enqueue a task
   * @param {Object} params - Task parameters
   * @param {any} params.data - Data to process
   * @param {string} params.scriptFile - Script file name
   * @returns {Promise<any>} Task result
   */
  async enqueueTask({data, scriptFile }) {
    const size = getSize(data);
    const workerQueue = this.getWorkerQueue(size);
    return workerQueue.enqueue({
      data,
      priority: size,
      scriptPath: path.join(this.scriptsPath, `${scriptFile}.js`)
    });
  }

  /**
   * Convert BRU to JSON asynchronously
   * @param {string} data - BRU content
   * @returns {Promise<Object>} JSON object
   */
  async bruToJson(data) {
    return this.enqueueTask({ data, scriptFile: `bru-to-json` });
  }

  /**
   * Convert JSON to BRU asynchronously
   * @param {Object} data - JSON object
   * @returns {Promise<string>} BRU content
   */
  async jsonToBru(data) {
    return this.enqueueTask({ data, scriptFile: `json-to-bru` });
  }

  async parse(data) {
    return this.WorkerQueue.enqueue({
      data,
      scriptPath: `${this.scriptsPath}/bru-to-json.js`
    });
  }

  async stringify(data) {
    return this.WorkerQueue.enqueue({
      data,
      scriptPath: `${this.scriptsPath}/json-to-bru.js`
    });
  }
}

module.exports = {
  BruParserWorker
}; 