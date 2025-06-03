const _ = require('lodash');
const {
  bruToJsonV2,
  jsonToBruV2,
  bruToEnvJsonV2,
  envJsonToBruV2,
  collectionBruToJson: _collectionBruToJson,
  jsonToCollectionBru: _jsonToCollectionBru
} = require('@usebruno/lang');

/**
 * Convert BRU format to JSON for a request
 * @param {string} data - BRU content
 * @param {boolean} parsed - Whether the data is already parsed
 * @returns {Object} Parsed JSON object
 */
const bruRequestToJson = (data, parsed = false) => {
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
      seq: !isNaN(sequence) ? Number(sequence) : 1,
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

    return transformedJson;
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * Convert JSON to BRU format for a request
 * @param {Object} json - JSON object to convert
 * @returns {string} BRU content
 */
const jsonRequestToBru = (json) => {
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
        seq: !isNaN(sequence) ? Number(sequence) : 1
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
      docs: _.get(json, 'request.docs', '')
    };

    const bru = jsonToBruV2(bruJson);
    return bru;
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Convert BRU format to JSON for a collection or folder
 * @param {string} data - BRU content
 * @param {boolean} parsed - Whether the data is already parsed
 * @returns {Object} Parsed JSON object
 */
const bruCollectionToJson = (data, parsed = false) => {
  try {
    const json = parsed ? data : _collectionBruToJson(data);

    const transformedJson = {
      request: {
        headers: _.get(json, 'headers', []),
        auth: _.get(json, 'auth', {}),
        script: _.get(json, 'script', {}),
        vars: _.get(json, 'vars', {}),
        tests: _.get(json, 'tests', '')
      },
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

    return transformedJson;
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Convert JSON to BRU format for a collection or folder
 * @param {Object} json - JSON object to convert
 * @param {boolean} isFolder - Whether this is a folder (as opposed to a collection)
 * @returns {string} BRU content
 */
const jsonCollectionToBru = (json, isFolder) => {
  try {
    const collectionBruJson = {
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
    return Promise.reject(error);
  }
};

/**
 * Convert BRU format to JSON for an environment
 * @param {string} bru - BRU content
 * @returns {Object} Parsed JSON object
 */
const bruEnvironmentToJson = (bru) => {
  try {
    const json = bruToEnvJsonV2(bru);

    // the app env format requires each variable to have a type
    // this need to be evaluated and safely removed
    // i don't see it being used in schema validation
    if (json && json.variables && json.variables.length) {
      _.each(json.variables, (v) => (v.type = 'text'));
    }

    return json;
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Convert JSON to BRU format for an environment
 * @param {Object} json - JSON object to convert
 * @returns {string} BRU content
 */
const jsonEnvironmentToBru = (json) => {
  try {
    const bru = envJsonToBruV2(json);
    return bru;
  } catch (error) {
    return Promise.reject(error);
  }
};

module.exports = {
  bruRequestToJson,
  jsonRequestToBru,
  bruCollectionToJson,
  jsonCollectionToBru,
  bruEnvironmentToJson,
  jsonEnvironmentToBru
}; 