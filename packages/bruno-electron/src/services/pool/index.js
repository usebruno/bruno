const workerpool = require('workerpool');
const os = require('node:os');
const path = require('node:path');

const JobType = Object.freeze({
  ParseFile: 'parse-file'
});

const WORKER_FILE = path.join(__dirname, 'worker.js');

/**
 * How long the pool may sit idle before its workers are released.
 *
 * Workers are threads, so their heaps count against the main process. Each one loads the `.bru`
 * grammars, which ohm compiles at module load rather than on first parse — around 78MB per worker
 * before it has read a single file. A machine reporting ten cores therefore holds the better part
 * of a gigabyte for a pool that is only used while a collection mounts.
 *
 * Long enough that a workspace mounting its collections one after another reuses the same workers
 * throughout, rather than paying startup between each.
 */
const IDLE_TEARDOWN_MS = 30_000;

/**
 * Ceiling on the default pool size, independent of core count.
 *
 * A mount's wall-clock is dominated by reading files and dispatching them, not by CPU: the measured
 * speed-up topped out around 4.5x even on a `.bru` collection parsed with the full grammar, and the
 * tree scanner made the per-file work cheaper still. Workers past that point each cost a thread with
 * its own V8 isolate and win nothing, which on a 10- or 16-core machine is pure overhead.
 *
 * An explicitly requested size is honoured; only the core-count default is capped.
 */
const MAX_DEFAULT_WORKERS = 6;

class Pool {
  #pool = null;
  #size;
  #inFlight = 0;
  #idleTimer = null;

  constructor({ size } = {}) {
    this.#size = Math.max(1, size ?? Math.min(os.availableParallelism(), MAX_DEFAULT_WORKERS));
  }

  // Workers are spun up on demand and released again once idle, so this may be creating the
  // underlying pool for the first time or re-creating it after a quiet period.
  #ensurePool() {
    if (!this.#pool) {
      this.#pool = workerpool.pool(WORKER_FILE, {
        maxWorkers: this.#size,
        workerType: 'thread',
        workerThreadOpts: { resourceLimits: { maxOldGenerationSizeMb: 512 } }
      });
    }
    return this.#pool;
  }

  async run(type, args) {
    this.#clearIdleTimer();
    const pool = this.#ensurePool();
    this.#inFlight += 1;

    try {
      return await pool.exec(type, [args]);
    } finally {
      this.#inFlight -= 1;
      if (this.#inFlight === 0) this.#scheduleIdleRelease();
    }
  }

  #clearIdleTimer() {
    if (this.#idleTimer) {
      clearTimeout(this.#idleTimer);
      this.#idleTimer = null;
    }
  }

  #scheduleIdleRelease() {
    this.#clearIdleTimer();
    this.#idleTimer = setTimeout(() => {
      this.#idleTimer = null;
      // Re-check: a job may have started between the timer firing and this running.
      if (this.#inFlight === 0) this.#releaseWorkers();
    }, IDLE_TEARDOWN_MS);
    // Must not hold the process open on its own.
    this.#idleTimer.unref?.();
  }

  // Releases the workers but keeps this Pool usable: callers hold on to the instance returned by
  // getPool(), so the instance has to outlive its workers. The next run() spins them up again.
  #releaseWorkers() {
    const pool = this.#pool;
    if (!pool) return;
    this.#pool = null;
    pool.terminate().catch(() => {});
  }

  async destroy() {
    this.#clearIdleTimer();
    const pool = this.#pool;
    this.#pool = null;
    if (pool) await pool.terminate();
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
