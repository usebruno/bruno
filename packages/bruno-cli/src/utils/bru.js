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
    if (requestType === 'http') {
      requestType = 'http-request';
    } else if (requestType === 'graphql') {
      requestType = 'graphql-request';
    } else {
      requestType = 'http';
    }

    const sequence = _.get(json, 'meta.seq');

    const transformedJson = {
      type: requestType,
      name: _.get(json, 'meta.name'),
      seq: !isNaN(sequence) ? Number(sequence) : 1,
      request: {
        method: _.upperCase(_.get(json, 'http.method')),
        url: _.get(json, 'http.url'),
        auth: _.get(json, 'auth', {}),
        params: _.get(json, 'params', []),
        headers: _.get(json, 'headers', []),
        body: _.get(json, 'body', {}),
        vars: _.get(json, 'vars', []),
        assertions: _.get(json, 'assertions', []),
        script: _.get(json, 'script', ''),
        tests: _.get(json, 'tests', '')
      }
    };

    transformedJson.request.body.mode = _.get(json, 'http.body', 'none');
    transformedJson.request.auth.mode = _.get(json, 'http.auth', 'none');

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
