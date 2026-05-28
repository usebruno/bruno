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

/**
 * In v3.0.0-rc1 release auth was present under runtime property for all requests
 * This has now been moved to the respective request properties
 * This backward compatibility has been put in place for folks who tried out our early preview
 * Should be safe to remove this in 3 months. Delete after 5 Apr 2026
 */
const ensureAuthV3Rc1BackwardsCompatibility = (parsedItemYml: any): any => {
  const itemType = parsedItemYml?.info?.type;

  switch (itemType) {
    case 'http':
      if (parsedItemYml.runtime?.auth && !parsedItemYml.http?.auth) {
        parsedItemYml.http.auth = parsedItemYml.runtime.auth;
      }
      break;
    case 'graphql':
      if (parsedItemYml.runtime?.auth && !parsedItemYml.graphql?.auth) {
        parsedItemYml.graphql.auth = parsedItemYml.runtime.auth;
      }
      break;
    case 'grpc':
      if (parsedItemYml.runtime?.auth && !parsedItemYml.grpc?.auth) {
        parsedItemYml.grpc.auth = parsedItemYml.runtime.auth;
      }
      break;
    case 'websocket':
      if (parsedItemYml.runtime?.auth && !parsedItemYml.websocket?.auth) {
        parsedItemYml.websocket.auth = parsedItemYml.runtime.auth;
      }
      break;
    default:
      break;
  }

  return parsedItemYml;
};

const parseItem = (ymlString: string): BrunoItem => {
  try {
    const parsedYml = parseYml(ymlString);

    const ocItem: Item = ensureAuthV3Rc1BackwardsCompatibility(parsedYml);
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
