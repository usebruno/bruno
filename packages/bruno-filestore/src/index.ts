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

export const parseRequest = (content: string, options: ParseOptions = { format: 'bru' }): any => {
  if (options.format === 'bru') {
    return bruRequestToJson(content);
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
let cleanupHandlersRegistered = false;

const getWorkerInstance = (): BruParserWorker => {
  if (!globalWorkerInstance) {
    globalWorkerInstance = new BruParserWorker();
    
    if (!cleanupHandlersRegistered) {
      const cleanup = async () => {
        if (globalWorkerInstance) {
          await globalWorkerInstance.cleanup();
          globalWorkerInstance = null;
        }
      };

      // Handle various exit scenarios
      process.on('exit', () => {
        // Note: async operations won't work in 'exit' event
        // We handle termination in other events
      });
      
      process.on('SIGINT', async () => {
        await cleanup();
        process.exit(0);
      });
      
      process.on('SIGTERM', async () => {
        await cleanup();
        process.exit(0);
      });
      
      process.on('uncaughtException', async (error: Error) => {
        console.error('Uncaught Exception:', error);
        await cleanup();
        process.exit(1);
      });
      
      process.on('unhandledRejection', async (reason: unknown) => {
        console.error('Unhandled Rejection:', reason);
        await cleanup();
        process.exit(1);
      });

      cleanupHandlersRegistered = true;
    }
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