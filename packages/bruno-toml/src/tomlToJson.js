const Toml = require('@iarna/toml');
const { has, each } = require('lodash');

const tomlToJson = (toml) => {
  const json = Toml.parse(toml);

  const formattedJson = {
    meta: {
      name: json.meta.name,
      type: json.meta.type,
      seq: json.meta.seq
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

  return formattedJson;
};

module.exports = tomlToJson;
