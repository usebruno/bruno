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
      workerType: 'thread'
    });
  }

  run(type, args) {
    return this.#pool.exec(type, [args]);
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
