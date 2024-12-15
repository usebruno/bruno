const { interpolate } = require('@usebruno/common');
const { each, forOwn, cloneDeep, find } = require('lodash');
const FormData = require('form-data');

const getContentType = (headers = {}) => {
  let contentType = '';
  forOwn(headers, (value, key) => {
    if (key && key.toLowerCase() === 'content-type') {
      contentType = value;
    }
  });

  return contentType;
};

const interpolateVars = (request, envVariables = {}, runtimeVariables = {}, processEnvVars = {}) => {
  const globalEnvironmentVariables = request?.globalEnvironmentVariables || {};
  const collectionVariables = request?.collectionVariables || {};
  const folderVariables = request?.folderVariables || {};
  const requestVariables = request?.requestVariables || {};
  // we clone envVars because we don't want to modify the original object
  envVariables = cloneDeep(envVariables);

  // envVars can inturn have values as {{process.env.VAR_NAME}}
  // so we need to interpolate envVars first with processEnvVars
  forOwn(envVariables, (value, key) => {
    envVariables[key] = interpolate(value, {
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

    // runtimeVariables take precedence over envVars
    const combinedVars = {
      ...globalEnvironmentVariables,
      ...collectionVariables,
      ...envVariables,
      ...folderVariables,
      ...requestVariables,
      ...runtimeVariables,
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
    if (typeof request.data === 'string') {
      if (request.data.length) {
        request.data = _interpolate(request.data);
      }
    } else if (typeof request.data === 'object') {
      try {
        let parsed = JSON.stringify(request.data);
        parsed = _interpolate(parsed);
        request.data = JSON.parse(parsed);
      } catch (err) {}
    }
  } else if (contentType === 'application/x-www-form-urlencoded') {
    if (typeof request.data === 'object') {
      try {
        forOwn(request?.data, (value, key) => {
          request.data[key] = _interpolate(value);
        });
      } catch (err) {}
    }
  } else if (contentType === 'multipart/form-data') {
    if (Array.isArray(request?.data) && !(request.data instanceof FormData)) {
      try {
        request.data = request?.data?.map(d => ({
          ...d,
          value: _interpolate(d?.value)
        }));   
      } catch (err) {}
    }
  } else {
    request.data = _interpolate(request.data);
  }

  each(request.pathParams, (param) => {
    param.value = _interpolate(param.value);
  });

  if (request?.pathParams?.length) {
    let url = request.url;

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }

    try {
      url = new URL(url);
    } catch (e) {
      throw { message: 'Invalid URL format', originalError: e.message };
    }

    const urlPathnameInterpolatedWithPathParams = url.pathname
      .split('/')
      .filter((path) => path !== '')
      .map((path) => {
        if (path[0] !== ':') {
          return '/' + path;
        } else {
          const name = path.slice(1);
          const existingPathParam = request.pathParams.find((param) => param.type === 'path' && param.name === name);
          return existingPathParam ? '/' + existingPathParam.value : '';
        }
      })
      .join('');

    const trailingSlash = url.pathname.endsWith('/') ? '/' : '';
    request.url = url.origin + urlPathnameInterpolatedWithPathParams + trailingSlash + url.search;
  }

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
        request.data = {
          grant_type: 'password',
          username,
          password,
          client_id: clientId,
          client_secret: clientSecret,
          scope
        };
        break;
      case 'authorization_code':
        request.oauth2.callbackUrl = _interpolate(request.oauth2.callbackUrl) || '';
        request.oauth2.authorizationUrl = _interpolate(request.oauth2.authorizationUrl) || '';
        request.oauth2.accessTokenUrl = _interpolate(request.oauth2.accessTokenUrl) || '';
        request.oauth2.clientId = _interpolate(request.oauth2.clientId) || '';
        request.oauth2.clientSecret = _interpolate(request.oauth2.clientSecret) || '';
        request.oauth2.scope = _interpolate(request.oauth2.scope) || '';
        request.oauth2.state = _interpolate(request.oauth2.state) || '';
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
        request.data = {
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          scope
        };
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

  // interpolate vars for wsse auth
  if (request.wsse) {
    request.wsse.username = _interpolate(request.wsse.username) || '';
    request.wsse.password = _interpolate(request.wsse.password) || '';
  }

  return request;
};

module.exports = interpolateVars;
