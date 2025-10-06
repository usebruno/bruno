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

const getRawQueryString = (url) => {
  const queryIndex = url.indexOf('?');
  return queryIndex !== -1 ? url.slice(queryIndex) : '';
};

const interpolateVars = (request, envVariables = {}, runtimeVariables = {}, processEnvVars = {}) => {
  const globalEnvironmentVariables = request?.globalEnvironmentVariables || {};
  const oauth2CredentialVariables = request?.oauth2CredentialVariables || {};
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
        }
      }
    });
  });

  const _interpolate = (str, { escapeJSONStrings } = {}) => {
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
      ...oauth2CredentialVariables,
      ...runtimeVariables,
      process: {
        env: {
          ...processEnvVars
        }
      }
    };

    return interpolate(str, combinedVars, {
      escapeJSONStrings
    });
  };

  request.url = _interpolate(request.url);

  forOwn(request.headers, (value, key) => {
    delete request.headers[key];
    request.headers[_interpolate(key)] = _interpolate(value);
  });

  const contentType = getContentType(request.headers);
  const isGrpcBody = request.mode === 'grpc';

  if (isGrpcBody) {
    const jsonDoc = JSON.stringify(request.body);
    const parsed = _interpolate(jsonDoc, {
      escapeJSONStrings: true
    });
    request.body = JSON.parse(parsed);
  }

  if (typeof contentType === 'string') {
    /*
      We explicitly avoid interpolating buffer values because the file content is read as a buffer object in raw body mode. 
      Even if the selected file's content type is JSON, this prevents the buffer object from being interpolated.
    */
    if (contentType.includes('json') && !Buffer.isBuffer(request.data)) {
      if (typeof request.data === 'string') {
        if (request.data.length) {
          request.data = _interpolate(request.data, {
            escapeJSONStrings: true,
          });
        }
      } else if (typeof request.data === 'object') {
        try {
          const jsonDoc = JSON.stringify(request.data);
          const parsed = _interpolate(jsonDoc, {
            escapeJSONStrings: true,
          });
          request.data = JSON.parse(parsed);
        } catch (err) {}
      }
    } else if (contentType === 'application/x-www-form-urlencoded') {
      if (request.data && Array.isArray(request.data)) {
        request.data = request.data.map((d) => ({
          ...d,
          value: _interpolate(d?.value)
        }));
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
  }

  each(request.pathParams, (param) => {
    param.value = _interpolate(param.value);
  });

  if (request?.pathParams?.length) {
    let url = request.url;
    const urlSearchRaw = getRawQueryString(request.url)
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }

    try {
      url = new URL(url);
    } catch (e) {
      throw { message: 'Invalid URL format', originalError: e.message };
    }

    const paramRegex = /[:](\w+)/g;
    const urlPathnameInterpolatedWithPathParams = url.pathname
      .split('/')
      .filter((path) => path !== '')
      .map((path) => {
        const matches = path.match(paramRegex);
        if (matches) {
          const paramName = matches[0].slice(1); // Remove the : prefix
          const existingPathParam = request.pathParams.find(param => param.name === paramName);
          if (!existingPathParam) {
            return '/' + path;
          }
          return '/' + path.replace(':' + paramName, existingPathParam.value);
        } else {
          return '/' + path;
        }
      })
      .join('');

    const trailingSlash = url.pathname.endsWith('/') ? '/' : '';
    request.url = url.origin + urlPathnameInterpolatedWithPathParams + trailingSlash + urlSearchRaw;
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
  if (request.basicAuth) {
    const username = _interpolate(request.basicAuth.username) || '';
    const password = _interpolate(request.basicAuth.password) || '';
    // use auth header based approach and delete the request.auth object
    request.headers['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    delete request.basicAuth;
  }

  if (request?.oauth2?.grantType) {
    let username, password, scope, clientId, clientSecret;
    switch (request.oauth2.grantType) {
      case 'password':
        request.oauth2.accessTokenUrl = _interpolate(request.oauth2.accessTokenUrl) || '';
        request.oauth2.refreshTokenUrl = _interpolate(request.oauth2.refreshTokenUrl) || '';
        request.oauth2.username = _interpolate(request.oauth2.username) || '';
        request.oauth2.password = _interpolate(request.oauth2.password) || '';
        request.oauth2.clientId = _interpolate(request.oauth2.clientId) || '';
        request.oauth2.clientSecret = _interpolate(request.oauth2.clientSecret) || '';
        request.oauth2.scope = _interpolate(request.oauth2.scope) || '';
        request.oauth2.credentialsPlacement = _interpolate(request.oauth2.credentialsPlacement) || '';
        request.oauth2.credentialsId = _interpolate(request.oauth2.credentialsId) || '';
        request.oauth2.tokenPlacement = _interpolate(request.oauth2.tokenPlacement) || '';
        request.oauth2.tokenHeaderPrefix = _interpolate(request.oauth2.tokenHeaderPrefix) || '';
        request.oauth2.tokenQueryKey = _interpolate(request.oauth2.tokenQueryKey) || '';
        request.oauth2.autoFetchToken = _interpolate(request.oauth2.autoFetchToken);
        request.oauth2.autoRefreshToken = _interpolate(request.oauth2.autoRefreshToken);
        break;
      case 'implicit':
        request.oauth2.callbackUrl = _interpolate(request.oauth2.callbackUrl) || '';
        request.oauth2.authorizationUrl = _interpolate(request.oauth2.authorizationUrl) || '';
        request.oauth2.clientId = _interpolate(request.oauth2.clientId) || '';
        request.oauth2.scope = _interpolate(request.oauth2.scope) || '';
        request.oauth2.state = _interpolate(request.oauth2.state) || '';
        request.oauth2.credentialsId = _interpolate(request.oauth2.credentialsId) || '';
        request.oauth2.tokenPlacement = _interpolate(request.oauth2.tokenPlacement) || '';
        request.oauth2.tokenHeaderPrefix = _interpolate(request.oauth2.tokenHeaderPrefix) || '';
        request.oauth2.tokenQueryKey = _interpolate(request.oauth2.tokenQueryKey) || '';
        request.oauth2.autoFetchToken = _interpolate(request.oauth2.autoFetchToken);
        break;
      case 'authorization_code':
        request.oauth2.callbackUrl = _interpolate(request.oauth2.callbackUrl) || '';
        request.oauth2.authorizationUrl = _interpolate(request.oauth2.authorizationUrl) || '';
        request.oauth2.accessTokenUrl = _interpolate(request.oauth2.accessTokenUrl) || '';
        request.oauth2.refreshTokenUrl = _interpolate(request.oauth2.refreshTokenUrl) || '';
        request.oauth2.clientId = _interpolate(request.oauth2.clientId) || '';
        request.oauth2.clientSecret = _interpolate(request.oauth2.clientSecret) || '';
        request.oauth2.scope = _interpolate(request.oauth2.scope) || '';
        request.oauth2.state = _interpolate(request.oauth2.state) || '';
        request.oauth2.pkce = _interpolate(request.oauth2.pkce) || false;
        request.oauth2.credentialsPlacement = _interpolate(request.oauth2.credentialsPlacement) || '';
        request.oauth2.credentialsId = _interpolate(request.oauth2.credentialsId) || '';
        request.oauth2.tokenPlacement = _interpolate(request.oauth2.tokenPlacement) || '';
        request.oauth2.tokenHeaderPrefix = _interpolate(request.oauth2.tokenHeaderPrefix) || '';
        request.oauth2.tokenQueryKey = _interpolate(request.oauth2.tokenQueryKey) || '';
        request.oauth2.autoFetchToken = _interpolate(request.oauth2.autoFetchToken);
        request.oauth2.autoRefreshToken = _interpolate(request.oauth2.autoRefreshToken);
        break;
      case 'client_credentials':
        request.oauth2.accessTokenUrl = _interpolate(request.oauth2.accessTokenUrl) || '';
        request.oauth2.refreshTokenUrl = _interpolate(request.oauth2.refreshTokenUrl) || '';
        request.oauth2.clientId = _interpolate(request.oauth2.clientId) || '';
        request.oauth2.clientSecret = _interpolate(request.oauth2.clientSecret) || '';
        request.oauth2.scope = _interpolate(request.oauth2.scope) || '';
        request.oauth2.credentialsPlacement = _interpolate(request.oauth2.credentialsPlacement) || '';
        request.oauth2.credentialsId = _interpolate(request.oauth2.credentialsId) || '';
        request.oauth2.tokenPlacement = _interpolate(request.oauth2.tokenPlacement) || '';
        request.oauth2.tokenHeaderPrefix = _interpolate(request.oauth2.tokenHeaderPrefix) || '';
        request.oauth2.tokenQueryKey = _interpolate(request.oauth2.tokenQueryKey) || '';
        request.oauth2.autoFetchToken = _interpolate(request.oauth2.autoFetchToken);
        request.oauth2.autoRefreshToken = _interpolate(request.oauth2.autoRefreshToken);
        break;
      default:
        break;
    }

    // Interpolate additional parameters for all OAuth2 grant types
    if (request.oauth2.additionalParameters) {
      // Interpolate authorization parameters
      if (Array.isArray(request.oauth2.additionalParameters.authorization)) {
        request.oauth2.additionalParameters.authorization.forEach(param => {
          if (param && param.enabled !== false) {
            param.name = _interpolate(param.name) || '';
            param.value = _interpolate(param.value) || '';
          }
        });
      }

      // Interpolate token parameters
      if (Array.isArray(request.oauth2.additionalParameters.token)) {
        request.oauth2.additionalParameters.token.forEach(param => {
          if (param && param.enabled !== false) {
            param.name = _interpolate(param.name) || '';
            param.value = _interpolate(param.value) || '';
          }
        });
      }

      // Interpolate refresh parameters
      if (Array.isArray(request.oauth2.additionalParameters.refresh)) {
        request.oauth2.additionalParameters.refresh.forEach(param => {
          if (param && param.enabled !== false) {
            param.name = _interpolate(param.name) || '';
            param.value = _interpolate(param.value) || '';
          }
        });
      }
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

  // interpolate vars for ntlmConfig auth
  if (request.ntlmConfig) {
    request.ntlmConfig.username = _interpolate(request.ntlmConfig.username) || '';
    request.ntlmConfig.password = _interpolate(request.ntlmConfig.password) || '';
    request.ntlmConfig.domain = _interpolate(request.ntlmConfig.domain) || '';    
  }

  if(request?.auth) delete request.auth;

  return request;
};

module.exports = interpolateVars;
