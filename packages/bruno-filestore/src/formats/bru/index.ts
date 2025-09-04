import * as _ from 'lodash';
import {
  bruToJsonV2,
  jsonToBruV2,
  bruToEnvJsonV2,
  envJsonToBruV2,
  collectionBruToJson as _collectionBruToJson,
  jsonToCollectionBru as _jsonToCollectionBru
} from '@usebruno/lang';
import { getOauth2AdditionalParameters } from './utils/oauth2-additional-params';

export const bruRequestToJson = (data: string | any, parsed: boolean = false): any => {
  try {
    const json = parsed ? data : bruToJsonV2(data);

    let requestType = _.get(json, 'meta.type');
    switch (requestType) {
      case 'http':
        requestType = 'http-request';
        break;
      case 'graphql':
        requestType = 'graphql-request';
        break;
      case 'grpc':
        requestType = 'grpc-request';
        break;
      default:
        requestType = 'http-request';
    }

    const sequence = _.get(json, 'meta.seq');
    const transformedJson = {
      type: requestType,
      name: _.get(json, 'meta.name'),
      seq: !_.isNaN(sequence) ? Number(sequence) : 1,
      settings: _.get(json, 'settings', {}),
      tags: _.get(json, 'meta.tags', []),
      request: {
        // Preserving special characters in custom methods. Using _.upperCase strips special characters.
        method:
          requestType === 'grpc-request' ? _.get(json, 'grpc.method', '') : String(_.get(json, 'http.method') ?? '').toUpperCase(),
        url: _.get(json, requestType === 'grpc-request' ? 'grpc.url' : 'http.url'),
        headers: requestType === 'grpc-request' ? _.get(json, 'metadata', []) : _.get(json, 'headers', []),
        auth: _.get(json, 'auth', {}),
        body: _.get(json, 'body', {}),
        script: _.get(json, 'script', {}),
        vars: _.get(json, 'vars', {}),
        assertions: _.get(json, 'assertions', []),
        tests: _.get(json, 'tests', ''),
        docs: _.get(json, 'docs', '')
      }
    };

    // Add request type specific fields
    if (requestType === 'grpc-request') {
      const selectedMethodType = _.get(json, 'grpc.methodType');
      selectedMethodType && ((transformedJson.request as any).methodType = selectedMethodType);
      const protoPath = _.get(json, 'grpc.protoPath');
      protoPath && ((transformedJson.request as any).protoPath = protoPath);
      transformedJson.request.auth.mode = _.get(json, 'grpc.auth', 'none');
      transformedJson.request.body = _.get(json, 'body', {
        mode: 'grpc',
        grpc: _.get(json, 'body.grpc', [
          {
            name: 'message 1',
            content: '{}'
          }
        ])
      });
    } else {
      // For HTTP and GraphQL
      (transformedJson.request as any).params = _.get(json, 'params', []);
      transformedJson.request.auth.mode = _.get(json, 'http.auth', 'none');
      transformedJson.request.body.mode = _.get(json, 'http.body', 'none');
    }

    // add oauth2 additional parameters if they exist
    const hasOauth2GrantType = json?.auth?.oauth2?.grantType;
    if (hasOauth2GrantType) {
      const additionalParameters = getOauth2AdditionalParameters(json);
      const hasAdditionalParameters = Object.keys(additionalParameters || {}).length > 0;
      if (hasAdditionalParameters) {
        transformedJson.request.auth.oauth2.additionalParameters = additionalParameters;
      }
    }

    return transformedJson;
  } catch (error) {
    throw error;
  }
};

export const jsonRequestToBru = (json: any): string => {
  try {
    let type = _.get(json, 'type');
    switch (type) {
      case 'http-request':
        type = 'http';
        break;
      case 'graphql-request':
        type = 'graphql';
        break;
      case 'grpc-request':
        type = 'grpc';
        break;
      default:
        type = 'http';
    }

    const sequence = _.get(json, 'seq');

    // Start with the common meta section
    const bruJson = {
      meta: {
        name: _.get(json, 'name'),
        type: type,
        seq: !_.isNaN(sequence) ? Number(sequence) : 1,
        tags: _.get(json, 'tags', [])
      }
    } as any;

    // For HTTP and GraphQL requests, maintain the current structure
    if (type === 'http' || type === 'graphql') {
      bruJson.http = {
        // Preserve special characters in custom request methods. Avoid _.lowerCase which strips symbols.
        method: String(_.get(json, 'request.method') ?? '').toLowerCase(),
        url: _.get(json, 'request.url'),
        auth: _.get(json, 'request.auth.mode', 'none'),
        body: _.get(json, 'request.body.mode', 'none')
      };
      bruJson.params = _.get(json, 'request.params', []);
      bruJson.body = _.get(json, 'request.body', {
        mode: 'json',
        json: '{}'
      });
    } // For gRPC, add gRPC-specific structure but maintain field names
    else if (type === 'grpc') {
      bruJson.grpc = {
        url: _.get(json, 'request.url'),
        auth: _.get(json, 'request.auth.mode', 'none'),
        body: _.get(json, 'request.body.mode', 'grpc')
      };
      // Only add method if it exists
      const method = _.get(json, 'request.method');
      const methodType = _.get(json, 'request.methodType');
      const protoPath = _.get(json, 'request.protoPath');
      if (method) bruJson.grpc.method = method;
      if (methodType) bruJson.grpc.methodType = methodType;
      if (protoPath) bruJson.grpc.protoPath = protoPath;
      bruJson.body = _.get(json, 'request.body', {
        mode: 'grpc',
        grpc: _.get(json, 'request.body.grpc', [
          {
            name: 'message 1',
            content: '{}'
          }
        ])
      });
    }

    // Common fields for all request types
    if (type === 'grpc') {
      bruJson.metadata = _.get(json, 'request.headers', []); // Use metadata for gRPC
    } else {
      bruJson.headers = _.get(json, 'request.headers', []); // Use headers for HTTP/GraphQL
    }
    bruJson.auth = _.get(json, 'request.auth', {});
    bruJson.script = _.get(json, 'request.script', {});
    bruJson.vars = {
      req: _.get(json, 'request.vars.req', []),
      res: _.get(json, 'request.vars.res', [])
    };
    // should we add assertions and tests for grpc requests?
    bruJson.assertions = _.get(json, 'request.assertions', []);
    bruJson.tests = _.get(json, 'request.tests', '');
    bruJson.settings = _.get(json, 'settings', {});
    bruJson.docs = _.get(json, 'request.docs', '');

    const bru = jsonToBruV2(bruJson);
    return bru;
  } catch (error) {
    throw error;
  }
};

export const bruCollectionToJson = (data: string | any, parsed: boolean = false): any => {
  try {
    const json = parsed ? data : _collectionBruToJson(data);

    const transformedJson: any = {
      request: {
        headers: _.get(json, 'headers', []),
        auth: _.get(json, 'auth', {}),
        script: _.get(json, 'script', {}),
        vars: _.get(json, 'vars', {}),
        tests: _.get(json, 'tests', '')
      },
      settings: _.get(json, 'settings', {}),
      docs: _.get(json, 'docs', '')
    };

    // add meta if it exists
    // this is only for folder bru file
    if (json.meta) {
      transformedJson.meta = {
        name: json.meta.name
      };

      // Include seq if it exists
      if (json.meta.seq !== undefined) {
        const sequence = json.meta.seq;
        transformedJson.meta.seq = !isNaN(sequence) ? Number(sequence) : 1;
      }
    }

    // add oauth2 additional parameters if they exist
    const hasOauth2GrantType = json?.auth?.oauth2?.grantType;
    if (hasOauth2GrantType) {
      const additionalParameters = getOauth2AdditionalParameters(json);
      const hasAdditionalParameters = Object.keys(additionalParameters).length > 0;
      if (hasAdditionalParameters) {
        transformedJson.request.auth.oauth2.additionalParameters = additionalParameters;
      }
    }

    return transformedJson;
  } catch (error) {
    return Promise.reject(error);
  }
};

export const jsonCollectionToBru = (json: any, isFolder?: boolean): string => {
  try {
    const collectionBruJson: any = {
      headers: _.get(json, 'request.headers', []),
      script: {
        req: _.get(json, 'request.script.req', ''),
        res: _.get(json, 'request.script.res', '')
      },
      vars: {
        req: _.get(json, 'request.vars.req', []),
        res: _.get(json, 'request.vars.res', [])
      },
      tests: _.get(json, 'request.tests', ''),
      auth: _.get(json, 'request.auth', {}),
      docs: _.get(json, 'docs', '')
    };

    // add meta if it exists
    // this is only for folder bru file
    if (json?.meta) {
      collectionBruJson.meta = {
        name: json.meta.name
      };

      // Include seq if it exists
      if (json.meta.seq !== undefined) {
        const sequence = json.meta.seq;
        collectionBruJson.meta.seq = !isNaN(sequence) ? Number(sequence) : 1;
      }
    }

    if (!isFolder) {
      collectionBruJson.auth = _.get(json, 'request.auth', {});
    }

    return _jsonToCollectionBru(collectionBruJson);
  } catch (error) {
    throw error;
  }
};

export const bruEnvironmentToJson = (bru: string): any => {
  try {
    const json = bruToEnvJsonV2(bru);

    // the app env format requires each variable to have a type
    // this need to be evaluated and safely removed
    // i don't see it being used in schema validation
    if (json && json.variables && json.variables.length) {
      _.each(json.variables, (v: any) => (v.type = 'text'));
    }

    return json;
  } catch (error) {
    return Promise.reject(error);
  }
};

export const jsonEnvironmentToBru = (json: any): string => {
  try {
    const bru = envJsonToBruV2(json);
    return bru;
  } catch (error) {
    throw error;
  }
};
