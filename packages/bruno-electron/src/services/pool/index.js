const workerpool = require('workerpool');
const os = require('node:os');
const path = require('node:path');
const { PriorityQueue, JobPriority } = require('./priority-queue');

const JobType = Object.freeze({
  ParseFile: 'parse-file'
});

const WORKER_FILE = path.join(__dirname, 'worker.js');

const isQueuedIn = (promises) => (task) => promises.has(task.resolver.promise);

class Pool {
  #pool;
  #queue;

  constructor({ size } = {}) {
    const workers = Math.max(1, size ?? os.availableParallelism());
    this.#queue = new PriorityQueue();
    this.#pool = workerpool.pool(WORKER_FILE, {
      maxWorkers: workers,
      workerType: 'thread',
      workerThreadOpts: { resourceLimits: { maxOldGenerationSizeMb: 512 } },
      queueStrategy: this.#queue
    });
  }

  run(type, args, { priority = JobPriority.mount } = {}) {
    return this.#pool.exec(type, [args], { metadata: { priority } });
  }

  // Cancelling a started job would terminate its worker, so only queued jobs are cancelled
  cancelQueued(promises) {
    const removed = this.#queue.remove(isQueuedIn(new Set(promises)));
    for (const task of removed) task.resolver.promise.cancel();
    return removed.length;
  }

  prioritize(promises, priority) {
    const removed = this.#queue.remove(isQueuedIn(new Set(promises)));
    for (const task of removed) {
      task.options = { ...task.options, metadata: { ...task.options?.metadata, priority } };
      this.#queue.push(task);
    }
    return removed.length;
  }

  async destroy({ force = false } = {}) {
    await this.#pool.terminate(force);
  }
}

let shared = null;

const getPool = (options) => {
  if (!shared) shared = new Pool(options);
  return shared;
};

const destroyPool = async ({ force = false } = {}) => {
  if (!shared) return;
  const pool = shared;
  shared = null;
  await pool.destroy({ force });
};

module.exports = { Pool, getPool, destroyPool, JobType, JobPriority };
