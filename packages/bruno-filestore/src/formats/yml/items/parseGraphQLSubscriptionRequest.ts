import type { Item as BrunoItem } from '@usebruno/schema-types/collection/item';
import type { GraphqlSubscriptionRequest as BrunoGraphqlSubscriptionRequest } from '@usebruno/schema-types/requests/graphql-subscription';
import type { GraphQLSubscriptionRequest, GraphQLBody } from '../types/graphql-subscription';
import { toBrunoAuth } from '../common/auth';
import { toBrunoHttpHeaders } from '../common/headers';
import { uuid, ensureString } from '../../../utils';

const parseGraphQLSubscriptionRequest = (ocRequest: GraphQLSubscriptionRequest): BrunoItem => {
  const info = ocRequest.info;
  const graphqlSubscription = ocRequest.graphqlSubscription;

  const brunoRequest: BrunoGraphqlSubscriptionRequest = {
    url: ensureString(graphqlSubscription?.url),
    headers: toBrunoHttpHeaders(graphqlSubscription?.headers) || [],
    auth: toBrunoAuth(graphqlSubscription?.auth),
    body: {
      mode: 'graphql',
      graphql: {
        query: (graphqlSubscription?.body as GraphQLBody)?.query || '',
        variables: (graphqlSubscription?.body as GraphQLBody)?.variables || ''
      }
    },
    connectionParams: graphqlSubscription?.connectionParams || null,
    docs: null
  };

  // docs
  if (ocRequest.docs) {
    brunoRequest.docs = ocRequest.docs;
  }

  // settings
  const settings: Record<string, number> = {
    timeout: 0,
    keepAliveInterval: 0
  };

  if (ocRequest.settings) {
    if (typeof ocRequest.settings.timeout === 'number') {
      settings.timeout = ocRequest.settings.timeout;
    }
    if (typeof ocRequest.settings.keepAliveInterval === 'number') {
      settings.keepAliveInterval = ocRequest.settings.keepAliveInterval;
    }
  }

  // bruno item
  const brunoItem: BrunoItem = {
    uid: uuid(),
    type: 'graphql-subscription-request',
    seq: info?.seq || 1,
    name: ensureString(info?.name, 'Untitled Request'),
    tags: info?.tags || [],
    request: brunoRequest as any,
    settings: settings as any,
    fileContent: null,
    root: null,
    items: [],
    examples: [],
    filename: null,
    pathname: null
  };

  // description
  if (info?.description) {
    const desc = typeof info.description === 'string' ? info.description : (info.description as any)?.content || '';
    if (desc.trim().length) {
      brunoItem.description = desc;
    }
  }

  return brunoItem;
};

export default parseGraphQLSubscriptionRequest;
