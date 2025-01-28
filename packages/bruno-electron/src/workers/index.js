const { Worker } = require('worker_threads');

class WorkerQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  async enqueue(task) {
    const { priority, scriptPath, data } = task;

    return new Promise((resolve, reject) => {
      this.queue.push({ priority, scriptPath, data, resolve, reject });
      this.queue?.sort((taskX, taskY) => taskX?.priority - taskY?.priority);
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0){
      return;
    } 

    this.isProcessing = true;
    const { scriptPath, data, resolve, reject } = this.queue.shift();

    try {
      const result = await this.runWorker({ scriptPath, data });
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.isProcessing = false;
      this.processQueue();
    }
  }

  async runWorker({ scriptPath, data }) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(scriptPath, { workerData: data });
      worker.on('message', (data) => {
        if (data?.error) {
          reject(new Error(data?.error));
        }
        resolve(data);
        worker.terminate();
      });
      worker.on('error', (error) => {
        reject(error);
        worker.terminate();
      });
      worker.on('exit', (code) => {
        reject(new Error(`stopped with  ${code} exit code`));
        worker.terminate();
      });
    });
  }
}

module.exports = WorkerQueue;
