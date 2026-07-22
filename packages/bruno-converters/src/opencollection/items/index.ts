import { uuid } from '../../common/index.js';
import { fromOpenCollectionHttpItem, toOpenCollectionHttpItem } from './http';
import { fromOpenCollectionGraphqlItem, toOpenCollectionGraphqlItem } from './graphql';
import { fromOpenCollectionGrpcItem, toOpenCollectionGrpcItem } from './grpc';
import { fromOpenCollectionWebsocketItem, toOpenCollectionWebsocketItem } from './websocket';
import type {
  BrunoItem
} from '../types';

interface OCItem {
  info?: {
    type?: string;
    name?: string;
    seq?: number;
  };
  http?: unknown;
  graphql?: unknown;
  grpc?: unknown;
  websocket?: unknown;
  items?: unknown[];
  script?: string;
}

const getItemType = (item: OCItem): string => {
  if (item.info?.type) {
    return item.info.type;
  }

  if ('items' in item && item.items) {
    return 'folder';
  }

  if ('http' in item && item.http) {
    return 'http';
  }

  if ('graphql' in item && item.graphql) {
    return 'graphql';
  }

  if ('grpc' in item && item.grpc) {
    return 'grpc';
  }

  if ('websocket' in item && item.websocket) {
    return 'websocket';
  }

  if ('script' in item && typeof item.script === 'string') {
    return 'script';
  }

  return 'unknown';
};

export const fromOpenCollectionItem = (item: unknown, parseFolder: (folder: unknown) => BrunoItem): BrunoItem | null => {
  const ocItem = item as OCItem;
  const itemType = getItemType(ocItem);

  switch (itemType) {
    case 'http':
      return fromOpenCollectionHttpItem(item as Parameters<typeof fromOpenCollectionHttpItem>[0]);
    case 'graphql':
      return fromOpenCollectionGraphqlItem(item as Parameters<typeof fromOpenCollectionGraphqlItem>[0]);
    case 'grpc':
      return fromOpenCollectionGrpcItem(item as Parameters<typeof fromOpenCollectionGrpcItem>[0]);
    case 'websocket':
      return fromOpenCollectionWebsocketItem(item as Parameters<typeof fromOpenCollectionWebsocketItem>[0]);
    case 'folder':
      return parseFolder(item);
    case 'script': {
      const scriptItem = item as { script?: string; info?: { name?: string } };
      return {
        uid: uuid(),
        type: 'js',
        name: scriptItem.info?.name || 'script.js',
        fileContent: scriptItem.script || ''
      };
    }
    default:
      return null;
  }
};

export const toOpenCollectionItem = (item: BrunoItem, stringifyFolder: (folder: BrunoItem) => unknown): unknown | null => {
  switch (item.type) {
    case 'http-request':
      return toOpenCollectionHttpItem(item);
    case 'graphql-request':
      return toOpenCollectionGraphqlItem(item);
    case 'grpc-request':
      return toOpenCollectionGrpcItem(item);
    case 'ws-request':
      return toOpenCollectionWebsocketItem(item);
    case 'folder':
      return stringifyFolder(item);
    case 'js':
      return {
        info: {
          name: item.name || 'script.js',
          type: 'script'
        },
        script: item.fileContent || ''
      };
    default:
      return null;
  }
};

export const fromOpenCollectionItems = (items: unknown[] | undefined, parseFolder: (folder: unknown) => BrunoItem): BrunoItem[] => {
  return (items || [])
    .map((item) => fromOpenCollectionItem(item, parseFolder))
    .filter((item): item is BrunoItem => item !== null);
};

export const toOpenCollectionItems = (items: BrunoItem[] | undefined | null, stringifyFolder: (folder: BrunoItem) => unknown): unknown[] => {
  return (items || [])
    .map((item) => toOpenCollectionItem(item, stringifyFolder))
    .filter((item): item is unknown => item !== null);
};

export { fromOpenCollectionHttpItem, toOpenCollectionHttpItem } from './http';
export { fromOpenCollectionGraphqlItem, toOpenCollectionGraphqlItem } from './graphql';
export { fromOpenCollectionGrpcItem, toOpenCollectionGrpcItem } from './grpc';
export { fromOpenCollectionWebsocketItem, toOpenCollectionWebsocketItem } from './websocket';
