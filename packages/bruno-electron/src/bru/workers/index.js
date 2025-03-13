const { sizeInMB } = require("../../utils/filesystem");
const WorkerQueue = require("../../workers");
const path = require("path");

const getSize = (data) => {
  return sizeInMB(typeof data === 'string' ? Buffer.byteLength(data, 'utf8') : Buffer.byteLength(JSON.stringify(data), 'utf8'));
}

/**
 * Lanes are used to determine which worker queue to use based on the size of the data.
 * 
 * The first lane is for smaller files (<0.1MB), the second lane is for larger files (>=0.1MB).
 * This helps with parsing performance.
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

class BruParserWorker {
  constructor() {
    this.workerQueues = LANES?.map(lane => ({
      maxSize: lane?.maxSize,
      workerQueue: new WorkerQueue()
    }));
  }

  getWorkerQueue(size) {
    // Find the first queue that can handle the given size
    // or fallback to the last queue for largest files
    const queueForSize = this.workerQueues.find((queue) => 
      queue.maxSize >= size
    );

    return queueForSize?.workerQueue ?? this.workerQueues.at(-1).workerQueue;
  }

  async enqueueTask({data, scriptFile }) {
    const size = getSize(data);
    const workerQueue = this.getWorkerQueue(size);
    return workerQueue.enqueue({
      data,
      priority: size,
      scriptPath: path.join(__dirname, `./scripts/${scriptFile}.js`)
    });
  }

  async parse(data) {
    return this.enqueueTask({ data, scriptFile: `bru-to-json` });
  }

  async stringify(data) {
    return this.enqueueTask({ data, scriptFile: `json-to-bru` });
  }
}

module.exports = BruParserWorker;