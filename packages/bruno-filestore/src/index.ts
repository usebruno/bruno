import type { BrunoCollection, BrunoItem, BrunoEnvironment } from '@usebruno/schema-types';

import {
  parseBruRequest,
  parseBruCollection,
  parseBruEnvironment,
  stringifyBruRequest,
  stringifyBruCollection,
  stringifyBruEnvironment
} from './formats/bru';
import {
  parseYmlItem,
  parseYmlCollection,
  parseYmlFolder,
  parseYmlEnvironment,
  stringifyYmlItem,
  stringifyYmlFolder,
  stringifyYmlCollection,
  stringifyYmlEnvironment
} from './formats/yml';
import { dotenvToJson } from '@usebruno/lang';
import BruParserWorker from './workers';
import {
  ParseOptions,
  StringifyOptions,
  CollectionFormat
} from './types';
import { bruRequestParseAndRedactBodyData } from './formats/bru/utils/request-parse-and-redact-body-data';

// request
export const parseRequest = (content: string, options: ParseOptions = { format: 'bru' }): any => {
  if (options.format === 'bru') {
    return parseBruRequest(content);
  } else if (options.format === 'yml') {
    return parseYmlItem(content);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

export const parseRequestAndRedactBody = (content: string, options: ParseOptions = { format: 'bru' }): any => {
  if (options.format === 'bru') {
    return bruRequestParseAndRedactBodyData(content);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

export const stringifyRequest = (requestObj: BrunoItem, options: StringifyOptions = { format: 'bru' }): string => {
  if (options.format === 'bru') {
    return stringifyBruRequest(requestObj);
  } else if (options.format === 'yml') {
    return stringifyYmlItem(requestObj);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

// request via worker
let globalWorkerInstance: BruParserWorker | null = null;
const getWorkerInstance = (): BruParserWorker => {
  if (!globalWorkerInstance) {
    globalWorkerInstance = new BruParserWorker();
  }
  return globalWorkerInstance;
};

export const parseRequestViaWorker = async (content: string, options: { format: CollectionFormat; filename?: string }): Promise<any> => {
  const fileParserWorker = getWorkerInstance();

  return await fileParserWorker.parseRequest(content, options.format);
};

export const stringifyRequestViaWorker = async (requestObj: any, options: { format: CollectionFormat }): Promise<string> => {
  const fileParserWorker = getWorkerInstance();
  return await fileParserWorker.stringifyRequest(requestObj, options.format);
};

// collection
export const parseCollection = (content: string, options: ParseOptions = { format: 'bru' }): any => {
  if (options.format === 'bru') {
    return parseBruCollection(content);
  } else if (options.format === 'yml') {
    return parseYmlCollection(content);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

export const stringifyCollection = (collectionObj: BrunoCollection, brunoConfig: any, options: StringifyOptions = { format: 'bru' }): string => {
  if (options.format === 'bru') {
    return stringifyBruCollection(collectionObj, false);
  } else if (options.format === 'yml') {
    return stringifyYmlCollection(collectionObj, brunoConfig);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

// folder
export const parseFolder = (content: string, options: ParseOptions = { format: 'bru' }): any => {
  if (options.format === 'bru') {
    return parseBruCollection(content);
  } else if (options.format === 'yml') {
    return parseYmlFolder(content);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

export const stringifyFolder = (folderObj: any, options: StringifyOptions = { format: 'bru' }): string => {
  if (options.format === 'bru') {
    return stringifyBruCollection(folderObj, true);
  } else if (options.format === 'yml') {
    return stringifyYmlFolder(folderObj);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

// environment
export const parseEnvironment = (content: string, options: ParseOptions = { format: 'bru' }): any => {
  if (options.format === 'bru') {
    return parseBruEnvironment(content);
  } else if (options.format === 'yml') {
    return parseYmlEnvironment(content);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

export const stringifyEnvironment = (envObj: BrunoEnvironment, options: StringifyOptions = { format: 'bru' }): string => {
  if (options.format === 'bru') {
    return stringifyBruEnvironment(envObj);
  } else if (options.format === 'yml') {
    return stringifyYmlEnvironment(envObj);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};


export const parseDotEnv = (content: string): Record<string, string> => {
  return dotenvToJson(content);
};

export { BruParserWorker };
export * from './types';