const Toml = require('@iarna/toml');
const { has, each, get } = require('lodash');

const stripNewlineAtEnd = (str) => {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str.replace(/\n$/, '');
};

const tomlToJson = (toml) => {
  const json = Toml.parse(toml);

  const formattedJson = {
    meta: {
      name: get(json, 'meta.name', ''),
      type: get(json, 'meta.type', ''),
      seq: get(json, 'meta.seq', 0)
    },
    http: {
      method: json.http.method,
      url: json.http.url
    }
  };

  if (json.headers) {
    formattedJson.headers = [];

    // headers are stored in plain json format if they contain duplicate keys
    // the json is stored in a stringified format in the bru key
    if (has(json.headers, 'bru')) {
      let parsedHeaders = JSON.parse(json.headers.bru);

      each(parsedHeaders, (header) => {
        formattedJson.headers.push({
          name: header.name,
          value: header.value,
          enabled: header.enabled
        });
      });
    } else {
      Object.keys(json.headers).forEach((key) => {
        if (key === 'disabled') {
          Object.keys(json.headers['disabled']).forEach((disabledKey) => {
            formattedJson.headers.push({
              name: disabledKey,
              value: json.headers[key][disabledKey],
              enabled: false
            });
          });
          return;
        }

        formattedJson.headers.push({
          name: key,
          value: json.headers[key],
          enabled: true
        });
      });
    }
  }

  if (json.script) {
    if (json.script['pre-request']) {
      formattedJson.script = formattedJson.script || {};
      formattedJson.script.req = stripNewlineAtEnd(json.script['pre-request']);
    }

    if (json.script['post-response']) {
      formattedJson.script = formattedJson.script || {};
      formattedJson.script.res = stripNewlineAtEnd(json.script['post-response']);
    }

    if (json.script['tests']) {
      formattedJson.tests = stripNewlineAtEnd(json.script['tests']);
    }
  }

  return formattedJson;
};

module.exports = tomlToJson;
