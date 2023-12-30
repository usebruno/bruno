const stringify = require('../lib/stringify');
const { get, each, filter } = require('lodash');

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
  }

  return stringify(formattedJson);
};

module.exports = jsonToToml;
