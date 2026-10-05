const workerpool = require('workerpool');
const os = require('node:os');
const path = require('node:path');

const JobType = Object.freeze({
  ParseFile: 'parse-file'
});

const WORKER_FILE = path.join(__dirname, 'worker.js');

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

  // Callers that need the same file at the same moment (indexer, mount) share one job
  // instead of parsing it twice. Keyed by absolute path, so it only applies to per-file jobs.
  runOnce(type, args) {
    const key = `${type}:${path.resolve(args.collectionPath, args.relativePath)}`;
    const pending = this.#inflight.get(key);
    if (pending) return pending;

    const job = Promise.resolve(this.run(type, args)).finally(() => this.#inflight.delete(key));
    this.#inflight.set(key, job);
    return job;
  }

  async destroy() {
    await this.#pool.terminate();
  }
}

let shared = null;

const getPool = (options) => {
  if (!shared) shared = new Pool(options);
  return shared;
};

const destroyPool = async () => {
  if (!shared) return;
  const pool = shared;
  shared = null;
  await pool.destroy();
};

module.exports = { Pool, getPool, destroyPool, JobType };
