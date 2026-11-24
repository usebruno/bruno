const workerpool = require('workerpool');
const os = require('node:os');
const path = require('node:path');

const JobType = Object.freeze({
  ParseFile: 'parse-file'
});

const WORKER_FILE = path.join(__dirname, 'worker.js');

class Pool {
  #pool;

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
