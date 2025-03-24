const _ = require('lodash');
const { bruToEnvJsonV2, bruToJsonV2, collectionBruToJson: _collectionBruToJson } = require('@usebruno/lang');

const collectionBruToJson = (bru) => {
  try {
    const json = _collectionBruToJson(bru);

    const transformedJson = {
      request: {
        headers: _.get(json, 'headers', []),
        auth: _.get(json, 'auth', {}),
        script: _.get(json, 'script', {}),
        vars: _.get(json, 'vars', {}),
        tests: _.get(json, 'tests', '')
      }
    };

    // add meta if it exists
    // this is only for folder bru file
    // in the future, all of this will be replaced by standard bru lang
    const sequence = _.get(json, 'meta.seq');
    if (json?.meta) {
      transformedJson.meta = {
        name: json.meta.name,
        seq: !isNaN(sequence) ? Number(sequence) : 1
      };
    }

    return transformedJson;
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * The transformer function for converting a BRU file to JSON.
 *
 * We map the json response from the bru lang and transform it into the DSL
 * format that is used by the bruno app
 *
 * @param {string} bru The BRU file content.
 * @returns {object} The JSON representation of the BRU file.
 */
const bruToJson = (bru) => {
  try {
    const json = bruToJsonV2(bru);

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
      seq: !isNaN(sequence) ? Number(sequence) : 1,
      request: {
        url: _.get(json, requestType === 'grpc-request' ? 'grpc.url' : 'http.url'),
        auth: _.get(json, 'auth', {}),
        params: _.get(json, 'params', []),
        headers: _.get(json, 'headers', []),
        vars: _.get(json, 'vars', []),
        assertions: _.get(json, 'assertions', []),
        script: _.get(json, 'script', {}),
        tests: _.get(json, 'tests', '')
      }
    };

    if (requestType === 'grpc-request') {
      const selectedMethod = _.get(json, 'grpc.method');
      if(selectedMethod) transformedJson.request.method = selectedMethod;
      const selectedMethodType = _.get(json, 'grpc.methodType');
      if(selectedMethodType) transformedJson.request.methodType = selectedMethodType;
      const protoPath = _.get(json, 'grpc.protoPath');
      if(protoPath) transformedJson.request.protoPath = protoPath;
      transformedJson.request.auth.mode = _.get(json, 'grpc.auth', 'none');
      transformedJson.request.body = _.get(json, 'body', {
        mode: 'grpc',
        grpc: [{
          name: 'message 1',
          content: '{}'
        }]
      });
    } else {
      transformedJson.request.method = _.upperCase(_.get(json, 'http.method'));
      transformedJson.request.auth.mode = _.get(json, 'http.auth', 'none');
      transformedJson.request.body = _.get(json, 'body', {});
      transformedJson.request.body.mode = _.get(json, 'http.body', 'none');
    }



    return transformedJson;
  } catch (err) {
    return Promise.reject(err);
  }
};

const bruToEnvJson = (bru) => {
  try {
    return bruToEnvJsonV2(bru);
  } catch (err) {
    return Promise.reject(err);
  }
};

const getEnvVars = (environment = {}) => {
  const variables = environment.variables;
  if (!variables || !variables.length) {
    return {};
  }

  const envVars = {};
  _.each(variables, (variable) => {
    if (variable.enabled) {
      envVars[variable.name] = variable.value;
    }
  });

  return envVars;
};

const options = {};
const getOptions = () => {
  return options;
};

module.exports = {
  bruToJson,
  bruToEnvJson,
  getEnvVars,
  getOptions,
  collectionBruToJson
};
