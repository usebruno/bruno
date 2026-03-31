import WorkerQueue from './WorkerQueue';
import { Lane, CollectionFormat } from '../types';
import { DEFAULT_COLLECTION_FORMAT } from '../constants';
import path from 'node:path';

const sizeInMB = (size: number): number => {
  return size / (1024 * 1024);
};

const getSize = (data: any): number => {
  return sizeInMB(typeof data === 'string' ? Buffer.byteLength(data, 'utf8') : Buffer.byteLength(JSON.stringify(data), 'utf8'));
};

/**
 * Lanes are used to determine which worker queue to use based on the size of the data.
 *
 * The first lane is for smaller files (<0.1MB), the second lane is for larger files (>=0.1MB).
 * This helps with parsing performance.
 */
const LANES: Lane[] = [{
  maxSize: 0.005
}, {
  maxSize: 0.1
}, {
  maxSize: 1
}, {
  maxSize: 10
}, {
  maxSize: 100
}];

interface WorkerQueueGroup {
  maxSize: number;
  workerQueues: WorkerQueue[];
  nextIndex: number;
}

class BruParserWorker {
  private queueGroups: WorkerQueueGroup[];

  constructor(concurrency: number = 1) {
    const workerCount = Math.max(1, Math.floor(concurrency));
    this.queueGroups = LANES.map((lane, index) => ({
      maxSize: lane.maxSize,
      // Apply concurrency to Lanes 0-2 (< 5KB, < 100KB, < 1MB) where bulk request files go.
      // Larger lanes (10MB+, 100MB+) handle few files and don't benefit from parallelism.
      workerQueues: Array.from({ length: index <= 2 ? workerCount : 1 }, () => new WorkerQueue()),
      nextIndex: 0
    }));
  }

  private getWorkerQueue(size: number): WorkerQueue {
    // Find the first queue group that can handle the given size
    // or fallback to the last group for largest files
    const group = this.queueGroups.find((g) => g.maxSize >= size)
      ?? this.queueGroups[this.queueGroups.length - 1];

    // Round-robin across worker queues in the group
    const queue = group.workerQueues[group.nextIndex];
    group.nextIndex = (group.nextIndex + 1) % group.workerQueues.length;
    return queue;
  }

  private async enqueueTask({ data, taskType, format = DEFAULT_COLLECTION_FORMAT }: { data: any; taskType: 'parse' | 'stringify'; format?: CollectionFormat }): Promise<any> {
    const size = getSize(data);
    const workerQueue = this.getWorkerQueue(size);
    const workerScriptPath = path.join(__dirname, './workers/worker-script.js');

    return workerQueue.enqueue({
      data: { data, format },
      priority: size,
      scriptPath: workerScriptPath,
      taskType
    });
  }

  async parseRequest(data: any, format: CollectionFormat = DEFAULT_COLLECTION_FORMAT): Promise<any> {
    return this.enqueueTask({ data, taskType: 'parse', format });
  }

  async stringifyRequest(data: any, format: CollectionFormat = DEFAULT_COLLECTION_FORMAT): Promise<any> {
    return this.enqueueTask({ data, taskType: 'stringify', format });
  }

  async cleanup(): Promise<void> {
    const cleanupPromises = this.queueGroups.flatMap(({ workerQueues }) =>
      workerQueues.map((wq) => wq.cleanup())
    );
    await Promise.allSettled(cleanupPromises);
  }
}

export default BruParserWorker;
