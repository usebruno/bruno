import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
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

class WorkerQueue {
  async enqueue(task: QueuedTask) {
    const { data, taskType } = task;
    const { data: payload, format } = data;
    return getPool().exec('runParseTask', [taskType, payload, format]);
  }

  async cleanup() {
    if (!pool) {
      return;
    }
    await pool.terminate(true);
    pool = null;
  }
}

export default WorkerQueue;
