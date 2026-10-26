import { CollectionFormat } from '../types';
import { DEFAULT_COLLECTION_FORMAT } from '../constants';
import { disposeParseWorkerPool, runParsePoolTask } from './parse-pool';

class BruParserWorker {
  private async enqueueTask({
    data,
    taskType,
    format = DEFAULT_COLLECTION_FORMAT
  }: {
    data: any;
    taskType: 'parse' | 'stringify' | 'parseFolder' | 'stringifyFolder' | 'parseEnvironment' | 'stringifyEnvironment';
    format?: CollectionFormat;
  }): Promise<any> {
    return runParsePoolTask(taskType, data, format);
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
    await disposeParseWorkerPool();
  }
}

export default BruParserWorker;
