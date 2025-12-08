import type { Item as BrunoItem } from '@usebruno/schema-types/collection/item';
import type { Item, ScriptFile } from '@opencollection/types/collection/item';
import type { HttpRequest } from '@opencollection/types/requests/http';
import type { GraphQLRequest } from '@opencollection/types/requests/graphql';
import type { GrpcRequest } from '@opencollection/types/requests/grpc';
import type { WebSocketRequest } from '@opencollection/types/requests/websocket';
import { parseYml } from './utils';
import parseHttpRequest from './items/parseHttpRequest';
import parseGraphQLRequest from './items/parseGraphQLRequest';
import parseGrpcRequest from './items/parseGrpcRequest';
import parseWebsocketRequest from './items/parseWebsocketRequest';
import parseScript from './items/parseScript';

// Helper to get the type from an item (now in info block)
const getItemType = (item: Item): string | undefined => {
  if ('info' in item && item.info && 'type' in item.info) {
    return item.info.type;
  }
  // For ScriptFile which still has type at root
  if ('type' in item) {
    return (item as ScriptFile).type;
  }
  return undefined;
};

const parseItem = (ymlString: string): BrunoItem => {
  try {
    const ocItem: Item = parseYml(ymlString);
    const itemType = getItemType(ocItem);

    if (!ocItem || !itemType) {
      throw new Error('Invalid item: missing type');
    }

    switch (itemType) {
      case 'http':
        return parseHttpRequest(ocItem as HttpRequest);

      case 'graphql':
        return parseGraphQLRequest(ocItem as GraphQLRequest);

      case 'grpc':
        return parseGrpcRequest(ocItem as GrpcRequest);

      case 'websocket':
        return parseWebsocketRequest(ocItem as WebSocketRequest);

      case 'script':
        return parseScript(ocItem as ScriptFile);

      case 'folder':
        throw new Error('Folder items should be handled separately using parseFolder');

      default:
        throw new Error(`Unsupported item type: ${itemType}`);
    }
  } catch (error) {
    console.error('Error parsing item:', error);
    throw error;
  }
};

export default parseItem;
