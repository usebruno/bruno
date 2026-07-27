import type { Item as BrunoItem } from '@usebruno/schema-types/collection/item';
import type { GraphqlSubscriptionRequest as BrunoGraphqlSubscriptionRequest } from '@usebruno/schema-types/requests/graphql-subscription';
import type { GraphQLSubscriptionRequest, GraphQLSubscriptionRequestInfo, GraphQLSubscriptionRequestDetails, GraphQLBody } from '../types/graphql-subscription';
import type { Auth } from '@opencollection/types/common/auth';
import type { HttpRequestHeader } from '@opencollection/types/requests/http';
import { stringifyYml } from '../utils';
import { isNonEmptyString } from '../../../utils';
import { toOpenCollectionAuth } from '../common/auth';
import { toOpenCollectionHttpHeaders } from '../common/headers';

const stringifyGraphQLSubscriptionRequest = (item: BrunoItem): string => {
  try {
    const ocRequest: GraphQLSubscriptionRequest = {};
    const brunoRequest = item.request as BrunoGraphqlSubscriptionRequest;

    // info block
    const info: GraphQLSubscriptionRequestInfo = {
      name: isNonEmptyString(item.name) ? item.name : 'Untitled Request',
      type: 'graphql-subscription'
    };
    if (item.seq) {
      info.seq = item.seq;
    }
    if (item.tags?.length) {
      info.tags = item.tags;
    }
    if (isNonEmptyString(item.description)) {
      info.description = item.description;
    }
    ocRequest.info = info;

    // graphqlSubscription block
    const graphqlSubscription: GraphQLSubscriptionRequestDetails = {
      url: isNonEmptyString(brunoRequest.url) ? brunoRequest.url : ''
    };

    // headers
    const headers: HttpRequestHeader[] | undefined = toOpenCollectionHttpHeaders(brunoRequest.headers);
    if (headers) {
      graphqlSubscription.headers = headers;
    }

    // body
    if (brunoRequest.body?.mode === 'graphql' && brunoRequest.body.graphql) {
      const body: GraphQLBody = {};
      if (isNonEmptyString(brunoRequest.body.graphql.query)) {
        body.query = brunoRequest.body.graphql.query as string;
      }
      if (isNonEmptyString(brunoRequest.body.graphql.variables)) {
        body.variables = brunoRequest.body.graphql.variables as string;
      }
      if (body.query || body.variables) {
        graphqlSubscription.body = body;
      }
    }

    // auth
    const auth: Auth | undefined = toOpenCollectionAuth(brunoRequest.auth);
    if (auth) {
      graphqlSubscription.auth = auth;
    }

    // connectionParams
    if (isNonEmptyString(brunoRequest.connectionParams)) {
      graphqlSubscription.connectionParams = brunoRequest.connectionParams as string;
    }

    ocRequest.graphqlSubscription = graphqlSubscription;

    // settings
    const settings = item.settings as Record<string, number | string | undefined> | undefined;
    if (settings) {
      ocRequest.settings = {};
      const timeout = Number(settings.timeout);
      ocRequest.settings.timeout = !isNaN(timeout) ? timeout : 0;
      const keepAliveInterval = Number(settings.keepAliveInterval);
      ocRequest.settings.keepAliveInterval = !isNaN(keepAliveInterval) ? keepAliveInterval : 0;
    }

    // docs
    if (isNonEmptyString(brunoRequest.docs)) {
      ocRequest.docs = brunoRequest.docs;
    }

    return stringifyYml(ocRequest);
  } catch (error) {
    console.error('Error stringifying GraphQL subscription request:', error);
    throw error;
  }
};

export default stringifyGraphQLSubscriptionRequest;
