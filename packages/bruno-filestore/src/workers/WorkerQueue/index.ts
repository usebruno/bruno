import os from 'node:os';
import workerpool from 'workerpool';

type WorkerTaskType
  = | 'parse'
    | 'stringify'
    | 'parseFolder'
    | 'stringifyFolder'
    | 'parseEnvironment'
    | 'stringifyEnvironment';

interface QueuedTask {
  priority: number;
  scriptPath: string;
  data: any;
  taskType: WorkerTaskType;
  resolve?: (value: any) => void;
  reject?: (reason?: any) => void;
}

// Cap the pool so a high-core machine cannot take every CPU and starve Electron/UI/OS.
const MAX_WORKERS = 16;

class WorkerQueue {
  private queue: QueuedTask[] = [];
  private pools: Record<string, workerpool.Pool> = {};
  private inFlight = 0;
  private readonly maxWorkers = Math.min(MAX_WORKERS, Math.max(1, os.availableParallelism() - 1));

  private getWorkerForScriptPath(scriptPath: string): workerpool.Pool {
    let pool = this.pools[scriptPath];
    if (!pool) {
      pool = this.pools[scriptPath] = workerpool.pool(scriptPath, {
        maxWorkers: this.maxWorkers,
        workerType: 'thread'
      });
    }
    return pool;
  }

  async enqueue(task: QueuedTask) {
    const { priority, scriptPath, data, taskType } = task;

    return new Promise((resolve, reject) => {
      this.queue.push({ priority, scriptPath, data, taskType, resolve, reject });
      this.queue.sort((taskX, taskY) => taskX.priority - taskY.priority);
      this.processQueue();
    });
  }

  private processQueue() {
    while (this.queue.length > 0 && this.inFlight < this.maxWorkers) {
      const { scriptPath, data, taskType, resolve, reject } = this.queue.shift() as QueuedTask;
      this.inFlight += 1;
      this.runWorker({ scriptPath, data, taskType })
        .then(resolve, reject)
        .finally(() => {
          this.inFlight -= 1;
          this.processQueue();
        });
    }
  }

  private runWorker({ scriptPath, data, taskType }: { scriptPath: string; data: any; taskType: WorkerTaskType }) {
    const { data: payload, format } = data;
    return this.getWorkerForScriptPath(scriptPath).exec('runParseTask', [taskType, payload, format]);
  }

  async cleanup() {
    const queued = this.queue;
    this.queue = [];
    queued.forEach((task) => {
      task.reject?.(new Error('Worker queue disposed'));
    });

    const pending = Object.values(this.pools).map((pool) => pool.terminate(true));
    this.pools = {};
    await Promise.all(pending);
  }
}

export default WorkerQueue;
