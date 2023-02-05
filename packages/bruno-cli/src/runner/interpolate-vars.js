const Mustache = require('mustache');
const { each, forOwn } = require('lodash');

// override the default escape function to prevent escaping
Mustache.escape = function (value) {
  return value;
};

const interpolateVars = (request, envVars = {}, collectionVariables ={}) => {
  const interpolate = (str) => {
    if(!str || !str.length || typeof str !== "string") {
      return str;
    }

    // collectionVariables take precedence over envVars
    const combinedVars = {
      ...envVars,
      ...collectionVariables
    };

    return Mustache.render(str, combinedVars);
  };

  request.url = interpolate(request.url);

  forOwn(request.headers, (value, key) => {
    request.headers[key] = interpolate(value);
  });

  if(request.headers["content-type"] === "application/json") {
    if(typeof request.data === "object") {
      try {
        let parsed = JSON.stringify(request.data);
        parsed = interpolate(parsed);
        request.data = JSON.parse(parsed);
      } catch (err) {
      }
    }

    if(typeof request.data === "string") {
      if(request.data.length) {
        request.data = interpolate(request.data);
      }
    }
  }

  each(request.params, (param) => {
    param.value = interpolate(param.value);
  });

  return request;
};

module.exports = interpolateVars;
