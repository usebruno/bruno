import { uuid } from '../../common/index.js';
import {
  fromOpenCollectionHeaders,
  toOpenCollectionHeaders,
  fromOpenCollectionParams,
  toOpenCollectionParams,
  fromOpenCollectionBody,
  toOpenCollectionBody,
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
  HttpRequest,
  HttpRequestSettings,
  HttpRequestExample,
  HttpRequestInfo,
  HttpRequestDetails,
  HttpRequestRuntime,
  HttpRequestHeader,
  HttpRequestBody,
  Auth,
  BrunoItem,
  BrunoKeyValue,
  BrunoHttpRequestParam,
  BrunoExample,
  BrunoHttpRequest
} from '../types';
import type { HttpItemSettings as BrunoHttpItemSettings } from '@usebruno/schema-types/collection/item';

const getHttpBody = (body: HttpRequestBody | Array<{ title: string; selected?: boolean; body: HttpRequestBody }> | undefined): HttpRequestBody | undefined => {
  if (!body) return undefined;
  if (Array.isArray(body)) {
    const selected = body.find((v) => v.selected);
    return selected?.body || body[0]?.body;
  }
  return body;
};

export const fromOpenCollectionHttpItem = (ocRequest: HttpRequest): BrunoItem => {
  const info = ocRequest.info;
  const http = ocRequest.http;
  const runtime = ocRequest.runtime;

  const scripts = fromOpenCollectionScripts(runtime?.scripts);
  const httpBody = getHttpBody(http?.body as HttpRequestBody);

  // variables (pre-request from variables, post-response from actions)
  const variables = fromOpenCollectionVariables(runtime?.variables);
  const postResponseVars = fromOpenCollectionActions(runtime?.actions);

  const brunoRequest: BrunoHttpRequest = {
    url: http?.url || '',
    method: http?.method || 'GET',
    headers: fromOpenCollectionHeaders(http?.headers) || [],
    params: fromOpenCollectionParams(http?.params) || [],
    body: fromOpenCollectionBody(httpBody) || {
      mode: 'none',
      json: null,
      text: null,
      xml: null,
      sparql: null,
      formUrlEncoded: [],
      multipartForm: [],
      graphql: null,
      file: []
    },
    auth: fromOpenCollectionAuth(http?.auth as Auth),
    script: {
      req: scripts?.script?.req || null,
      res: scripts?.script?.res || null
    },
    vars: {
      req: variables.req,
      res: postResponseVars
    },
    assertions: fromOpenCollectionAssertions(runtime?.assertions) || [],
    tests: scripts?.tests || null,
    docs: ocRequest.docs || null
  };

  const brunoItem: BrunoItem = {
    uid: uuid(),
    type: 'http-request',
    seq: info?.seq || 1,
    name: info?.name || 'Untitled Request',
    tags: info?.tags || [],
    request: brunoRequest,
    settings: null,
    fileContent: null,
    root: null,
    items: [],
    examples: [],
    filename: null,
    pathname: null
  };

  if (ocRequest.settings) {
    const settings: BrunoHttpItemSettings = {
      encodeUrl: typeof ocRequest.settings.encodeUrl === 'boolean' ? ocRequest.settings.encodeUrl : true,
      timeout: typeof ocRequest.settings.timeout === 'number' ? ocRequest.settings.timeout : 0,
      followRedirects: typeof ocRequest.settings.followRedirects === 'boolean' ? ocRequest.settings.followRedirects : true,
      maxRedirects: typeof ocRequest.settings.maxRedirects === 'number' ? ocRequest.settings.maxRedirects : 5
    };
    brunoItem.settings = settings;
  }

  if (ocRequest.examples?.length) {
    brunoItem.examples = ocRequest.examples.map((example): BrunoExample => ({
      uid: uuid(),
      itemUid: brunoItem.uid,
      name: example.name || 'Untitled Example',
      description: typeof example.description === 'string' ? example.description : (example.description as { content?: string })?.content || null,
      type: 'http-request',
      request: {
        url: example.request?.url || '',
        method: example.request?.method || 'GET',
        headers: fromOpenCollectionHeaders(example.request?.headers) || [],
        params: fromOpenCollectionParams(example.request?.params) || [],
        body: fromOpenCollectionBody(example.request?.body) || null
      },
      response: example.response ? {
        status: String(example.response.status || 200),
        statusText: example.response.statusText || 'OK',
        headers: fromOpenCollectionHeaders(example.response.headers as HttpRequestHeader[]) || [],
        body: example.response.body ? {
          type: example.response.body.type || 'text',
          content: example.response.body.data || ''
        } : null
      } : null
    }));
  }

  return brunoItem;
};

export const toOpenCollectionHttpItem = (item: BrunoItem): HttpRequest => {
  const ocRequest: HttpRequest = {};
  const brunoRequest = item.request as BrunoHttpRequest;
  const brunoSettings = item.settings as BrunoHttpItemSettings | undefined;

  const info: HttpRequestInfo = {
    name: item.name || 'Untitled Request',
    type: 'http'
  };
  if (item.seq) {
    info.seq = item.seq;
  }
  if (item.tags?.length) {
    info.tags = item.tags;
  }
  ocRequest.info = info;

  const http: HttpRequestDetails = {
    method: brunoRequest?.method || 'GET',
    url: brunoRequest?.url || ''
  };

  const headers = toOpenCollectionHeaders(brunoRequest?.headers as BrunoKeyValue[]);
  if (headers) {
    http.headers = headers;
  }

  const params = toOpenCollectionParams(brunoRequest?.params as BrunoHttpRequestParam[]);
  if (params) {
    http.params = params;
  }

  const body = toOpenCollectionBody(brunoRequest?.body);
  if (body) {
    http.body = body;
  }

  // auth
  const auth = toOpenCollectionAuth(brunoRequest?.auth);
  if (auth) {
    http.auth = auth;
  }

  ocRequest.http = http;

  const runtime: HttpRequestRuntime = {};
  let hasRuntime = false;

  const variables = toOpenCollectionVariables(brunoRequest?.vars);
  if (variables) {
    runtime.variables = variables;
    hasRuntime = true;
  }

  const scripts = toOpenCollectionScripts(brunoRequest);
  if (scripts) {
    runtime.scripts = scripts;
    hasRuntime = true;
  }

  const assertions = toOpenCollectionAssertions(brunoRequest?.assertions as BrunoKeyValue[]);
  if (assertions) {
    runtime.assertions = assertions;
    hasRuntime = true;
  }

  // actions (from post-response variables)
  const resVars = brunoRequest?.vars?.res;
  const actions = toOpenCollectionActions(resVars);
  if (actions) {
    runtime.actions = actions;
    hasRuntime = true;
  }

  if (hasRuntime) {
    ocRequest.runtime = runtime;
  }

  const settings: HttpRequestSettings = {
    encodeUrl: typeof brunoSettings?.encodeUrl === 'boolean' ? brunoSettings.encodeUrl : true,
    timeout: typeof brunoSettings?.timeout === 'number' ? brunoSettings.timeout : 0,
    followRedirects: typeof brunoSettings?.followRedirects === 'boolean' ? brunoSettings.followRedirects : true,
    maxRedirects: typeof brunoSettings?.maxRedirects === 'number' ? brunoSettings.maxRedirects : 5
  };
  ocRequest.settings = settings;

  if (brunoRequest?.docs) {
    ocRequest.docs = brunoRequest.docs;
  }

  if (item.examples?.length) {
    ocRequest.examples = item.examples.map((example): HttpRequestExample => {
      const ocExample: HttpRequestExample = {
        name: example.name || 'Untitled Example'
      };

      if (example.description) {
        ocExample.description = example.description;
      }

      if (example.request) {
        ocExample.request = {
          url: example.request.url || '',
          method: example.request.method || 'GET'
        };

        const exampleHeaders = toOpenCollectionHeaders(example.request.headers as BrunoKeyValue[]);
        if (exampleHeaders) {
          ocExample.request.headers = exampleHeaders;
        }

        const exampleParams = toOpenCollectionParams(example.request.params as BrunoHttpRequestParam[]);
        if (exampleParams) {
          ocExample.request.params = exampleParams;
        }

        const exampleBody = toOpenCollectionBody(example.request.body);
        if (exampleBody) {
          ocExample.request.body = exampleBody;
        }
      }

      if (example.response) {
        ocExample.response = {};

        if (example.response.status !== undefined) {
          ocExample.response.status = Number(example.response.status);
        }

        if (example.response.statusText) {
          ocExample.response.statusText = example.response.statusText;
        }

        const responseHeaders = toOpenCollectionHeaders(example.response.headers as BrunoKeyValue[]);
        if (responseHeaders) {
          ocExample.response.headers = responseHeaders;
        }

        if (example.response.body) {
          ocExample.response.body = {
            type: (example.response.body.type as 'json' | 'text' | 'xml' | 'html' | 'binary') || 'text',
            data: String(example.response.body.content || '')
          };
        }
      }

      return ocExample;
    });
  }

  return ocRequest;
};
