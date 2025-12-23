import { uuid } from '../../common/index.js';
import { fromOpenCollectionHttpItem, toOpenCollectionHttpItem } from './http';
import { fromOpenCollectionGraphqlItem, toOpenCollectionGraphqlItem } from './graphql';
import { fromOpenCollectionGrpcItem, toOpenCollectionGrpcItem } from './grpc';
import { fromOpenCollectionWebsocketItem, toOpenCollectionWebsocketItem } from './websocket';
import type {
  Item,
  HttpRequest,
  GraphQLRequest,
  GrpcRequest,
  WebSocketRequest,
  Folder,
  ScriptFile,
  BrunoItem
} from '../types';

const getItemType = (item: Item): string => {
  if ('type' in item && item.type === 'script') {
    return 'script';
  }

  if ('info' in item && item.info) {
    const info = item.info as { type?: string };
    if (info.type) {
      return info.type;
    }
  }

  if ('http' in item) {
    return 'http';
  }

  if ('graphql' in item) {
    return 'graphql';
  }

  if ('grpc' in item) {
    return 'grpc';
  }

  if ('websocket' in item) {
    return 'websocket';
  }

  if ('items' in item) {
    return 'folder';
  }

  return 'unknown';
};

export const fromOpenCollectionItem = (item: Item, parseFolder: (folder: Folder) => BrunoItem): BrunoItem | null => {
  const itemType = getItemType(item);

  switch (itemType) {
    case 'http':
      return fromOpenCollectionHttpItem(item as HttpRequest);
    case 'graphql':
      return fromOpenCollectionGraphqlItem(item as GraphQLRequest);
    case 'grpc':
      return fromOpenCollectionGrpcItem(item as GrpcRequest);
    case 'websocket':
      return fromOpenCollectionWebsocketItem(item as WebSocketRequest);
    case 'folder':
      return parseFolder(item as Folder);
    case 'script': {
      const scriptFile = item as ScriptFile;
      return {
        uid: uuid(),
        type: 'js',
        name: 'script.js',
        fileContent: scriptFile.script || ''
      };
    }
    default:
      return null;
  }
};

export const toOpenCollectionItem = (item: BrunoItem, stringifyFolder: (folder: BrunoItem) => Folder): Item | null => {
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
        type: 'script',
        script: item.fileContent || ''
      };
    default:
      return null;
  }
};

export const fromOpenCollectionItems = (items: Item[] | undefined, parseFolder: (folder: Folder) => BrunoItem): BrunoItem[] => {
  return (items || [])
    .map((item) => fromOpenCollectionItem(item, parseFolder))
    .filter((item): item is BrunoItem => item !== null);
};

export const toOpenCollectionItems = (items: BrunoItem[] | undefined | null, stringifyFolder: (folder: BrunoItem) => Folder): Item[] => {
  return (items || [])
    .map((item) => toOpenCollectionItem(item, stringifyFolder))
    .filter((item): item is Item => item !== null);
};

export { fromOpenCollectionHttpItem, toOpenCollectionHttpItem } from './http';
export { fromOpenCollectionGraphqlItem, toOpenCollectionGraphqlItem } from './graphql';
export { fromOpenCollectionGrpcItem, toOpenCollectionGrpcItem } from './grpc';
export { fromOpenCollectionWebsocketItem, toOpenCollectionWebsocketItem } from './websocket';
