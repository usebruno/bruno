const _ = require('lodash');
const {
  bruToJsonV2,
  jsonToBruV2,
  bruToEnvJsonV2,
  envJsonToBruV2,
  collectionBruToJson: _collectionBruToJson,
  jsonToCollectionBru: _jsonToCollectionBru
} = require('@usebruno/lang');
const BruParserWorker = require('./workers');

const bruParserWorker = new BruParserWorker();

const collectionBruToJson = async (data, parsed = false) => {
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
    // in the future, all of this will be replaced by standard bru lang
    if (json.meta) {
      transformedJson.meta = {
        name: json.meta.name
      };
    }

    return transformedJson;
  } catch (error) {
    return Promise.reject(error);
  }
};

const jsonToCollectionBru = async (json, isFolder) => {
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
      auth: _.get(json, 'request.auth', {}),
      docs: _.get(json, 'docs', '')
    };

    // add meta if it exists
    // this is only for folder bru file
    // in the future, all of this will be replaced by standard bru lang
    if (json?.meta) {
      collectionBruJson.meta = {
        name: json.meta.name
      };
    }

    return _jsonToCollectionBru(collectionBruJson);
  } catch (error) {
    return Promise.reject(error);
  }
};

const bruToEnvJson = async (bru) => {
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

const envJsonToBru = async (json) => {
  try {
    const bru = envJsonToBruV2(json);
    return bru;
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Creates a bruJson structure for any request type
 * 
 * @param {object} json The JSON representation from the app
 * @returns {object} The bruJson structure to be converted to BRU format
 */
const createBruJson = (json) => {
  console.log("json from createBruJson", json);
  let type = _.get(json, 'type');
  if (type === 'http-request') {
    type = 'http';
  } else if (type === 'graphql-request') {
    type = 'graphql';
  } else if (type === 'grpc-request') {
    type = 'grpc';
  } else {
    type = 'http';
  }

  const sequence = _.get(json, 'seq');
  
  // Start with the common meta section
  const bruJson = {
    meta: {
      name: _.get(json, 'name'),
      type: type,
      seq: !isNaN(sequence) ? Number(sequence) : 1
    }
  };

  // For HTTP and GraphQL requests, maintain the current structure
  if (type === 'http' || type === 'graphql') {
    bruJson.http = {
      method: _.lowerCase(_.get(json, 'request.method')),
      url: _.get(json, 'request.url'),
      auth: _.get(json, 'request.auth.mode', 'none'),
      body: _.get(json, 'request.body.mode', 'none')
    };
    bruJson.params = _.get(json, 'request.params', []);
  } 
  // For gRPC, add gRPC-specific structure but maintain field names
  else if (type === 'grpc') {
    bruJson.grpc = {
      url: _.get(json, 'request.url'),
      auth: _.get(json, 'request.auth.mode', 'none'),
      proto_path: _.get(json, 'request.proto_path', ''),
      body: _.get(json, 'request.body.mode', 'json')
    };
    // Only add method if it exists
    const method = _.get(json, 'request.method');
    if (method) bruJson.grpc.method = method;
  }

  // Common fields for all request types
  bruJson.headers = _.get(json, 'request.headers', []); // Use headers for all types (including gRPC metadata)
  bruJson.auth = _.get(json, 'request.auth', {});
  bruJson.body = _.get(json, 'request.body', {}); // Use body for all types (including gRPC message)
  bruJson.script = _.get(json, 'request.script', {});
  bruJson.vars = {
    req: _.get(json, 'request.vars.req', []),
    res: _.get(json, 'request.vars.res', [])
  };
  // should we add assertions and tests for grpc requests?
  bruJson.assertions = _.get(json, 'request.assertions', []);
  bruJson.tests = _.get(json, 'request.tests', '');

  bruJson.docs = _.get(json, 'request.docs', '');

  return bruJson;
};

/**
 * The transformer function for converting a BRU file to JSON.
 *
 * We map the json response from the bru lang and transform it into the DSL
 * format that the app uses
 *
 * @param {string} data The BRU file content.
 * @returns {object} The JSON representation of the BRU file.
 */
const bruToJson = (data, parsed = false) => {
  try {
    const json = parsed ? data : bruToJsonV2(data);

    let requestType = _.get(json, 'meta.type');
    if (requestType === 'http') {
      requestType = 'http-request';
    } else if (requestType === 'graphql') {
      requestType = 'graphql-request';
    } else if (requestType === 'grpc') {
      requestType = 'grpc-request';
    } else {
      requestType = 'http-request';
    }

    const sequence = _.get(json, 'meta.seq');
    const transformedJson = {
      type: requestType,
      name: _.get(json, 'meta.name'),
      seq: !isNaN(sequence) ? Number(sequence) : 1,
      request: {
        url: _.get(json, requestType === 'grpc-request' ? 'grpc.url' : 'http.url'),
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

    // Add request type specific fields
    if (requestType === 'grpc-request') {
      // For gRPC, add selectedMethod
      const selectedMethod = _.get(json, 'grpc.method');
      if(selectedMethod) transformedJson.request.method = selectedMethod;
      transformedJson.request.auth.mode = _.get(json, 'grpc.auth', 'none');
      transformedJson.request.body.mode = _.get(json, 'grpc.body', 'json');
      
      // If there's a gRPC specific body
      if (_.get(json, 'body.grpc')) {
        transformedJson.request.body = {
          mode: 'json', // Default to JSON for gRPC
          json: _.get(json, 'body.grpc.json', null)
        };
      }
    } else {
      // For HTTP and GraphQL
      transformedJson.request.method = _.upperCase(_.get(json, 'http.method'));
      transformedJson.request.params = _.get(json, 'params', []);
      transformedJson.request.auth.mode = _.get(json, 'http.auth', 'none');
      transformedJson.request.body.mode = _.get(json, 'http.body', 'none');
    }

    return transformedJson;
  } catch (e) {
    return Promise.reject(e);
  }
};

const bruToJsonViaWorker = async (data) => {
  try {
    const json = await bruParserWorker?.bruToJson(data);
    return bruToJson(json, true);
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * The transformer function for converting a JSON to BRU file.
 *
 * We map the json response from the app and transform it into the DSL
 * format that the bru lang understands
 *
 * @param {object} json The JSON representation of the BRU file.
 * @returns {string} The BRU file content.
 */
const jsonToBru = async (json) => {
  const bruJson = createBruJson(json);
  const bru = jsonToBruV2(bruJson);
  return bru;
};

const jsonToBruViaWorker = async (json) => {
  const bruJson = createBruJson(json);
  const bru = await bruParserWorker?.jsonToBru(bruJson);
  return bru;
};
 
module.exports = {
  bruToJson,
  bruToJsonViaWorker,
  jsonToBru,
  bruToEnvJson,
  envJsonToBru,
  collectionBruToJson,
  jsonToCollectionBru,
  jsonToBruViaWorker
};
