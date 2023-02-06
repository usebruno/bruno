const _ = require('lodash');
const {
  bruToJson: bruToJsonV1,
  bruToJsonV2,
  jsonToBruV2
} = require('@usebruno/lang');

/**
 * The transformer function for converting a BRU file to JSON.
 * 
 * We map the json response from the bru lang and transform it into the DSL
 * format that the app users
 * 
 * @param {string} bru The BRU file content.
 * @returns {object} The JSON representation of the BRU file.
 */
const bruToJson = (bru) => {
  try {
    const json = bruToJsonV2(bru);

    let requestType = _.get(json, "meta.type");
    if(requestType === "http") {
      requestType = "http-request"
    } else if(requestType === "graphql") {
      requestType = "graphql-request";
    } else {
      requestType = "http";
    }

    const sequence = _.get(json, "meta.seq")

    const transformedJson = {
      "type": requestType,
      "name": _.get(json, "meta.name"),
      "seq": !isNaN(sequence) ? Number(sequence) : 1,
      "request": {
        "method": _.upperCase(_.get(json, "http.method")),
        "url": _.get(json, "http.url"),
        "params": _.get(json, "query", []),
        "headers":  _.get(json, "headers", []),
        "body":  _.get(json, "body", {}),
        "script": _.get(json, "script", ""),
        "tests": _.get(json, "tests", "")
      }
    };

    transformedJson.request.body.mode = _.get(json, "http.mode", "none");

    return transformedJson;
  } catch (e) {
    return bruToJsonV1(bru);
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
const jsonToBru = (json) => {
  let type = _.get(json, 'type');
  if (type === 'http-request') {
    type = "http";
  } else if (type === 'graphql-request') {
    type = "graphql";
  } else {
    type = "http";
  }

  const bruJson = {
    meta: {
      name: _.get(json, 'name'),
      type: type,
      seq: _.get(json, 'seq'),
    },
    http: {
      method: _.lowerCase(_.get(json, 'request.method')),
      url: _.get(json, 'request.url'),
      mode: _.get(json, 'request.body.mode', 'none')
    },
    query: _.get(json, 'request.params', []),
    headers: _.get(json, 'request.headers', []),
    body: _.get(json, 'request.body', {}),
    script: _.get(json, 'script', ''),
    tests: _.get(json, 'tests', ''),
  };

  return jsonToBruV2(bruJson);
};

module.exports = {
  bruToJson,
  jsonToBru
};
