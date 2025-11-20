import {
  bruRequestToJson,
  jsonRequestToBru,
  bruCollectionToJson,
  jsonCollectionToBru,
  bruEnvironmentToJson,
  jsonEnvironmentToBru
} from './formats/bru';
import {
  yamlRequestToJson,
  jsonRequestToYaml,
  yamlCollectionToJson,
  jsonCollectionToYaml,
  yamlFolderToJson,
  jsonFolderToYaml,
  yamlEnvironmentToJson,
  jsonEnvironmentToYaml,
  yamlOpenCollectionToJson,
  jsonToYamlOpenCollection
} from './formats/yaml';
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
    return bruRequestToJson(content);
  } else if (options.format === 'yaml') {
    return yamlRequestToJson(content);
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
  } else if (options.format === 'yaml') {
    return jsonRequestToYaml(requestObj);
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

// Helper function to detect format from file extension
export const detectFormatFromExtension = (filename: string): 'bru' | 'yaml' => {
  const ext = filename.toLowerCase();
  if (ext.endsWith('.yml') || ext.endsWith('.yaml')) {
    return 'yaml';
  }
  return 'bru';
};

// Helper function to detect format from content (basic heuristic)
export const detectFormatFromContent = (content: string): 'bru' | 'yaml' => {
  const trimmed = content.trim();
  // YAML typically starts with meta: or has key: value structure
  if (trimmed.includes('meta:') && (trimmed.includes('http:') || trimmed.includes('graphql:'))) {
    return 'yaml';
  }
  return 'bru';
};

export const parseRequestViaWorker = async (content: string, options?: { format?: 'bru' | 'yaml' | 'auto'; filename?: string }): Promise<any> => {
  const fileParserWorker = getWorkerInstance();
  let format: 'bru' | 'yaml' = 'bru';

  if (options?.format === 'auto') {
    if (options.filename) {
      format = detectFormatFromExtension(options.filename);
    } else {
      format = detectFormatFromContent(content);
    }
  } else if (options?.format) {
    format = options.format;
  }

  return await fileParserWorker.parseRequest(content, format);
};

export const stringifyRequestViaWorker = async (requestObj: any, options?: { format?: 'bru' | 'yaml' }): Promise<string> => {
  const fileParserWorker = getWorkerInstance();
  const format = options?.format || 'bru';
  return await fileParserWorker.stringifyRequest(requestObj, format);
};

export const parseCollection = (content: string, options: ParseOptions = { format: 'bru' }): any => {
  if (options.format === 'bru') {
    return bruCollectionToJson(content);
  } else if (options.format === 'yaml') {
    return yamlCollectionToJson(content);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

export const stringifyCollection = (collectionObj: ParsedCollection, options: StringifyOptions = { format: 'bru' }): string => {
  if (options.format === 'bru') {
    return jsonCollectionToBru(collectionObj, false);
  } else if (options.format === 'yaml') {
    return jsonCollectionToYaml(collectionObj);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

export const parseFolder = (content: string, options: ParseOptions = { format: 'bru' }): any => {
  if (options.format === 'bru') {
    return bruCollectionToJson(content);
  } else if (options.format === 'yaml') {
    return yamlFolderToJson(content);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

export const stringifyFolder = (folderObj: any, options: StringifyOptions = { format: 'bru' }): string => {
  if (options.format === 'bru') {
    return jsonCollectionToBru(folderObj, true);
  } else if (options.format === 'yaml') {
    return jsonFolderToYaml(folderObj);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

export const parseEnvironment = (content: string, options: ParseOptions = { format: 'bru' }): any => {
  if (options.format === 'bru') {
    return bruEnvironmentToJson(content);
  } else if (options.format === 'yaml') {
    return yamlEnvironmentToJson(content);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

export const stringifyEnvironment = (envObj: ParsedEnvironment, options: StringifyOptions = { format: 'bru' }): string => {
  if (options.format === 'bru') {
    return jsonEnvironmentToBru(envObj);
  } else if (options.format === 'yaml') {
    return jsonEnvironmentToYaml(envObj);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};


export const parseDotEnv = (content: string): Record<string, string> => {
  return dotenvToJson(content);
};

/**
 * Parse opencollection.yml (root collection configuration file)
 * Combines bruno.json + collection.yml into a single file for YAML collections
 */
export const parseOpenCollection = (content: string): any => {
  return yamlOpenCollectionToJson(content);
};

/**
 * Stringify opencollection.yml from bruno.json + collection root
 */
export const stringifyOpenCollection = (brunoConfig: any, collectionRoot: any = {}): string => {
  return jsonToYamlOpenCollection(brunoConfig, collectionRoot);
};

export { BruParserWorker };
export * from './types';