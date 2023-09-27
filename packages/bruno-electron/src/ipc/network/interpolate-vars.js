const Handlebars = require('handlebars');
const { each, forOwn, cloneDeep } = require('lodash');

const interpolateEnvVars = (str, processEnvVars) => {
  if (!str || !str.length || typeof str !== 'string') {
    return str;
  }

  const template = Handlebars.compile(str, { noEscape: true });

  return template({
    process: {
      env: {
        ...processEnvVars
      }
    }
  });
};

const interpolateVars = (request, envVars = {}, collectionVariables = {}, processEnvVars = {}) => {
  // we clone envVars because we don't want to modify the original object
  envVars = cloneDeep(envVars);

  // envVars can inturn have values as {{process.env.VAR_NAME}}
  // so we need to interpolate envVars first with processEnvVars
  forOwn(envVars, (value, key) => {
    envVars[key] = interpolateEnvVars(value, processEnvVars);
  });

  const interpolate = (str) => {
    if (!str || !str.length || typeof str !== 'string') {
      return str;
    }

    const template = Handlebars.compile(str, { noEscape: true });

    // collectionVariables take precedence over envVars
    const combinedVars = {
      ...envVars,
      ...collectionVariables,
      process: {
        env: {
          ...processEnvVars
        }
      }
    };

    return template(combinedVars);
  };

  request.url = interpolate(request.url);

  forOwn(request.headers, (value, key) => {
    request.headers[key] = interpolate(value);
  });

  if (request.headers['content-type'] === 'application/json') {
    if (typeof request.data === 'object') {
      try {
        let parsed = JSON.stringify(request.data);
        parsed = interpolate(parsed);
        request.data = JSON.parse(parsed);
      } catch (err) {}
    }

    if (typeof request.data === 'string') {
      if (request.data.length) {
        request.data = interpolate(request.data);
      }
    }
  } else if (request.headers['content-type'] === 'application/x-www-form-urlencoded') {
    if (typeof request.data === 'object') {
      try {
        let parsed = JSON.stringify(request.data);
        parsed = interpolate(parsed);
        request.data = JSON.parse(parsed);
      } catch (err) {}
    }
  } else {
    request.data = interpolate(request.data);
  }

  each(request.params, (param) => {
    param.value = interpolate(param.value);
  });

  if (request.proxy) {
    request.proxy.protocol = interpolate(request.proxy.protocol);
    request.proxy.hostname = interpolate(request.proxy.hostname);
    request.proxy.port = interpolate(request.proxy.port);

    if (request.proxy.auth) {
      request.proxy.auth.username = interpolate(request.proxy.auth.username);
      request.proxy.auth.password = interpolate(request.proxy.auth.password);
    }
  }

  return request;
};

module.exports = interpolateVars;
