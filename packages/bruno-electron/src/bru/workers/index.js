const WorkerQueue = require("../../workers");
const path = require("path");

const getSize = (data) => {
  return typeof data === 'string' ? Buffer.byteLength(data, 'utf8') : Buffer.byteLength(JSON.stringify(data), 'utf8');
}

class BruWorker {
  constructor({ lanes = [] }) {
    this.workerQueues = lanes?.map(lane => ({
      maxSize: lane?.maxSize,
      workerQueue: new WorkerQueue()
    }));
  }

  getWorkerQueue(size) {
    return this.workerQueues.find((wq) => wq?.maxSize >= size)?.workerQueue || this.workerQueues.at(-1)?.workerQueue;
  }

  async enqueueTask({data, scriptFile }) {
    const size = getSize(data);
    const workerQueue = this.getWorkerQueue(size);
    return workerQueue.enqueue({ data, priority: size, scriptPath: path.join(__dirname, `./scripts/${scriptFile}.js`) });
  }

  async bruToJson(data) {
    return this.enqueueTask({ data, scriptFile: `bru-to-json` });
  }

  async jsonToBru(data) {
    return this.enqueueTask({ data, scriptFile: `json-to-bru` });
  }

  async collectionBruToJson(data) {
    return this.enqueueTask({ data, scriptFile: `collection-bru-to-json` });
  }

  async jsonToCollectionBru(data) {
    return this.enqueueTask({ data, scriptFile: `json-to-collection-bru` });
  }
}

module.exports = BruWorker;