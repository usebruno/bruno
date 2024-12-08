const { Worker } = require('worker_threads');

class WorkerQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  async enqueue(taskData, workerFunctionName) {
    return new Promise((resolve, reject) => {
      this.queue.push({ taskData, workerFunctionName, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;
    const { taskData, workerFunctionName, resolve, reject } = this.queue.shift();

    try {
      const result = await this.runWorker(workerFunctionName, taskData?.taskData);
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.isProcessing = false;
      this.processQueue();
    }
  }

  async runWorker(workerFunctionName, taskData) {
    const workerFunction = this[workerFunctionName];

    if (!workerFunction) {
      throw new Error(`Worker function ${workerFunctionName} not found`);
    }
    const res = await workerFunction(taskData);
    return res;
  }

  async runBruToJsonV2Worker(data) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(`
      const { workerData, parentPort } = require('worker_threads');
      const {
        bruToJsonV2,
      } = require('@usebruno/lang');
  
      try {
        const bru = workerData;
        const json = bruToJsonV2(bru);
        parentPort.postMessage(json);
      }
      catch(error) {
        console.error(error);
      }
    `, {
        eval: true,
        workerData: data,
      });
      worker.on('message', (data) => {
        resolve(data);
        worker.terminate();
      });
      worker.on('error', (error) => {
        reject(error);
        worker.terminate();
      });
      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error(`stopped with  ${code} exit code`));
        worker.terminate();
      });
    });
  }

  async runJsonToBruV2Worker(data) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(`
      const { workerData, parentPort } = require('worker_threads');
      const {
        jsonToBruV2,
      } = require('@usebruno/lang');
  
      try {
        const json = workerData;
        const bru = jsonToBruV2(json);
        parentPort.postMessage(bru);
      }
      catch(error) {
        console.error(error);
      }
    `, {
        eval: true,
        workerData: data,
      });
      worker.on('message', (data) => {
        resolve(data);
        worker.terminate();
      });
      worker.on('error', (error) => {
        reject(error);
        worker.terminate();
      });
      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error(`stopped with  ${code} exit code`));
        worker.terminate();
      });
    });
  }

  async runBruToEnvJsonV2Worker(data) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(`
      const { workerData, parentPort } = require('worker_threads');
      const {
        bruToEnvJsonV2,
      } = require('@usebruno/lang');
  
      try {
        const bru = workerData;
        const json = bruToEnvJsonV2(bru);
        parentPort.postMessage(json);
      }
      catch(error) {
        console.error(error);
      }
    `, {
        eval: true,
        workerData: data,
      });

      worker.on('message', (data) => {
        resolve(data);
        worker.terminate();
      });

      worker.on('error', (error) => {
        reject(error);
        worker.terminate();
      });

      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error(`stopped with  ${code} exit code`));
        worker.terminate();
      });
    });
  }

  async runEnvJsonToBruV2Worker(data) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(`
      const { workerData, parentPort } = require('worker_threads');
      const {
        envJsonToBruV2,
      } = require('@usebruno/lang');
  
      try {
        const json = workerData;
        const bru = envJsonToBruV2(json);
        parentPort.postMessage(bru);
      }
      catch(error) {
        console.error(error);
      }
    `, {
        eval: true,
        workerData: data,
      });
      worker.on('message', (data) => {
        resolve(data);
        worker.terminate();
      });
      worker.on('error', (error) => {
        reject(error);
        worker.terminate();
      });
      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error(`stopped with  ${code} exit code`));
        worker.terminate();
      });
    });
  }

  async runCollectionBruToJsonWorker(data) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(`
      const { workerData, parentPort } = require('worker_threads');
      const {
        collectionBruToJson,
      } = require('@usebruno/lang');
  
      try {
        const bru = workerData;
        const json = collectionBruToJson(bru);
        parentPort.postMessage(json);
      }
      catch(error) {
        console.error(error);
      }
    `, {
        eval: true,
        workerData: data,
      });
      worker.on('message', (data) => {
        resolve(data);
        worker.terminate();
      });
      worker.on('error', (error) => {
        reject(error);
        worker.terminate();
      });
      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error(`stopped with  ${code} exit code`));
        worker.terminate();
      });
    });
  }

  async runJsonToCollectionBruWorker(data) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(`
      const { workerData, parentPort } = require('worker_threads');
      const {
        jsonToCollectionBru,
      } = require('@usebruno/lang');
  
      try {
        const json = workerData;
        const bru = jsonToCollectionBru(json);
        parentPort.postMessage(bru);
      }
      catch(error) {
        console.error(error);
      }
    `, {
        eval: true,
        workerData: data,
      });
      worker.on('message', (data) => {
        resolve(data);
        worker.terminate();
      });
      worker.on('error', (error) => {
        reject(error);
        worker.terminate();
      });
      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error(`stopped with  ${code} exit code`));
        worker.terminate();
      });
    });
  }

}

const workerQueue = new WorkerQueue();
const workerQueueSmall = new WorkerQueue();

module.exports = {
  workerQueue,
  workerQueueSmall
};
