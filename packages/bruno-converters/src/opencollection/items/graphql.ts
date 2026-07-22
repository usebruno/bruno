import { uuid } from '../../common/index.js';
import {
  fromOpenCollectionHeaders,
  toOpenCollectionHeaders,
  fromOpenCollectionParams,
  toOpenCollectionParams,
  fromOpenCollectionBody,
  toOpenCollectionGraphqlBody,
  fromOpenCollectionAuth,
  toOpenCollectionAuth,
  fromOpenCollectionScripts,
  toOpenCollectionScripts,
  fromOpenCollectionVariables,
  toOpenCollectionVariables,
  fromOpenCollectionActions,
  toOpenCollectionActions,
  fromOpenCollectionAssertions,
  toOpenCollectionAssertions
} from '../common';
import type {
  GraphQLRequest,
  GraphQLRequestInfo,
  GraphQLRequestDetails,
  GraphQLRequestRuntime,
  GraphQLRequestSettings,
  GraphQLBody,
  GraphQLBodyVariant,
  Auth,
  BrunoItem,
  BrunoKeyValue,
  BrunoHttpRequestParam
} from '../types';

const getGraphqlBody = (body: GraphQLBody | GraphQLBodyVariant[] | undefined): GraphQLBody | undefined => {
  if (!body) return undefined;
  if (Array.isArray(body)) {
    const selected = body.find((v) => v.selected);
    return selected?.body || body[0]?.body;
  }
  return body;
};

export const fromOpenCollectionGraphqlItem = (item: GraphQLRequest): BrunoItem => {
  const info = item.info || {};
  const graphql = item.graphql || {};
  const runtime = item.runtime || {};

  const scripts = fromOpenCollectionScripts(runtime.scripts);
  const graphqlBody = getGraphqlBody(graphql.body);

  // variables (pre-request from variables, post-response from actions)
  const variables = fromOpenCollectionVariables(runtime.variables);
  const postResponseVars = fromOpenCollectionActions(runtime.actions);

  const brunoItem: BrunoItem = {
    uid: uuid(),
    type: 'graphql-request',
    name: info.name || 'Untitled Request',
    seq: info.seq || 1,
    request: {
      url: graphql.url || '',
      method: graphql.method || 'POST',
      headers: fromOpenCollectionHeaders(graphql.headers),
      params: fromOpenCollectionParams(graphql.params),
      body: fromOpenCollectionBody(graphqlBody, 'graphql'),
      auth: fromOpenCollectionAuth(graphql.auth as Auth),
      script: scripts?.script,
      vars: {
        req: variables.req,
        res: postResponseVars
      },
      assertions: fromOpenCollectionAssertions(runtime.assertions),
      tests: scripts?.tests,
      docs: item.docs || ''
    }
  };

  const settings = item.settings;
  if (settings) {
    brunoItem.settings = {};
    if (settings.encodeUrl !== undefined) {
      (brunoItem.settings as Record<string, unknown>).encodeUrl = settings.encodeUrl;
    }
    if (settings.timeout !== undefined) {
      (brunoItem.settings as Record<string, unknown>).timeout = settings.timeout;
    }
    if (settings.followRedirects !== undefined) {
      (brunoItem.settings as Record<string, unknown>).followRedirects = settings.followRedirects;
    }
    if (settings.maxRedirects !== undefined) {
      (brunoItem.settings as Record<string, unknown>).maxRedirects = settings.maxRedirects;
    }
  }

  if (info.tags?.length) {
    brunoItem.tags = info.tags;
  }

  return brunoItem;
};

export const toOpenCollectionGraphqlItem = (item: BrunoItem): GraphQLRequest => {
  const request = (item.request || {}) as Record<string, unknown>;
  const brunoSettings = (item.settings || {}) as Record<string, unknown>;

  const info: GraphQLRequestInfo = {
    name: item.name || 'Untitled Request',
    type: 'graphql'
  };

  if (item.seq) {
    info.seq = item.seq;
  }

  if (item.tags?.length) {
    info.tags = item.tags;
  }

  const graphql: GraphQLRequestDetails = {
    url: request.url as string || '',
    method: request.method as string || 'POST'
  };

  const headers = toOpenCollectionHeaders(request.headers as BrunoKeyValue[]);
  if (headers) {
    graphql.headers = headers;
  }

  const params = toOpenCollectionParams(request.params as BrunoHttpRequestParam[]);
  if (params) {
    graphql.params = params;
  }

  const body = toOpenCollectionGraphqlBody(request.body as Parameters<typeof toOpenCollectionGraphqlBody>[0]);
  if (body) {
    graphql.body = body;
  }

  // auth
  const auth = toOpenCollectionAuth(request.auth as Parameters<typeof toOpenCollectionAuth>[0]);
  if (auth) {
    graphql.auth = auth;
  }

  const ocRequest: GraphQLRequest = {
    info,
    graphql
  };

  const scripts = toOpenCollectionScripts(request as Parameters<typeof toOpenCollectionScripts>[0]);
  const variables = toOpenCollectionVariables(request.vars as Parameters<typeof toOpenCollectionVariables>[0]);
  const assertions = toOpenCollectionAssertions(request.assertions as BrunoKeyValue[]);

  // actions (from post-response variables)
  const vars = request.vars as { req?: unknown[]; res?: unknown[] } | undefined;
  const actions = toOpenCollectionActions(vars?.res as Parameters<typeof toOpenCollectionActions>[0]);

  if (scripts || variables || assertions || actions) {
    const runtime: GraphQLRequestRuntime = {};

    if (scripts) {
      runtime.scripts = scripts;
    }

    if (variables) {
      runtime.variables = variables;
    }

    if (assertions) {
      runtime.assertions = assertions;
    }

    if (actions) {
      runtime.actions = actions;
    }

    ocRequest.runtime = runtime;
  }

  const settings: GraphQLRequestSettings = {
    encodeUrl: typeof brunoSettings.encodeUrl === 'boolean' ? brunoSettings.encodeUrl : true,
    timeout: typeof brunoSettings.timeout === 'number' ? brunoSettings.timeout : 0,
    followRedirects: typeof brunoSettings.followRedirects === 'boolean' ? brunoSettings.followRedirects : true,
    maxRedirects: typeof brunoSettings.maxRedirects === 'number' ? brunoSettings.maxRedirects : 5
  };
  ocRequest.settings = settings;

  if (request.docs) {
    ocRequest.docs = request.docs as string;
  }

  return ocRequest;
};
