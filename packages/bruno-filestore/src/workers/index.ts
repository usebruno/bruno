import WorkerQueue from './WorkerQueue';
import { CollectionFormat } from '../types';
import { DEFAULT_COLLECTION_FORMAT } from '../constants';

class BruParserWorker {
  private workerQueue = new WorkerQueue();

  private async enqueueTask({
    data,
    taskType,
    format = DEFAULT_COLLECTION_FORMAT
  }: {
    data: any;
    taskType: 'parse' | 'stringify' | 'parseFolder' | 'stringifyFolder' | 'parseEnvironment' | 'stringifyEnvironment';
    format?: CollectionFormat;
  }): Promise<any> {
    return this.workerQueue.enqueue({
      data: { data, format },
      priority: 0,
      scriptPath: '',
      taskType
    });
  }

  async parseRequest(data: any, format: CollectionFormat = DEFAULT_COLLECTION_FORMAT): Promise<any> {
    return this.enqueueTask({ data, taskType: 'parse', format });
  }

  async stringifyRequest(data: any, format: CollectionFormat = DEFAULT_COLLECTION_FORMAT): Promise<any> {
    return this.enqueueTask({ data, taskType: 'stringify', format });
  }

  async parseFolder(data: any, format: CollectionFormat = DEFAULT_COLLECTION_FORMAT): Promise<any> {
    return this.enqueueTask({ data, taskType: 'parseFolder', format });
  }

  async stringifyFolder(data: any, format: CollectionFormat = DEFAULT_COLLECTION_FORMAT): Promise<any> {
    return this.enqueueTask({ data, taskType: 'stringifyFolder', format });
  }

  async parseEnvironment(data: any, format: CollectionFormat = DEFAULT_COLLECTION_FORMAT): Promise<any> {
    return this.enqueueTask({ data, taskType: 'parseEnvironment', format });
  }

  async stringifyEnvironment(data: any, format: CollectionFormat = DEFAULT_COLLECTION_FORMAT): Promise<any> {
    return this.enqueueTask({ data, taskType: 'stringifyEnvironment', format });
  }

  async cleanup(): Promise<void> {
    await this.workerQueue.cleanup();
  }
}

export default BruParserWorker;
