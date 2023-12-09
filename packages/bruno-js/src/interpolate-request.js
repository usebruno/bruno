const Handlebars = require('handlebars');
const { each, forOwn } = require('lodash');
const interpolateString = require('./interpolate-string');

const getContentType = (headers = {}) => {
  let contentType = '';
  forOwn(headers, (value, key) => {
    if (key && key.toLowerCase() === 'content-type') {
      contentType = value;
    }
  });

  return contentType;
};

const interpolateRequest = (request, envVars = {}, collectionVariables = {}, processEnvVars = {}) => {
  const interpolate = (str) => {
    return interpolateString(str, envVars, collectionVariables, processEnvVars);
  };

  request.url = interpolate(request.url);

  forOwn(request.headers, (value, key) => {
    delete request.headers[key];
    request.headers[interpolate(key)] = interpolate(value);
  });

  const contentType = getContentType(request.headers);

  if (contentType.includes('json')) {
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
  } else if (contentType === 'application/x-www-form-urlencoded') {
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

  // todo: we have things happening in two places w.r.t basic auth
  //       need to refactor this in the future
  // the request.auth (basic auth) object gets set inside the prepare-request.js file
  if (request.auth) {
    const username = interpolate(request.auth.username) || '';
    const password = interpolate(request.auth.password) || '';

    // use auth header based approach and delete the request.auth object
    request.headers['authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    delete request.auth;
  }

  // interpolate vars for aws sigv4 auth
  if (request.awsv4config) {
    request.awsv4config.accessKeyId = interpolate(request.awsv4config.accessKeyId) || '';
    request.awsv4config.secretAccessKey = interpolate(request.awsv4config.secretAccessKey) || '';
    request.awsv4config.sessionToken = interpolate(request.awsv4config.sessionToken) || '';
    request.awsv4config.service = interpolate(request.awsv4config.service) || '';
    request.awsv4config.region = interpolate(request.awsv4config.region) || '';
    request.awsv4config.profileName = interpolate(request.awsv4config.profileName) || '';
  }

  // interpolate vars for digest auth
  if (request.digestConfig) {
    request.digestConfig.username = interpolate(request.digestConfig.username) || '';
    request.digestConfig.password = interpolate(request.digestConfig.password) || '';
  }

  return request;
};

module.exports = interpolateVars;
