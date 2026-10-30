import fs from 'node:fs';
import path from 'node:path';
import type { BrunoCollection, BrunoItem, BrunoEnvironment } from '@usebruno/schema-types';
import { sanitizeName } from '@usebruno/common/utils';
import {
  stringifyRequest,
  stringifyCollection,
  stringifyFolder,
  stringifyEnvironment,
  DEFAULT_COLLECTION_FORMAT
} from '@usebruno/filestore/stringify';
import type { CollectionFormat } from '@usebruno/filestore/stringify';

export interface WriteCollectionOptions {
  format?: CollectionFormat;
}

const SUPPORTED_WRITE_ITEM_TYPES = ['http-request', 'graphql-request', 'grpc-request', 'ws-request'];

const HTTP_ITEM_TYPES = ['http-request', 'graphql-request'];

const COLLECTION_FILE_NAMES: Record<CollectionFormat, string> = {
  bru: 'collection.bru',
  yml: 'opencollection.yml'
};

// Browser bundlers that polyfill Node built-ins (e.g. bruno-app's rsbuild) resolve `node:fs` to an
// empty module, so its functions are missing rather than the import failing.
export const assertFileSystemAvailable = (methodName: string): void => {
  if (typeof fs?.mkdirSync !== 'function') {
    throw new Error(`${methodName} is not supported in browser environment`);
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
  for (const item of items) {
    if (item.type === 'folder') {
      const folderPath = path.join(dirPath, sanitizeName(item.filename || item.name));
      fs.mkdirSync(folderPath, { recursive: true });

      if (item.root?.meta?.name) {
        const folderRoot = typeof item.seq === 'number'
          ? { ...item.root, meta: { ...item.root.meta, seq: item.seq } }
          : item.root;
        fs.writeFileSync(path.join(folderPath, `folder.${format}`), stringifyFolder(folderRoot, { format }));
      }

      writeItems(item.items || [], folderPath, format);
    } else if (SUPPORTED_WRITE_ITEM_TYPES.includes(item.type)) {
      const filename = withExtension(sanitizeName(item.filename || `${item.name}.${format}`), format);
      fs.writeFileSync(path.join(dirPath, filename), stringifyRequest(normalizeRequestItem(item), { format }));
    } else {
      throw new Error(`Unsupported item type: ${item.type}`);
    }
  }
};

const writeCollection = async (
  collection: BrunoCollection,
  outputDir: string,
  format: CollectionFormat
): Promise<string> => {
  if (!COLLECTION_FILE_NAMES[format]) {
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

  // TODO: remove the manual cast once the stringifyCollection accepts the proper interface.
  // filestore types this parameter as a whole collection, but its stringifiers read the root.
  const collectionRoot = (collection.root || {}) as unknown as BrunoCollection;
  fs.writeFileSync(
    path.join(outputDir, COLLECTION_FILE_NAMES[format]),
    stringifyCollection(collectionRoot, brunoConfig, { format })
  );

  const environments = collection.environments || [];
  if (environments.length) {
    const envDirPath = path.join(outputDir, 'environments');
    fs.mkdirSync(envDirPath, { recursive: true });
    for (const env of environments) {
      fs.writeFileSync(path.join(envDirPath, sanitizeName(`${env.name}.${format}`)), stringifyEnvironment(env, { format }));
    }
  }

  writeItems(collection.items || [], outputDir, format);

  return outputDir;
};

/**
 * Writes a collection (as returned by `@usebruno/converters`) to `outputDir` as a Bruno
 * collection directory in the default (`yml`) format. `outputDir` is created if missing and must
 * otherwise be empty.
 */
export const writeCollectionToDisk = async (collection: BrunoCollection, outputDir: string): Promise<string> => {
  assertFileSystemAvailable('writeCollectionToDisk');
  return writeCollection(collection, outputDir, DEFAULT_COLLECTION_FORMAT);
};

/**
 * Same as `writeCollectionToDisk`, but lets the caller pick the on-disk format.
 */
export const writeCollectionToDiskLegacy = async (
  collection: BrunoCollection,
  outputDir: string,
  options: WriteCollectionOptions = {}
): Promise<string> => {
  assertFileSystemAvailable('writeCollectionToDiskLegacy');
  return writeCollection(collection, outputDir, options.format || DEFAULT_COLLECTION_FORMAT);
};
