import {
  bruRequestToJson,
  jsonRequestToBru,
  bruCollectionToJson,
  jsonCollectionToBru,
  bruEnvironmentToJson,
  jsonEnvironmentToBru
} from './formats/bru';
import { dotenvToJson } from '@usebruno/lang';
import BruParserWorker from './workers';
import {
  ParseOptions,
  StringifyOptions,
  ParsedRequest,
  ParsedCollection,
  ParsedEnvironment
} from './types';
import { bruRequestParseAndRedactBodyData } from './formats/bru/utils/request-parse-and-redact-body-data';

export const parseRequest = (content: string, options: ParseOptions = { format: 'bru' }): any => {
  if (options.format === 'bru') {
    const contentJson = bruRequestToJson(content);
    return contentJson;
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

export const parseRequestAndRedactBody = (content: string, options: ParseOptions = { format: 'bru' }): any => {
  if (options.format === 'bru') {
    return bruRequestParseAndRedactBodyData(content);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

export const stringifyRequest = (requestObj: ParsedRequest, options: StringifyOptions = { format: 'bru' }): string => {
  if (options.format === 'bru') {
    return jsonRequestToBru(requestObj);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

let globalWorkerInstance: BruParserWorker | null = null;

const getWorkerInstance = (): BruParserWorker => {
  if (!globalWorkerInstance) {
    globalWorkerInstance = new BruParserWorker();
  }
  return globalWorkerInstance;
};

export const parseRequestViaWorker = async (content: string): Promise<any> => {
  const fileParserWorker = getWorkerInstance();
  return await fileParserWorker.parseRequest(content);
};

export const stringifyRequestViaWorker = async (requestObj: any): Promise<string> => {
  const fileParserWorker = getWorkerInstance();
  return await fileParserWorker.stringifyRequest(requestObj);
};

export const parseCollection = (content: string, options: ParseOptions = { format: 'bru' }): any => {
  if (options.format === 'bru') {
    return bruCollectionToJson(content);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

export const stringifyCollection = (collectionObj: ParsedCollection, options: StringifyOptions = { format: 'bru' }): string => {
  if (options.format === 'bru') {
    return jsonCollectionToBru(collectionObj, false);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

export const parseFolder = (content: string, options: ParseOptions = { format: 'bru' }): any => {
  if (options.format === 'bru') {
    return bruCollectionToJson(content);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

export const stringifyFolder = (folderObj: any, options: StringifyOptions = { format: 'bru' }): string => {
  if (options.format === 'bru') {
    return jsonCollectionToBru(folderObj, true);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

export const parseEnvironment = (content: string, options: ParseOptions = { format: 'bru' }): any => {
  if (options.format === 'bru') {
    return bruEnvironmentToJson(content);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

export const stringifyEnvironment = (envObj: ParsedEnvironment, options: StringifyOptions = { format: 'bru' }): string => {
  if (options.format === 'bru') {
    return jsonEnvironmentToBru(envObj);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};


export const parseDotEnv = (content: string): Record<string, string> => {
  return dotenvToJson(content);
};

export { BruParserWorker };
export * from './types';