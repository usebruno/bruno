import type { BrunoCollection, BrunoItem, BrunoEnvironment } from '@usebruno/schema-types';

import {
  stringifyBruRequest,
  stringifyBruCollection,
  stringifyBruEnvironment
} from './formats/bru';
import {
  stringifyYmlItem,
  stringifyYmlFolder,
  stringifyYmlCollection,
  stringifyYmlEnvironment
} from './formats/yml';
import { StringifyOptions } from './types';
import { DEFAULT_COLLECTION_FORMAT } from './constants';

export const stringifyRequest = (requestObj: BrunoItem, options: StringifyOptions = { format: DEFAULT_COLLECTION_FORMAT }): string => {
  if (options.format === 'bru') {
    return stringifyBruRequest(requestObj);
  } else if (options.format === 'yml') {
    return stringifyYmlItem(requestObj);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

export const stringifyCollection = (collectionObj: BrunoCollection, brunoConfig: any, options: StringifyOptions = { format: DEFAULT_COLLECTION_FORMAT }): string => {
  if (options.format === 'bru') {
    return stringifyBruCollection(collectionObj, false);
  } else if (options.format === 'yml') {
    return stringifyYmlCollection(collectionObj, brunoConfig);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

export const stringifyFolder = (folderObj: any, options: StringifyOptions = { format: DEFAULT_COLLECTION_FORMAT }): string => {
  if (options.format === 'bru') {
    return stringifyBruCollection(folderObj, true);
  } else if (options.format === 'yml') {
    return stringifyYmlFolder(folderObj);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

export const stringifyEnvironment = (envObj: BrunoEnvironment, options: StringifyOptions = { format: DEFAULT_COLLECTION_FORMAT }): string => {
  if (options.format === 'bru') {
    return stringifyBruEnvironment(envObj);
  } else if (options.format === 'yml') {
    return stringifyYmlEnvironment(envObj);
  }
  throw new Error(`Unsupported format: ${options.format}`);
};

export { DEFAULT_COLLECTION_FORMAT };
export type { CollectionFormat, StringifyOptions } from './types';
