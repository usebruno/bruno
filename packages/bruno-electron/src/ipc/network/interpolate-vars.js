const { interpolate } = require('@usebruno/common');
const { each, forOwn, cloneDeep } = require('lodash');

const getContentType = (headers = {}) => {
  let contentType = '';
  forOwn(headers, (value, key) => {
    if (key && key.toLowerCase() === 'content-type') {
      contentType = value;
    }
  });

  return contentType;
};

const interpolateVars = (request, envVars = {}, collectionVariables = {}, processEnvVars = {}) => {
  // we clone envVars because we don't want to modify the original object
  envVars = cloneDeep(envVars);

  // envVars can inturn have values as {{process.env.VAR_NAME}}
  // so we need to interpolate envVars first with processEnvVars
  forOwn(envVars, (value, key) => {
    envVars[key] = interpolate(value, {
      process: {
        env: {
          ...processEnvVars
        }
      }
    });
  });

  const _interpolate = (str) => {
    if (!str || !str.length || typeof str !== 'string') {
      return str;
    }

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

    return interpolate(str, combinedVars);
  };

  request.url = _interpolate(request.url);

  forOwn(request.headers, (value, key) => {
    delete request.headers[key];
    request.headers[_interpolate(key)] = _interpolate(value);
  });

  const contentType = getContentType(request.headers);

  if (contentType.includes('json')) {
    if (typeof request.data === 'object') {
      try {
        let parsed = JSON.stringify(request.data);
        parsed = _interpolate(parsed);
        request.data = JSON.parse(parsed);
      } catch (err) {}
    }

    if (typeof request.data === 'string') {
      if (request.data.length) {
        request.data = _interpolate(request.data);
      }
    }
  } else if (contentType === 'application/x-www-form-urlencoded') {
    if (typeof request.data === 'object') {
      try {
        let parsed = JSON.stringify(request.data);
        parsed = _interpolate(parsed);
        request.data = JSON.parse(parsed);
      } catch (err) {}
    }
  } else {
    request.data = _interpolate(request.data);
  }

  each(request.params, (param) => {
    param.value = _interpolate(param.value);
  });

  if (request.proxy) {
    request.proxy.protocol = _interpolate(request.proxy.protocol);
    request.proxy.hostname = _interpolate(request.proxy.hostname);
    request.proxy.port = _interpolate(request.proxy.port);

    if (request.proxy.auth) {
      request.proxy.auth.username = _interpolate(request.proxy.auth.username);
      request.proxy.auth.password = _interpolate(request.proxy.auth.password);
    }
  }

  // todo: we have things happening in two places w.r.t basic auth
  // need to refactor this in the future
  // the request.auth (basic auth) object gets set inside the prepare-request.js file
  if (request.auth) {
    const username = _interpolate(request.auth.username) || '';
    const password = _interpolate(request.auth.password) || '';
    // use auth header based approach and delete the request.auth object
    request.headers['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    delete request.auth;
  }

  if (request?.oauth2?.grantType) {
    let username, password, scope, clientId, clientSecret;
    switch (request.oauth2.grantType) {
      case 'password':
        username = _interpolate(request.oauth2.username) || '';
        password = _interpolate(request.oauth2.password) || '';
        clientId = _interpolate(request.oauth2.clientId) || '';
        clientSecret = _interpolate(request.oauth2.clientSecret) || '';
        scope = _interpolate(request.oauth2.scope) || '';
        request.oauth2.accessTokenUrl = _interpolate(request.oauth2.accessTokenUrl) || '';
        request.oauth2.username = username;
        request.oauth2.password = password;
        request.oauth2.clientId = clientId;
        request.oauth2.clientSecret = clientSecret;
        request.oauth2.scope = scope;
        break;
      case 'authorization_code':
        request.oauth2.callbackUrl = _interpolate(request.oauth2.callbackUrl) || '';
        request.oauth2.authorizationUrl = _interpolate(request.oauth2.authorizationUrl) || '';
        request.oauth2.accessTokenUrl = _interpolate(request.oauth2.accessTokenUrl) || '';
        request.oauth2.clientId = _interpolate(request.oauth2.clientId) || '';
        request.oauth2.clientSecret = _interpolate(request.oauth2.clientSecret) || '';
        request.oauth2.scope = _interpolate(request.oauth2.scope) || '';
        request.oauth2.pkce = _interpolate(request.oauth2.pkce) || false;
        break;
      case 'client_credentials':
        clientId = _interpolate(request.oauth2.clientId) || '';
        clientSecret = _interpolate(request.oauth2.clientSecret) || '';
        scope = _interpolate(request.oauth2.scope) || '';
        request.oauth2.accessTokenUrl = _interpolate(request.oauth2.accessTokenUrl) || '';
        request.oauth2.clientId = clientId;
        request.oauth2.clientSecret = clientSecret;
        request.oauth2.scope = scope;
        break;
      case 'implicit':
        request.oauth2.callbackUrl = _interpolate(request.oauth2.callbackUrl) || '';
        request.oauth2.authorizationUrl = _interpolate(request.oauth2.authorizationUrl) || '';
        request.oauth2.clientId = _interpolate(request.oauth2.clientId) || '';
        request.oauth2.scope = _interpolate(request.oauth2.scope) || '';
        break;
      default:
        break;
    }
  }

  // interpolate vars for aws sigv4 auth
  if (request.awsv4config) {
    request.awsv4config.accessKeyId = _interpolate(request.awsv4config.accessKeyId) || '';
    request.awsv4config.secretAccessKey = _interpolate(request.awsv4config.secretAccessKey) || '';
    request.awsv4config.sessionToken = _interpolate(request.awsv4config.sessionToken) || '';
    request.awsv4config.service = _interpolate(request.awsv4config.service) || '';
    request.awsv4config.region = _interpolate(request.awsv4config.region) || '';
    request.awsv4config.profileName = _interpolate(request.awsv4config.profileName) || '';
  }

  // interpolate vars for digest auth
  if (request.digestConfig) {
    request.digestConfig.username = _interpolate(request.digestConfig.username) || '';
    request.digestConfig.password = _interpolate(request.digestConfig.password) || '';
  }

  return request;
};

module.exports = interpolateVars;
