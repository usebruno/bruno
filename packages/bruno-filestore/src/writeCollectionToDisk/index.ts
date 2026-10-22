import fs from 'node:fs';
import path from 'node:path';
import type { BrunoCollection, BrunoItem, BrunoEnvironment } from '@usebruno/schema-types';
import type { FolderRoot } from '@usebruno/schema-types/collection/folder';
import { sanitizeName } from '@usebruno/common/utils';
import {
  stringifyBruRequest,
  stringifyBruCollection,
  stringifyBruEnvironment
} from '../formats/bru';
import {
  stringifyYmlItem,
  stringifyYmlFolder,
  stringifyYmlCollection,
  stringifyYmlEnvironment
} from '../formats/yml';
import { DEFAULT_COLLECTION_FORMAT } from '../constants';
import type { CollectionFormat, WriteCollectionOptions } from '../types';

const SUPPORTED_WRITE_ITEM_TYPES = ['http-request', 'graphql-request', 'grpc-request', 'ws-request'];

const HTTP_ITEM_TYPES = ['http-request', 'graphql-request'];

interface FormatWriter {
  collectionFile: string;
  stringifyCollection: (collectionRoot: FolderRoot, brunoConfig: Record<string, unknown>) => string;
  stringifyFolder: (folderRoot: FolderRoot) => string;
  stringifyRequest: (item: BrunoItem) => string;
  stringifyEnvironment: (environment: BrunoEnvironment) => string;
}

const FORMAT_WRITERS: Record<CollectionFormat, FormatWriter> = {
  bru: {
    collectionFile: 'collection.bru',
    stringifyCollection: (collectionRoot) => stringifyBruCollection(collectionRoot, false),
    stringifyFolder: (folderRoot) => stringifyBruCollection(folderRoot, true),
    stringifyRequest: stringifyBruRequest,
    stringifyEnvironment: stringifyBruEnvironment
  },
  yml: {
    collectionFile: 'opencollection.yml',
    stringifyCollection: stringifyYmlCollection,
    stringifyFolder: stringifyYmlFolder,
    stringifyRequest: stringifyYmlItem,
    stringifyEnvironment: stringifyYmlEnvironment
  }
};

const withExtension = (filename: string, ext: string): string => {
  return filename.endsWith(`.${ext}`) ? filename : `${filename}.${ext}`;
};

// Converters emit sparse request objects; fill what the serializers expect without dropping
// anything the item already carries.
const normalizeRequestItem = (item: BrunoItem): BrunoItem => {
  const request: Record<string, any> = item.request || {};

  return {
    ...item,
    seq: typeof item.seq === 'number' ? item.seq : 1,
    tags: item.tags || [],
    settings: item.settings || {},
    examples: item.examples || [],
    request: {
      ...request,
      ...(HTTP_ITEM_TYPES.includes(item.type) && { method: request.method || 'GET' }),
      url: request.url || '',
      headers: request.headers || [],
      params: request.params || [],
      auth: request.auth || {},
      body: request.body || {},
      script: request.script || {},
      vars: request.vars || { req: [], res: [] },
      assertions: request.assertions || [],
      tests: request.tests || '',
      docs: request.docs || ''
    }
  } as BrunoItem;
};

const writeItems = (items: BrunoItem[], dirPath: string, format: CollectionFormat): void => {
  const writer = FORMAT_WRITERS[format];

  for (const item of items) {
    if (item.type === 'folder') {
      const folderPath = path.join(dirPath, sanitizeName(item.filename || item.name));
      fs.mkdirSync(folderPath, { recursive: true });

      if (item.root?.meta?.name) {
        const folderRoot = typeof item.seq === 'number'
          ? { ...item.root, meta: { ...item.root.meta, seq: item.seq } }
          : item.root;
        fs.writeFileSync(path.join(folderPath, `folder.${format}`), writer.stringifyFolder(folderRoot));
      }

      writeItems(item.items || [], folderPath, format);
    } else if (SUPPORTED_WRITE_ITEM_TYPES.includes(item.type)) {
      const filename = withExtension(sanitizeName(item.filename || `${item.name}.${format}`), format);
      fs.writeFileSync(path.join(dirPath, filename), writer.stringifyRequest(normalizeRequestItem(item)));
    } else {
      throw new Error(`Unsupported item type: ${item.type}`);
    }
  }
};

/**
 * Writes a collection (as returned by `@usebruno/converters`) to `outputDir` as a Bruno
 * collection directory. `outputDir` is created if missing and must otherwise be empty.
 */
export const writeCollectionToDisk = async (
  collection: BrunoCollection,
  outputDir: string,
  options: WriteCollectionOptions = {}
): Promise<string> => {
  const { format = DEFAULT_COLLECTION_FORMAT } = options;
  const writer = FORMAT_WRITERS[format];
  if (!writer) {
    throw new Error(`Unsupported format: ${format}`);
  }

  const brunoConfig: Record<string, unknown> = {
    version: '1',
    name: collection.name,
    type: 'collection',
    ignore: ['node_modules', '.git']
  };
  if (format === 'yml') {
    brunoConfig.opencollection = '1.0.0';
  }

  fs.mkdirSync(outputDir, { recursive: true });
  if (fs.readdirSync(outputDir).length > 0) {
    throw Object.assign(new Error(`Output directory is not empty: ${outputDir}`), { code: 'ENOTEMPTY' });
  }

  if (format === 'bru') {
    fs.writeFileSync(path.join(outputDir, 'bruno.json'), JSON.stringify(brunoConfig, null, 2));
  }
  fs.writeFileSync(
    path.join(outputDir, writer.collectionFile),
    writer.stringifyCollection(collection.root || {}, brunoConfig)
  );

  const environments = collection.environments || [];
  if (environments.length) {
    const envDirPath = path.join(outputDir, 'environments');
    fs.mkdirSync(envDirPath, { recursive: true });
    for (const env of environments) {
      fs.writeFileSync(path.join(envDirPath, sanitizeName(`${env.name}.${format}`)), writer.stringifyEnvironment(env));
    }
  }

  writeItems(collection.items || [], outputDir, format);

  return outputDir;
};
