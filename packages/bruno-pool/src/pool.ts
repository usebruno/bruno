import * as workerpool from 'workerpool';
import * as os from 'node:os';
import * as path from 'node:path';

export interface PoolOptions {
  size?: number;
}

export const JobType = {
  ParseFile: 'parse-file'
} as const;

export type JobType = (typeof JobType)[keyof typeof JobType];

const WORKER_FILE = path.join(__dirname, 'worker.js');

export class Pool {
  #pool: workerpool.Pool;

  // Let's see if we need dynamic sizing (to increase and decrease workers based on work load)
  constructor(options: PoolOptions = {}) {
    const size = Math.max(1, options.size ?? os.availableParallelism());
    this.#pool = workerpool.pool(WORKER_FILE, {
      maxWorkers: size,
      workerType: 'thread',
      
    });
  }

  run<T = unknown>(type: JobType, args?: unknown): Promise<T> {
    return this.#pool.exec(type, [args]) as Promise<T>;
  }

  async destroy(): Promise<void> {
    await this.#pool.terminate();
  }
}

let shared: Pool | null = null;

export const getPool = (options?: PoolOptions): Pool => {
  if (!shared) shared = new Pool(options);
  return shared;
};

export const destroyPool = async (): Promise<void> => {
  if (!shared) return;
  const pool = shared;
  shared = null;
  await pool.destroy();
};
