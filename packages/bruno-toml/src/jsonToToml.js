const stringify = require('../lib/stringify');
const { get, each, filter } = require('lodash');

const keyValPairHasDuplicateKeys = (keyValPair) => {
  if (!keyValPair || !Array.isArray(keyValPair) || !keyValPair.length) {
    return false;
  }

  const names = keyValPair.map((pair) => pair.name);
  const uniqueNames = new Set(names);

  return names.length !== uniqueNames.size;
};

// these keys are reserved: disabled, description, enum
const keyValPairHasReservedKeys = (keyValPair) => {
  if (!keyValPair || !Array.isArray(keyValPair) || !keyValPair.length) {
    return false;
  }

  const reservedKeys = ['disabled', 'description', 'enum', 'bru'];
  const names = keyValPair.map((pair) => pair.name);

  return names.some((name) => reservedKeys.includes(name));
};

/**
 * Json to Toml
 *
 * Note: Bruno always append a new line at the end of text blocks
 *       This is to aid readability when viewing the toml representation of the request
 *       The newline is removed when converting back to json
 *
 * @param {object} json
 * @returns string
 */
const jsonToToml = (json) => {
  const formattedJson = {
    meta: {
      name: get(json, 'meta.name'),
      type: get(json, 'meta.type'),
      seq: get(json, 'meta.seq')
    },
    http: {
      method: get(json, 'http.method'),
      url: get(json, 'http.url', '')
    }
  };

  if (json.headers && json.headers.length) {
    const hasDuplicateHeaders = keyValPairHasDuplicateKeys(json.headers);
    const hasReservedHeaders = keyValPairHasReservedKeys(json.headers);

    if (!hasDuplicateHeaders && !hasReservedHeaders) {
      const enabledHeaders = filter(json.headers, (header) => header.enabled);
      const disabledHeaders = filter(json.headers, (header) => !header.enabled);
      each(enabledHeaders, (header) => {
        formattedJson.headers = formattedJson.headers || {};
        formattedJson.headers[header.name] = header.value;
      });
      each(disabledHeaders, (header) => {
        formattedJson.headers = formattedJson.headers || {};
        formattedJson.headers.disabled = formattedJson.headers.disabled || {};
        formattedJson.headers.disabled[header.name] = header.value;
      });
    } else {
      formattedJson.headers = {
        bru: JSON.stringify(json.headers, null, 2) + '\n'
      };
    }
  }

  if (json.script) {
    let preRequestScript = get(json, 'script.req', '');
    if (preRequestScript.trim().length > 0) {
      formattedJson.script = formattedJson.script || {};
      formattedJson.script['pre-request'] = preRequestScript + '\n';
    }

    let postResponseScript = get(json, 'script.res', '');
    if (postResponseScript.trim().length > 0) {
      formattedJson.script = formattedJson.script || {};
      formattedJson.script['post-response'] = postResponseScript + '\n';
    }
  }

  if (json.tests) {
    let testsScript = get(json, 'tests', '');
    if (testsScript.trim().length > 0) {
      formattedJson.script = formattedJson.script || {};
      formattedJson.script['tests'] = testsScript + '\n';
    }
  }

  if (json.settings && Object.keys(json.settings).length > 0) {
    formattedJson.settings = {
      encodeUrl: typeof settings.encodeUrl === 'boolean' ? settings.encodeUrl : settings.encodeUrl === 'true'
    };
  }

  return stringify(formattedJson);
};

module.exports = jsonToToml;
