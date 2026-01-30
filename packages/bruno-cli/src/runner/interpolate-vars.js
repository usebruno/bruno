const { interpolate } = require('@usebruno/common');
const { each, forOwn, cloneDeep, find } = require('lodash');
const { isFormData } = require('@usebruno/common').utils;

const getContentType = (headers = {}) => {
  let contentType = '';
  forOwn(headers, (value, key) => {
    if (key && key.toLowerCase() === 'content-type') {
      contentType = value;
    }
  });

  // Return empty string if contentType is not a string (e.g., null/false for no body requests)
  return typeof contentType === 'string' ? contentType : '';
};

const interpolateVars = (request, envVariables = {}, runtimeVariables = {}, processEnvVars = {}) => {
  const globalEnvironmentVariables = request?.globalEnvironmentVariables || {};
  const collectionVariables = request?.collectionVariables || {};
  const folderVariables = request?.folderVariables || {};
  const requestVariables = request?.requestVariables || {};
  const oauth2CredentialVariables = request?.oauth2CredentialVariables || {};
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

    return interpolate(str, combinedVars, { escapeJSONStrings });
  };

  request.url = _interpolate(request.url);

  forOwn(request.headers, (value, key) => {
    delete request.headers[key];
    request.headers[_interpolate(key)] = _interpolate(value);
  });

  const contentType = getContentType(request.headers);

  if (contentType.includes('json')) {
    // Skip interpolation if data is a Buffer (e.g., gzip-compressed data)
    if (typeof request.data === 'object' && !Buffer.isBuffer(request.data)) {
      try {
        let parsed = JSON.stringify(request.data);
        parsed = _interpolate(parsed, { escapeJSONStrings: true });
        request.data = JSON.parse(parsed);
      } catch (err) {}
    }

    if (typeof request.data === 'string') {
      if (request?.data?.length) {
        request.data = _interpolate(request.data, { escapeJSONStrings: true });
      }
    }
  } else if (contentType === 'application/x-www-form-urlencoded') {
    if (request.data && Array.isArray(request.data)) {
      request.data = request.data.map((d) => ({
        ...d,
        value: _interpolate(d?.value)
      }));
    }
  } else if (contentType === 'multipart/form-data') {
    if (Array.isArray(request?.data) && !isFormData(request.data)) {
      try {
        request.data = request?.data?.map((d) => ({
          ...d,
          value: _interpolate(d?.value)
        }));
      } catch (err) {}
    }
  } else {
    request.data = _interpolate(request.data);
  }

  each(request?.pathParams, (param) => {
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

    const interpolatedUrlPath = url.pathname
      .split('/')
      .filter((path) => path !== '')
      .map((path) => {
        // traditional path parameters
        if (path.startsWith(':')) {
          const paramName = path.slice(1);
          const existingPathParam = request.pathParams.find((param) => param.name === paramName);
          if (!existingPathParam) {
            return '/' + path;
          }
          return '/' + existingPathParam.value;
        }

        // for OData-style parameters (parameters inside parentheses)
        // Check if path matches valid OData syntax:
        // 1. EntitySet('key') or EntitySet(key)
        // 2. EntitySet(Key1=value1,Key2=value2)
        // 3. Function(param=value)
        if (/^[A-Za-z0-9_.-]+\([^)]*\)$/.test(path)) {
          const paramRegex = /[:](\w+)/g;
          let match;
          let result = path;
          while ((match = paramRegex.exec(path))) {
            if (match[1]) {
              let name = match[1].replace(/[')"`]+$/, '');
              name = name.replace(/^[('"`]+/, '');
              if (name) {
                const existingPathParam = request.pathParams.find((param) => param.name === name);
                if (existingPathParam) {
                  result = result.replace(':' + match[1], existingPathParam.value);
                }
              }
            }
          }
          return '/' + result;
        }
        return '/' + path;
      })
      .join('');

    const trailingSlash = url.pathname.endsWith('/') ? '/' : '';
    request.url = url.origin + interpolatedUrlPath + trailingSlash + url.search;
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
  //       need to refactor this in the future
  // the request.auth (basic auth) object gets set inside the prepare-request.js file
  if (request.basicAuth) {
    const username = _interpolate(request.basicAuth.username) || '';
    const password = _interpolate(request.basicAuth.password) || '';

    // use auth header based approach and delete the request.auth object
    request.headers['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    delete request.basicAuth;
  }

  if (request?.oauth2?.grantType) {
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
        break;
      default:
        break;
    }

    // Interpolate additional parameters for all OAuth2 grant types
    if (request.oauth2.additionalParameters) {
      // Interpolate authorization parameters
      if (Array.isArray(request.oauth2.additionalParameters.authorization)) {
        request.oauth2.additionalParameters.authorization.forEach((param) => {
          if (param && param.enabled !== false) {
            param.name = _interpolate(param.name) || '';
            param.value = _interpolate(param.value) || '';
          }
        });
      }

      // Interpolate token parameters
      if (Array.isArray(request.oauth2.additionalParameters.token)) {
        request.oauth2.additionalParameters.token.forEach((param) => {
          if (param && param.enabled !== false) {
            param.name = _interpolate(param.name) || '';
            param.value = _interpolate(param.value) || '';
          }
        });
      }

      // Interpolate refresh parameters
      if (Array.isArray(request.oauth2.additionalParameters.refresh)) {
        request.oauth2.additionalParameters.refresh.forEach((param) => {
          if (param && param.enabled !== false) {
            param.name = _interpolate(param.name) || '';
            param.value = _interpolate(param.value) || '';
          }
        });
      }
    }
  }

  if (request.awsv4config) {
    request.awsv4config.accessKeyId = _interpolate(request.awsv4config.accessKeyId) || '';
    request.awsv4config.secretAccessKey = _interpolate(request.awsv4config.secretAccessKey) || '';
    request.awsv4config.sessionToken = _interpolate(request.awsv4config.sessionToken) || '';
    request.awsv4config.service = _interpolate(request.awsv4config.service) || '';
    request.awsv4config.region = _interpolate(request.awsv4config.region) || '';
    request.awsv4config.profileName = _interpolate(request.awsv4config.profileName) || '';
  }

  // interpolate vars for ntlmConfig auth
  if (request.ntlmConfig) {
    request.ntlmConfig.username = _interpolate(request.ntlmConfig.username) || '';
    request.ntlmConfig.password = _interpolate(request.ntlmConfig.password) || '';
    request.ntlmConfig.domain = _interpolate(request.ntlmConfig.domain) || '';
  }

  if (request?.auth) delete request.auth;

  if (request) return request;
};

module.exports = interpolateVars;
