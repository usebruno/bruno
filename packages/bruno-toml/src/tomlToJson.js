const Toml = require('@iarna/toml');

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
    Object.keys(json.headers).forEach((key) => {
      formattedJson.headers.push({
        name: key,
        value: json.headers[key],
        enabled: true
      });
    });
  }

  return formattedJson;
};

module.exports = tomlToJson;
