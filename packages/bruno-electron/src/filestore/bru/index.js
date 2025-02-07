const _ = require('lodash');
const {
  bruToJsonV2,
  jsonToBruV2,
  bruToEnvJsonV2,
  envJsonToBruV2,
  collectionBruToJson,
  jsonToCollectionBru
} = require('@usebruno/lang');
const BruParserWorker = require('./workers');

const bruParserWorker = new BruParserWorker();

/**
 * The transformer function for converting a BRU file to JSON.
 *
 * We map the json response from the bru lang and transform it into the DSL
 * format that the app uses
 *
 * @param {string} bru The BRU file content.
 * @returns {object} The JSON representation of the BRU file.
 */
const parseRequest = async (bru, options = {}) => {
  try {
    let json;

    if(options.useWorker) {
      json = await bruParserWorker?.bruToJson(data);
    } else {
      json = bruToJsonV2(bru);
    }

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
 * The transformer function for converting a JSON to BRU file.
 *
 * We map the json response from the app and transform it into the DSL
 * format that the bru lang understands
 *
 * @param {object} json The JSON representation of the BRU file.
 * @returns {string} The BRU file content.
 */
const stringifyRequest = async (json, options = {}) => {
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

  if(options.useWorker) {
    return await bruParserWorker?.jsonToBru(bruJson);
  } else {
    return jsonToBruV2(bruJson);
  }
};

const parseCollection = async (bru) => {
  try {
    const json = collectionBruToJson(bru);

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

    return transformedJson;
  } catch (error) {
    return Promise.reject(error);
  }
};

const stringifyCollection = async (json) => {
  try {
    const collectionBruJson = {
      headers: _.get(json, 'request.headers', []),
      auth: _.get(json, 'request.auth', {}),
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

    return jsonToCollectionBru(collectionBruJson);
  } catch (error) {
    return Promise.reject(error);
  }
};

const parseFolder = async (bru) => {
  try {
    const json = collectionBruToJson(bru);

    const transformedJson = {
      meta: {
        name: _.get(json, 'meta.name')
      },
      request: {
        headers: _.get(json, 'headers', []),
        auth: _.get(json, 'auth', {}),
        script: _.get(json, 'script', {}),
        vars: _.get(json, 'vars', {}),
        tests: _.get(json, 'tests', '')
      },
      docs: _.get(json, 'docs', '')
    };

    return transformedJson;
  } catch (error) {
    return Promise.reject(error);
  }
};

const stringifyFolder = async (json) => {
  try {
    const folderBruJson = {
      meta: {
        name: _.get(json, 'meta.name')
      },
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

    return jsonToCollectionBru(folderBruJson);
  } catch (error) {
    return Promise.reject(error);
  }
};

const parseEnvironment = async (bru) => {
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

const stringifyEnvironment = async (json) => {
  try {
    const bru = envJsonToBruV2(json);
    return bru;
  } catch (error) {
    return Promise.reject(error);
  }
};


module.exports = {
  parseRequest,
  stringifyRequest,
  parseCollection,
  stringifyCollection,
  parseFolder,
  stringifyFolder,
  parseEnvironment,
  stringifyEnvironment
};
