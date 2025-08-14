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
    if (requestType === 'http') {
      requestType = 'http-request';
    } else if (requestType === 'graphql') {
      requestType = 'graphql-request';
    } else {
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
        method: _.upperCase(_.get(json, 'http.method')),
        url: _.get(json, 'http.url'),
        params: _.get(json, 'params', []),
        headers: _.get(json, 'headers', []),
        auth: _.get(json, 'auth', {}),
        body: _.get(json, 'body', {}),
        script: _.get(json, 'script', {}),
        vars: _.get(json, 'vars', {}),
        assertions: _.get(json, 'assertions', []),
        tests: _.get(json, 'tests', ''),
        docs: _.get(json, 'docs', '')
      }
    };

    transformedJson.request.auth.mode = _.get(json, 'http.auth', 'none');
    transformedJson.request.body.mode = _.get(json, 'http.body', 'none');

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
  } catch (e) {
    return Promise.reject(e);
  }
};

export const jsonRequestToBru = (json: any): string => {
  try {
    let type = _.get(json, 'type');
    if (type === 'http-request') {
      type = 'http';
    } else if (type === 'graphql-request') {
      type = 'graphql';
    } else {
      type = 'http';
    }

    const sequence = _.get(json, 'seq');
    const bruJson = {
      meta: {
        name: _.get(json, 'name'),
        type: type,
        seq: !_.isNaN(sequence) ? Number(sequence) : 1,
        tags: _.get(json, 'tags', []),
      },
      http: {
        method: _.lowerCase(_.get(json, 'request.method')),
        url: _.get(json, 'request.url'),
        auth: _.get(json, 'request.auth.mode', 'none'),
        body: _.get(json, 'request.body.mode', 'none')
      },
      params: _.get(json, 'request.params', []),
      headers: _.get(json, 'request.headers', []),
      auth: _.get(json, 'request.auth', {}),
      body: _.get(json, 'request.body', {}),
      script: _.get(json, 'request.script', {}),
      vars: {
        req: _.get(json, 'request.vars.req', []),
        res: _.get(json, 'request.vars.res', [])
      },
      assertions: _.get(json, 'request.assertions', []),
      tests: _.get(json, 'request.tests', ''),
      settings: _.get(json, 'settings', {}),
      docs: _.get(json, 'request.docs', '')
    };

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