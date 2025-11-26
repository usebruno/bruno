import { Worker } from 'node:worker_threads';

interface QueuedTask {
  priority: number;
  scriptPath: string;
  data: any;
  taskType: 'parse' | 'stringify';
  resolve?: (value: any) => void;
  reject?: (reason?: any) => void;
}

class WorkerQueue {
  private queue: QueuedTask[];
  private isProcessing: boolean;
  private workers: Record<string, Worker>;

  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.workers = {};
  }

  async getWorkerForScriptPath(scriptPath: string) {
    if (!this.workers) this.workers = {}; 
    let worker = this.workers[scriptPath];
    if (!worker || worker.threadId === -1) {
      this.workers[scriptPath] = worker = new Worker(scriptPath);
    }
    return worker;
  }
  
  async enqueue(task: QueuedTask) {
    const { priority, scriptPath, data, taskType } = task;

    return new Promise((resolve, reject) => {
      this.queue.push({ priority, scriptPath, data, taskType, resolve, reject });
      this.queue?.sort((taskX, taskY) => taskX?.priority - taskY?.priority);
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0){
      return;
    } 

    this.isProcessing = true;
    const { scriptPath, data, taskType, resolve, reject } = this.queue.shift() as QueuedTask;

    try {
      const result = await this.runWorker({ scriptPath, data, taskType });
      resolve?.(result);
    } catch (error) {
      reject?.(error);
    } finally {
      this.isProcessing = false;
      this.processQueue();
    }
  }

  async runWorker({ scriptPath, data, taskType }: { scriptPath: string; data: any; taskType: 'parse' | 'stringify' }) {
    return new Promise(async (resolve, reject) => {
      let worker = await this.getWorkerForScriptPath(scriptPath);
      
      const messageHandler = (data: any) => {
        worker.off('message', messageHandler);
        worker.off('error', errorHandler);
        worker.off('exit', exitHandler);
        
        if (data?.error) {
          reject(new Error(data?.error));
        } else {
          resolve(data);
        }
      };

      const errorHandler = (error: Error) => {
        worker.off('message', messageHandler);
        worker.off('error', errorHandler);
        worker.off('exit', exitHandler);
        reject(error);
      };

      const exitHandler = (code: number) => {
        worker.off('message', messageHandler);
        worker.off('error', errorHandler);
        worker.off('exit', exitHandler);
        // Remove dead worker from cache
        delete this.workers[scriptPath];
        reject(new Error(`Worker stopped with exit code ${code}`));
      };
      
      worker.on('message', messageHandler);
      worker.on('error', errorHandler);
      worker.on('exit', exitHandler);

      worker.postMessage({ taskType, data });
    });
  }

  async cleanup() {
    const promises = Object.values(this.workers).map(worker => {
      if (worker.threadId !== -1) {
        return worker.terminate();
      }
      return Promise.resolve();
    });
    
    await Promise.allSettled(promises);
    this.workers = {};
  }
}

export default WorkerQueue;