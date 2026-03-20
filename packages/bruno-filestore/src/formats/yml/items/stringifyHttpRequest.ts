import type { Item as BrunoItem, HttpItemSettings as BrunoHttpItemSettings } from '@usebruno/schema-types/collection/item';
import type { HttpRequest as BrunoHttpRequest } from '@usebruno/schema-types/requests/http';
import type { HttpRequest, HttpRequestSettings, HttpRequestExample, HttpRequestInfo, HttpRequestDetails, HttpRequestRuntime, HttpRequestHeader } from '@opencollection/types/requests/http';
import type { Auth } from '@opencollection/types/common/auth';
import type { Scripts } from '@opencollection/types/common/scripts';
import type { Variable } from '@opencollection/types/common/variables';
import type { Assertion } from '@opencollection/types/common/assertions';
import type { Action } from '@opencollection/types/common/actions';
import type { HttpRequestParam, HttpRequestBody } from '@opencollection/types/requests/http';
import { stringifyYml } from '../utils';
import { toOpenCollectionAuth } from '../common/auth';
import { toOpenCollectionHttpHeaders, toOpenCollectionResponseHeaders } from '../common/headers';
import { toOpenCollectionParams } from '../common/params';
import { toOpenCollectionBody } from '../common/body';
import { toOpenCollectionVariables } from '../common/variables';
import { toOpenCollectionActions } from '../common/actions';
import { toOpenCollectionScripts } from '../common/scripts';
import { toOpenCollectionAssertions } from '../common/assertions';
import { isNumber, isNonEmptyString } from '../../../utils';

const stringifyHttpRequest = (item: BrunoItem): string => {
  try {
    const ocRequest: HttpRequest = {};
    const brunoRequest = item.request as BrunoHttpRequest;

    // info block
    const info: HttpRequestInfo = {
      name: isNonEmptyString(item.name) ? item.name : 'Untitled Request',
      type: 'http'
    };
    if (item.seq) {
      info.seq = item.seq;
    }
    if (item.tags?.length) {
      info.tags = item.tags;
    }
    ocRequest.info = info;

    // http block
    const http: HttpRequestDetails = {
      method: isNonEmptyString(brunoRequest.method) ? brunoRequest.method : 'GET',
      url: isNonEmptyString(brunoRequest.url) ? brunoRequest.url : ''
    };

    // headers
    const headers: HttpRequestHeader[] | undefined = toOpenCollectionHttpHeaders(brunoRequest.headers);
    if (headers) {
      http.headers = headers;
    }

    // params
    const params: HttpRequestParam[] | undefined = toOpenCollectionParams(brunoRequest.params);
    if (params) {
      http.params = params;
    }

    // body
    const body: HttpRequestBody | undefined = toOpenCollectionBody(brunoRequest.body);
    if (body) {
      http.body = body;
    }

    // auth
    const auth: Auth | undefined = toOpenCollectionAuth(brunoRequest.auth);
    if (auth) {
      http.auth = auth;
    }

    ocRequest.http = http;

    // runtime block
    const runtime: HttpRequestRuntime = {};
    let hasRuntime = false;

    // variables
    const variables: Variable[] | undefined = toOpenCollectionVariables(brunoRequest.vars);
    if (variables) {
      runtime.variables = variables;
      hasRuntime = true;
    }

    // scripts
    const scripts: Scripts | undefined = toOpenCollectionScripts(brunoRequest);
    if (scripts) {
      runtime.scripts = scripts;
      hasRuntime = true;
    }

    // assertions
    const assertions: Assertion[] | undefined = toOpenCollectionAssertions(brunoRequest.assertions);
    if (assertions) {
      runtime.assertions = assertions;
      hasRuntime = true;
    }

    // actions (from post-response variables)
    const resVars = brunoRequest.vars?.res;
    const actions: Action[] | undefined = toOpenCollectionActions(resVars);
    if (actions) {
      runtime.actions = actions;
      hasRuntime = true;
    }

    if (hasRuntime) {
      ocRequest.runtime = runtime;
    }

    // settings
    const httpSettings = item.settings as BrunoHttpItemSettings | undefined;
    const settings: HttpRequestSettings = {};
    if (httpSettings?.encodeUrl === true) {
      settings.encodeUrl = true;
    } else if (httpSettings?.encodeUrl === false) {
      settings.encodeUrl = false;
    } else {
      settings.encodeUrl = true;
    }

    const timeout = httpSettings?.timeout;
    if (isNumber(timeout)) {
      settings.timeout = timeout;
    } else {
      settings.timeout = 0;
    }

    if (httpSettings?.followRedirects === true) {
      settings.followRedirects = true;
    } else if (httpSettings?.followRedirects === false) {
      settings.followRedirects = false;
    } else {
      settings.followRedirects = true;
    }

    const maxRedirects = httpSettings?.maxRedirects;
    if (isNumber(maxRedirects)) {
      settings.maxRedirects = maxRedirects;
    } else {
      settings.maxRedirects = 5;
    }

    ocRequest.settings = settings;

    // examples
    if (item.examples?.length) {
      const examples: HttpRequestExample[] = item.examples.map((example) => {
        const ocExample: HttpRequestExample = {};
        ocExample.name = example?.name || 'Untitled Example';

        if (isNonEmptyString(example.description)) {
          ocExample.description = example.description;
        }

        if (example.request) {
          ocExample.request = {};
          ocExample.request.url = example.request.url || '';
          ocExample.request.method = example.request.method || 'GET';

          const exampleHeaders = toOpenCollectionHttpHeaders(example.request.headers);
          if (exampleHeaders) {
            ocExample.request.headers = exampleHeaders;
          }

          const exampleParams = toOpenCollectionParams(example.request.params);
          if (exampleParams) {
            ocExample.request.params = exampleParams;
          }

          const exampleBody = toOpenCollectionBody(example.request.body);
          if (exampleBody !== undefined) {
            ocExample.request.body = exampleBody;
          }
        }

        if (example.response) {
          ocExample.response = {};

          const statusNum = Number(example.response.status);
          if (Number.isInteger(statusNum) && statusNum > 0) {
            ocExample.response.status = statusNum;
          }

          if (isNonEmptyString(example.response.statusText)) {
            ocExample.response.statusText = example.response.statusText;
          }

          const responseHeaders = toOpenCollectionResponseHeaders(example.response.headers);
          if (responseHeaders) {
            ocExample.response.headers = responseHeaders;
          }

          if (example.response.body && example.response.body.type && example.response.body.content !== undefined) {
            const content = example.response.body.content;
            const contentString = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

            ocExample.response.body = {
              type: example.response.body.type as 'json' | 'text' | 'xml' | 'html' | 'binary',
              data: contentString
            };
          }
        }

        return ocExample;
      });

      if (examples?.length) {
        ocRequest.examples = examples;
      }
    }

    // body variants
    const bodyVariants = (brunoRequest as any).bodyVariants;
    if (bodyVariants?.length) {
      (ocRequest as any).bodyVariants = bodyVariants.map((variant: any) => ({
        uid: variant.uid,
        name: variant.name,
        body: variant.body
      }));
      const activeBodyVariantUid = (brunoRequest as any).activeBodyVariantUid;
      if (activeBodyVariantUid) {
        (ocRequest as any).activeBodyVariantUid = activeBodyVariantUid;
      }
    }

    // docs
    if (isNonEmptyString(brunoRequest.docs)) {
      ocRequest.docs = brunoRequest.docs;
    }

    return stringifyYml(ocRequest);
  } catch (error) {
    console.error('Error stringifying HTTP request:', error);
    throw error;
  }
};

export default stringifyHttpRequest;
