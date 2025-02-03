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
  maxSize: 0.01
},{
  maxSize: 0.05
},{
  maxSize: 0.1
},{
  maxSize: 1
},{
  maxSize: 1000
}];

class BruParserWorker {
  constructor() {
    this.workerQueues = LANES?.map((lane, idx) => ({
      maxSize: lane?.maxSize,
      workerQueue: new WorkerQueue({ workerId: idx })
    }));
    this.WORKER_QUEUE_MAX_LENGTH  = process.env.WORKER_QUEUE_MAX_LENGTH || 100;
  }

  createWorkerQueue(size) {
    const lane = LANES.find(lane => lane.maxSize >= size);
    if (!lane) return null;

    const workerQueue = new WorkerQueue({ workerId: this.workerQueues.length });
    this.workerQueues.push({ maxSize: lane.maxSize, workerQueue });

    return workerQueue;
  }

  getWorkerQueue(size) {
    // Find the first queue that can handle the given size
    // or fallback to the last queue for largest files
    const queueForSize = this.workerQueues.find((queue) => 
      (queue.maxSize >= size) && queue.workerQueue.queueSize < this.WORKER_QUEUE_MAX_LENGTH
    );

    if (!queueForSize) {
      return this.createWorkerQueue(size);
    }

    return queueForSize?.workerQueue ?? this.workerQueues?.at?.(-1)?.workerQueue;
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

  async bruToJson(data) {
    return this.enqueueTask({ data, scriptFile: `bru-to-json` });
  }

  async jsonToBru(data) {
    return this.enqueueTask({ data, scriptFile: `json-to-bru` });
  }
}

module.exports = BruParserWorker;