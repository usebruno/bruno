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
  fromOpenCollectionAssertions,
  toOpenCollectionAssertions
} from '../common';
import type {
  HttpRequest,
  HttpRequestExample,
  HttpRequestHeader,
  HttpRequestBody,
  HttpRequestBodyVariant,
  BrunoItem,
  BrunoExample,
  BrunoKeyValue,
  BrunoHttpRequestParam,
  BrunoHttpRequest
} from '../types';

const getHttpBody = (body: HttpRequestBody | HttpRequestBodyVariant[] | undefined): HttpRequestBody | undefined => {
  if (!body) return undefined;
  if (Array.isArray(body)) {
    const selected = body.find((v) => v.selected);
    return selected?.body || body[0]?.body;
  }
  return body;
};

export const fromOpenCollectionHttpItem = (item: HttpRequest): BrunoItem => {
  const info = item.info || {};
  const http = item.http || {};
  const runtime = item.runtime || {};
  const settings = item.settings || {};

  const scripts = fromOpenCollectionScripts(runtime.scripts);

  const httpBody = getHttpBody(http.body);

  const brunoItem: BrunoItem = {
    uid: uuid(),
    type: 'http-request',
    name: info.name || 'Untitled Request',
    seq: info.seq || 1,
    request: {
      url: http.url || '',
      method: http.method || 'GET',
      headers: fromOpenCollectionHeaders(http.headers),
      params: fromOpenCollectionParams(http.params),
      body: fromOpenCollectionBody(httpBody),
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

  if (item.examples?.length) {
    const itemUid = brunoItem.uid;
    brunoItem.examples = item.examples.map((example): BrunoExample => ({
      uid: uuid(),
      itemUid,
      name: example.name || 'Untitled Example',
      description: typeof example.description === 'string' ? example.description : example.description?.content || null,
      type: 'http-request',
      request: {
        url: example.request?.url || http.url || '',
        method: example.request?.method || http.method || 'GET',
        headers: fromOpenCollectionHeaders(example.request?.headers),
        params: fromOpenCollectionParams(example.request?.params),
        body: fromOpenCollectionBody(example.request?.body)
      },
      response: {
        status: String(example.response?.status || 200),
        statusText: example.response?.statusText || 'OK',
        headers: fromOpenCollectionHeaders(example.response?.headers as HttpRequestHeader[]),
        body: example.response?.body ? {
          type: example.response.body.type || 'text',
          content: example.response.body.data || ''
        } : null
      }
    }));
  }

  return brunoItem;
};

export const toOpenCollectionHttpItem = (item: BrunoItem): HttpRequest => {
  const request = (item.request || {}) as Partial<BrunoHttpRequest>;
  const brunoSettings = (item.settings as any) || {};

  const ocRequest: HttpRequest = {
    info: {
      name: item.name || 'Untitled Request',
      type: 'http'
    },
    http: {
      url: request.url || '',
      method: request.method || 'GET'
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
    ocRequest.http!.headers = headers;
  }

  const params = toOpenCollectionParams(request.params as BrunoHttpRequestParam[]);
  if (params) {
    ocRequest.http!.params = params;
  }

  const body = toOpenCollectionBody(request.body);
  if (body) {
    ocRequest.http!.body = body;
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
          ocExample.response.headers = responseHeaders as any;
        }

        if (example.response.body) {
          ocExample.response.body = {
            type: (example.response.body.type as any) || 'text',
            data: String(example.response.body.content || '')
          };
        }
      }

      return ocExample;
    });
  }

  return ocRequest;
};
