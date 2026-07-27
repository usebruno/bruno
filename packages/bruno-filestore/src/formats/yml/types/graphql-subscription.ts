/**
 * GraphQL subscription request definitions.
 *
 * @opencollection/types has no subscription request kind yet (only GraphQLRequest,
 * WebSocketRequest, GrpcRequest). These shapes mirror that package's naming convention
 * so an upstream `GraphQLSubscriptionRequest` can drop in later with minimal churn.
 */
import type { Auth } from '@opencollection/types/common/auth';
import type { Description } from '@opencollection/types/common/description';
import type { Tag } from '@opencollection/types/common/tags';
import type { HttpRequestHeader } from '@opencollection/types/requests/http';
import type { GraphQLBody } from '@opencollection/types/requests/graphql';

export type { GraphQLBody };

export interface GraphQLSubscriptionRequestSettings {
  timeout?: number | 'inherit';
  keepAliveInterval?: number | 'inherit';
}

export interface GraphQLSubscriptionRequestInfo {
  name?: string;
  description?: Description;
  type?: 'graphql-subscription';
  seq?: number;
  tags?: Tag[];
}

export interface GraphQLSubscriptionRequestDetails {
  url?: string;
  headers?: HttpRequestHeader[];
  body?: GraphQLBody;
  auth?: Auth;
  connectionParams?: string;
}

export interface GraphQLSubscriptionRequest {
  info?: GraphQLSubscriptionRequestInfo;
  graphqlSubscription?: GraphQLSubscriptionRequestDetails;
  settings?: GraphQLSubscriptionRequestSettings;
  docs?: string;
}
