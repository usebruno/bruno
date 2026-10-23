const workerpool = require('workerpool');
const os = require('node:os');
const path = require('node:path');
const { PriorityTaskQueue, JobPriority } = require('./priority-queue');

const JobType = Object.freeze({
  ParseFile: 'parse-file'
});

const WORKER_FILE = path.join(__dirname, 'worker.js');
const PRIORITY_LEVELS = new Set(Object.values(JobPriority));

class Pool {
  #pool;

  constructor({ size } = {}) {
    const workers = Math.max(1, size ?? os.availableParallelism());
    this.#pool = workerpool.pool(WORKER_FILE, {
      maxWorkers: workers,
      workerType: 'thread',
      queueStrategy: new PriorityTaskQueue(),
      workerThreadOpts: { resourceLimits: { maxOldGenerationSizeMb: 512 } }
    });
  }

  run(type, args, { priority = JobPriority.Normal } = {}) {
    if (!PRIORITY_LEVELS.has(priority)) {
      return Promise.reject(new Error(`Unknown job priority: ${priority}`));
    }
    return this.#pool.exec(type, [args], { metadata: { priority } });
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
