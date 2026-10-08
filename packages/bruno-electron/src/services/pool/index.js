const workerpool = require('workerpool');
const os = require('node:os');
const path = require('node:path');

const JobType = Object.freeze({
  ParseFile: 'parse-file'
});

const WORKER_FILE = path.join(__dirname, 'worker.js');

// A parse that runs longer than this is given up (its worker is stopped), so one bad file cannot hold a worker forever
const PARSE_TIMEOUT_MS = 30000;

class Pool {
  #pool;
  #inflight = new Map();

  constructor({ size } = {}) {
    const workers = Math.max(1, size ?? os.availableParallelism());
    this.#pool = workerpool.pool(WORKER_FILE, {
      maxWorkers: workers,
      workerType: 'thread',
      workerThreadOpts: { resourceLimits: { maxOldGenerationSizeMb: 512 } }
    });
  }

  run(type, args) {
    return this.#pool.exec(type, [args]);
  }

  runOnce(type, args) {
    const key = `${type}:${path.resolve(args.collectionPath, args.relativePath)}`;
    const pending = this.#inflight.get(key);
    if (pending) return pending;

    const task = this.run(type, args);
    const job = Promise.resolve(task.timeout?.(PARSE_TIMEOUT_MS) ?? task).finally(() => this.#inflight.delete(key));
    this.#inflight.set(key, job);
    return job;
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

module.exports = { Pool, getPool, destroyPool, JobType };
