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

    // headers are stored in raw format if they contain duplicate keys
    if (has(json.headers, 'raw')) {
      let parsedHeaders = JSON.parse(json.headers.raw);

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
