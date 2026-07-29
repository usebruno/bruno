import { uuid } from '../../common/index.js';
import {
  fromOpenCollectionHeaders,
  toOpenCollectionHeaders,
  fromOpenCollectionAuth,
  toOpenCollectionAuth
} from '../common';
import type {
  Auth,
  BrunoItem,
  BrunoKeyValue,
  GraphQLBody
} from '../types';

/**
 * @opencollection/types has no subscription request kind yet (only GraphQLRequest,
 * WebSocketRequest, GrpcRequest). These shapes mirror that package's naming convention,
 * matching the local shim in bruno-filestore's yml layer, so an upstream
 * `GraphQLSubscriptionRequest` can drop in later with minimal churn.
 */
interface GraphQLSubscriptionRequestInfo {
  name?: string;
  type?: 'graphql-subscription';
  seq?: number;
  tags?: string[];
}

interface GraphQLSubscriptionRequestDetails {
  url?: string;
  headers?: unknown[];
  body?: GraphQLBody;
  auth?: Auth;
  connectionParams?: string;
}

interface GraphQLSubscriptionRequestSettings {
  timeout?: number;
  keepAliveInterval?: number;
}

export interface GraphQLSubscriptionRequest {
  info?: GraphQLSubscriptionRequestInfo;
  graphqlSubscription?: GraphQLSubscriptionRequestDetails;
  settings?: GraphQLSubscriptionRequestSettings;
  docs?: string;
}

export const fromOpenCollectionGraphQLSubscriptionItem = (item: GraphQLSubscriptionRequest): BrunoItem => {
  const info = item.info || {};
  const graphqlSubscription = item.graphqlSubscription || {};

  const brunoItem: BrunoItem = {
    uid: uuid(),
    type: 'graphql-subscription-request',
    name: info.name || 'Untitled Request',
    seq: info.seq || 1,
    request: {
      url: graphqlSubscription.url || '',
      headers: fromOpenCollectionHeaders(graphqlSubscription.headers as Parameters<typeof fromOpenCollectionHeaders>[0]),
      body: {
        mode: 'graphql',
        graphql: {
          query: graphqlSubscription.body?.query || '',
          variables: graphqlSubscription.body?.variables || ''
        }
      },
      auth: fromOpenCollectionAuth(graphqlSubscription.auth),
      connectionParams: graphqlSubscription.connectionParams || null,
      docs: item.docs || ''
    } as any,
    settings: {
      timeout: item.settings?.timeout ?? 0,
      keepAliveInterval: item.settings?.keepAliveInterval ?? 0
    } as any
  };

  if (info.tags?.length) {
    brunoItem.tags = info.tags;
  }

  return brunoItem;
};

export const toOpenCollectionGraphQLSubscriptionItem = (item: BrunoItem): GraphQLSubscriptionRequest => {
  const request = (item.request || {}) as Record<string, unknown>;

  const info: GraphQLSubscriptionRequestInfo = {
    name: item.name || 'Untitled Request',
    type: 'graphql-subscription'
  };

  if (item.seq) {
    info.seq = item.seq;
  }

  if (item.tags?.length) {
    info.tags = item.tags;
  }

  const graphqlSubscription: GraphQLSubscriptionRequestDetails = {
    url: (request.url as string) || ''
  };

  const headers = toOpenCollectionHeaders(request.headers as BrunoKeyValue[]);
  if (headers) {
    graphqlSubscription.headers = headers;
  }

  const body = request.body as { mode?: string; graphql?: GraphQLBody } | undefined;
  if (body?.mode === 'graphql' && (body.graphql?.query || body.graphql?.variables)) {
    graphqlSubscription.body = {
      ...(body.graphql?.query ? { query: body.graphql.query } : {}),
      ...(body.graphql?.variables ? { variables: body.graphql.variables } : {})
    };
  }

  const auth = toOpenCollectionAuth(request.auth as Parameters<typeof toOpenCollectionAuth>[0]);
  if (auth) {
    graphqlSubscription.auth = auth;
  }

  if (request.connectionParams) {
    graphqlSubscription.connectionParams = request.connectionParams as string;
  }

  const ocRequest: GraphQLSubscriptionRequest = {
    info,
    graphqlSubscription
  };

  const settings = item.settings as { timeout?: number; keepAliveInterval?: number } | undefined;
  if (settings) {
    ocRequest.settings = {
      timeout: settings.timeout ?? 0,
      keepAliveInterval: settings.keepAliveInterval ?? 0
    };
  }

  if (request.docs) {
    ocRequest.docs = request.docs as string;
  }

  return ocRequest;
};
