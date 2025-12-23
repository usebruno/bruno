import { uuid } from '../../common/index.js';
import {
  fromOpenCollectionHeaders,
  toOpenCollectionHeaders,
  fromOpenCollectionParams,
  toOpenCollectionParams,
  fromOpenCollectionBody,
  fromOpenCollectionAuth,
  toOpenCollectionAuth,
  fromOpenCollectionScripts,
  toOpenCollectionScripts,
  fromOpenCollectionVariables,
  toOpenCollectionVariables,
  fromOpenCollectionAssertions,
  toOpenCollectionAssertions,
  toOpenCollectionGraphqlBody
} from '../common';
import type {
  GraphQLRequest,
  GraphQLBody,
  BrunoItem,
  BrunoKeyValue,
  BrunoHttpRequestParam,
  BrunoHttpRequest
} from '../types';

type GraphqlRequestBody = BrunoHttpRequest;

export const fromOpenCollectionGraphqlItem = (item: GraphQLRequest): BrunoItem => {
  const info = item.info || {};
  const graphql = item.graphql || {};
  const runtime = item.runtime || {};
  const settings = item.settings || {};

  const scripts = fromOpenCollectionScripts(runtime.scripts);

  let gqlBody = graphql.body as GraphQLBody | undefined;
  if (Array.isArray(graphql.body) && graphql.body.length > 0) {
    const selected = graphql.body.find((v: any) => v.selected);
    gqlBody = selected?.body || graphql.body[0]?.body;
  }

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
      body: fromOpenCollectionBody(gqlBody, 'graphql'),
      auth: fromOpenCollectionAuth(runtime.auth),
      script: scripts.script,
      vars: fromOpenCollectionVariables(runtime.variables),
      assertions: fromOpenCollectionAssertions(runtime.assertions),
      tests: scripts.tests,
      docs: item.docs || ''
    }
  };

  if (settings.encodeUrl !== undefined) {
    brunoItem.settings = brunoItem.settings || {};
    (brunoItem.settings as any).encodeUrl = settings.encodeUrl;
  }
  if (settings.timeout !== undefined) {
    brunoItem.settings = brunoItem.settings || {};
    (brunoItem.settings as any).timeout = settings.timeout;
  }
  if (settings.followRedirects !== undefined) {
    brunoItem.settings = brunoItem.settings || {};
    (brunoItem.settings as any).followRedirects = settings.followRedirects;
  }
  if (settings.maxRedirects !== undefined) {
    brunoItem.settings = brunoItem.settings || {};
    (brunoItem.settings as any).maxRedirects = settings.maxRedirects;
  }

  if (info.tags?.length) {
    brunoItem.tags = info.tags;
  }

  return brunoItem;
};

export const toOpenCollectionGraphqlItem = (item: BrunoItem): GraphQLRequest => {
  const request = (item.request || {}) as Partial<GraphqlRequestBody>;
  const brunoSettings = (item.settings as any) || {};

  const ocRequest: GraphQLRequest = {
    info: {
      name: item.name || 'Untitled Request',
      type: 'graphql'
    },
    graphql: {
      url: request.url || '',
      method: request.method || 'POST'
    }
  };

  if (item.seq) {
    ocRequest.info!.seq = item.seq;
  }

  if (item.tags?.length) {
    ocRequest.info!.tags = item.tags;
  }

  const headers = toOpenCollectionHeaders(request.headers as BrunoKeyValue[]);
  if (headers) {
    ocRequest.graphql!.headers = headers;
  }

  const params = toOpenCollectionParams(request.params as BrunoHttpRequestParam[]);
  if (params) {
    ocRequest.graphql!.params = params;
  }

  const body = toOpenCollectionGraphqlBody(request.body);
  if (body) {
    ocRequest.graphql!.body = body;
  }

  const auth = toOpenCollectionAuth(request.auth);
  const scripts = toOpenCollectionScripts(request);
  const variables = toOpenCollectionVariables(request.vars);
  const assertions = toOpenCollectionAssertions(request.assertions as BrunoKeyValue[]);

  if (auth || scripts || variables || assertions) {
    ocRequest.runtime = {};

    if (auth) {
      ocRequest.runtime.auth = auth;
    }

    if (scripts) {
      ocRequest.runtime.scripts = scripts;
    }

    if (variables) {
      ocRequest.runtime.variables = variables;
    }

    if (assertions) {
      ocRequest.runtime.assertions = assertions;
    }
  }

  ocRequest.settings = {
    encodeUrl: brunoSettings.encodeUrl !== undefined ? brunoSettings.encodeUrl : true,
    timeout: brunoSettings.timeout !== undefined ? brunoSettings.timeout : 0,
    followRedirects: brunoSettings.followRedirects !== undefined ? brunoSettings.followRedirects : true,
    maxRedirects: brunoSettings.maxRedirects !== undefined ? brunoSettings.maxRedirects : 5
  };

  if (request.docs) {
    ocRequest.docs = request.docs;
  }

  return ocRequest;
};
