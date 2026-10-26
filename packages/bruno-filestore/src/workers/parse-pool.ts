import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import workerpool from 'workerpool';
import { CollectionFormat } from '../types';
import { DEFAULT_COLLECTION_FORMAT } from '../constants';

type WorkerTaskType
  = | 'parse'
    | 'stringify'
    | 'parseFolder'
    | 'stringifyFolder'
    | 'parseEnvironment'
    | 'stringifyEnvironment';

const MAX_WORKERS = 16;
const require = createRequire(__filename);

let pool: workerpool.Pool | null = null;

const workerScriptPath = () => path.join(
  path.dirname(require.resolve('@usebruno/filestore/package.json')),
  'dist/cjs/workers/worker-script.js'
);

const getPool = (): workerpool.Pool => {
  if (!pool) {
    const maxWorkers = Math.min(MAX_WORKERS, Math.max(1, os.availableParallelism() - 1));
    pool = workerpool.pool(workerScriptPath(), {
      maxWorkers,
      workerType: 'thread'
    });
  }
  return pool;
};

export const runParsePoolTask = async (
  taskType: WorkerTaskType,
  data: any,
  format: CollectionFormat = DEFAULT_COLLECTION_FORMAT
): Promise<any> => {
  return getPool().exec('runParseTask', [taskType, data, format]);
};

export const disposeParseWorkerPool = async (): Promise<void> => {
  if (!pool) {
    return;
  }
  await pool.terminate(true);
  pool = null;
};
