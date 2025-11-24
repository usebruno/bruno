import type { Item as BrunoItem } from '@usebruno/schema-types/collection/item';
import type { Item } from '@opencollection/types/collection/item';
import { parseYml } from './utils';
import parseHttpRequest from './items/parseHttpRequest';
import parseGraphQLRequest from './items/parseGraphQLRequest';
import parseGrpcRequest from './items/parseGrpcRequest';
import parseWebsocketRequest from './items/parseWebsocketRequest';
import parseScript from './items/parseScript';

const parseItem = (ymlString: string): BrunoItem => {
  try {
    const ocItem: Item = parseYml(ymlString);

    if (!ocItem || !ocItem.type) {
      throw new Error('Invalid item: missing type');
    }

    switch (ocItem.type) {
      case 'http':
        return parseHttpRequest(ocItem);

      case 'graphql':
        return parseGraphQLRequest(ocItem);

      case 'grpc':
        return parseGrpcRequest(ocItem);

      case 'websocket':
        return parseWebsocketRequest(ocItem);

      case 'script':
        return parseScript(ocItem);

      case 'folder':
        throw new Error('Folder items should be handled separately using parseFolder');

      default:
        throw new Error(`Unsupported item type: ${(ocItem as any).type}`);
    }
  } catch (error) {
    console.error('Error parsing item:', error);
    throw error;
  }
};

export default parseItem;
