import type { Item as BrunoItem } from '@usebruno/schema-types/collection/item';
import stringifyHttpRequest from './items/stringifyHttpRequest';
import stringifyGraphqlRequest from './items/stringifyGraphQLRequest';
import stringifyGrpcRequest from './items/stringifyGrpcRequest';
import stringifyWebsocketRequest from './items/stringifyWebsocketRequest';
import stringifyScript from './items/stringifyScript';

const stringifyItem = (item: BrunoItem): string => {
  try {
    switch (item.type) {
      case 'http-request':
        return stringifyHttpRequest(item);

      case 'graphql-request':
        return stringifyGraphqlRequest(item);

      case 'grpc-request':
        return stringifyGrpcRequest(item);

      case 'ws-request':
        return stringifyWebsocketRequest(item);

      case 'js':
        return stringifyScript(item);

      case 'folder':
        throw new Error('Folder items should be handled separately using stringifyFolder');

      default:
        throw new Error(`Unsupported item type: ${item.type}`);
    }
  } catch (error) {
    console.error('Error stringifying item:', error);
    throw error;
  }
};
export default stringifyItem;
