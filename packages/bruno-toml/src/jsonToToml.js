const stringify = require('../lib/stringify');
const { get, each } = require('lodash');

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
    formattedJson.headers = {};
    each(json.headers, (header) => {
      formattedJson.headers[header.name] = header.value;
    });
  }

  return stringify(formattedJson);
};

module.exports = jsonToToml;
