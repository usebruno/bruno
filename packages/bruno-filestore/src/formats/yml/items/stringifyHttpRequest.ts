import type { Item as BrunoItem, HttpItemSettings as BrunoHttpItemSettings } from '@usebruno/schema-types/collection/item';
import type { HttpRequest as BrunoHttpRequest } from '@usebruno/schema-types/requests/http';
import type { HttpRequest, HttpRequestSettings, HttpRequestExample } from '@opencollection/types/requests/http';
import type { Auth } from '@opencollection/types/common/auth';
import type { Scripts } from '@opencollection/types/common/scripts';
import type { Variable } from '@opencollection/types/common/variables';
import type { Assertion } from '@opencollection/types/common/assertions';
import type { HttpRequestParam, HttpHeader, HttpRequestBody } from '@opencollection/types/requests/http';
import { stringifyYml } from '../utils';
import { toOpenCollectionAuth } from '../common/auth';
import { toOpenCollectionHttpHeaders } from '../common/headers';
import { toOpenCollectionParams } from '../common/params';
import { toOpenCollectionBody } from '../common/body';
import { toOpenCollectionVariables } from '../common/variables';
import { toOpenCollectionScripts } from '../common/scripts';
import { toOpenCollectionAssertions } from '../common/assertions';
import { isNumber, isNonEmptyString } from '../../../utils';

const stringifyHttpRequest = (item: BrunoItem): string => {
  try {
    const ocRequest: HttpRequest = {
      type: 'http'
    };

    ocRequest.name = isNonEmptyString(item.name) ? item.name : 'Untitled Request';

    // sequence
    if (item.seq) {
      ocRequest.seq = item.seq;
    }

    const brunoRequest = item.request as BrunoHttpRequest;
    // url and method
    ocRequest.url = isNonEmptyString(brunoRequest.url) ? brunoRequest.url : '';
    ocRequest.method = isNonEmptyString(brunoRequest.method) ? brunoRequest.method : 'GET';

    // headers
    const headers: HttpHeader[] | undefined = toOpenCollectionHttpHeaders(brunoRequest.headers);
    if (headers) {
      ocRequest.headers = headers;
    }

    // params
    const params: HttpRequestParam[] | undefined = toOpenCollectionParams(brunoRequest.params);
    if (params) {
      ocRequest.params = params;
    }

    // body
    const body: HttpRequestBody | undefined = toOpenCollectionBody(brunoRequest.body);
    if (body) {
      ocRequest.body = body;
    }

    // auth
    const auth: Auth | undefined = toOpenCollectionAuth(brunoRequest.auth);
    if (auth) {
      ocRequest.auth = auth;
    }

    // scripts
    const scripts: Scripts | undefined = toOpenCollectionScripts(brunoRequest);
    if (scripts) {
      ocRequest.scripts = scripts;
    }

    // variables
    const variables: Variable[] | undefined = toOpenCollectionVariables(brunoRequest.vars);
    if (variables) {
      ocRequest.variables = variables;
    }

    // assertions
    const assertions: Assertion[] | undefined = toOpenCollectionAssertions(brunoRequest.assertions);
    if (assertions) {
      ocRequest.assertions = assertions;
    }

    // docs
    if (isNonEmptyString(brunoRequest.docs)) {
      ocRequest.docs = brunoRequest.docs;
    }

    // settings
    const httpSettings = item.settings as BrunoHttpItemSettings | undefined;
    ocRequest.settings = {} as HttpRequestSettings;
    if (httpSettings?.encodeUrl === true) {
      ocRequest.settings.encodeUrl = true;
    } else if (httpSettings?.encodeUrl === false) {
      ocRequest.settings.encodeUrl = false;
    } else {
      // todo: we are defaulting to true for now as bruno config does not yet support inherit for encodeUrl
      // update this when bruno config supports inherit for encodeUrl
      ocRequest.settings.encodeUrl = true;
    }

    const timeout = httpSettings?.timeout;
    if (isNumber(timeout)) {
      ocRequest.settings.timeout = timeout;
    } else {
      // todo: we are defaulting to 0 for now as bruno config does not yet support inherit for timeout
      // update this when bruno config supports inherit for timeout
      ocRequest.settings.timeout = 0;
    }

    if (httpSettings?.followRedirects === true) {
      ocRequest.settings.followRedirects = true;
    } else if (httpSettings?.followRedirects === false) {
      ocRequest.settings.followRedirects = false;
    } else {
      // todo: we are defaulting to true for now as bruno config does not yet support inherit for followRedirects
      // update this when bruno config supports inherit for followRedirects
      ocRequest.settings.followRedirects = true;
    }

    const maxRedirects = httpSettings?.maxRedirects;
    if (isNumber(maxRedirects)) {
      ocRequest.settings.maxRedirects = maxRedirects;
    } else {
      // todo: we are defaulting to 5 for now as bruno config does not yet support inherit for maxRedirects
      // update this when bruno config supports inherit for maxRedirects
      ocRequest.settings.maxRedirects = 5;
    }

    // tags
    if (item.tags?.length) {
      ocRequest.tags = item.tags;
    }

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

          if (example.response.status !== undefined && example.response.status !== null && isNumber(example.response.status)) {
            ocExample.response.status = Number(example.response.status);
          }

          if (isNonEmptyString(example.response.statusText)) {
            ocExample.response.statusText = example.response.statusText;
          }

          const responseHeaders = toOpenCollectionHttpHeaders(example.response.headers);
          if (responseHeaders) {
            ocExample.response.headers = responseHeaders;
          }

          if (example.response.body && example.response.body.type && example.response.body.content !== undefined) {
            ocExample.response.body = {
              type: example.response.body.type as 'json' | 'text' | 'xml' | 'html' | 'binary',
              data: String(example.response.body.content || '')
            };
          }
        }

        return ocExample;
      });

      // examples
      if (examples?.length) {
        ocRequest.examples = examples;
      }
    }

    return stringifyYml(ocRequest);
  } catch (error) {
    console.error('Error stringifying HTTP request:', error);
    throw error;
  }
};

export default stringifyHttpRequest;
