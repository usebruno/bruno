import { find, each, trim, isEmpty, cloneDeep, forOwn } from 'lodash';

import brunoCommon from '@usebruno/common';
const { interpolate } = brunoCommon;

const hasLength = (str) => {
  if (!str || !str.length) {
    return false;
  }

  str = str.trim();

  return str.length > 0;
};

export const parseQueryParams = (query) => {
  try {
    if (!query || !query.length) {
      return [];
    }

    return Array.from(new URLSearchParams(query.split('#')[0]).entries())
      .map(([name, value]) => ({ name, value }));
  } catch (error) {
    console.error('Error parsing query params:', error);
    return [];
  }
};

export const parsePathParams = (url) => {
  let uri = url.slice();

  if (!uri || !uri.length) {
    return [];
  }

  if (!uri.startsWith('http://') && !uri.startsWith('https://')) {
    uri = `http://${uri}`;
  }

  let paths;

  try {
    uri = new URL(uri);
    paths = uri.pathname.split('/');
  } catch (e) {
    paths = uri.split('/');
  }

  paths = paths.reduce((acc, path) => {
    if (path !== '' && path[0] === ':') {
      let name = path.slice(1, path.length);
      if (name) {
        let isExist = find(acc, (path) => path.name === name);
        if (!isExist) {
          acc.push({ name: path.slice(1, path.length), value: '' });
        }
      }
    }
    return acc;
  }, []);
  return paths;
};

export const stringifyQueryParams = (params) => {
  if (!params || isEmpty(params)) {
    return '';
  }

  let queryString = [];
  each(params, (p) => {
    const hasEmptyName = isEmpty(trim(p.name));
    const hasEmptyVal = isEmpty(trim(p.value));

    // query param name must be present
    if (!hasEmptyName) {
      // if query param value is missing, push only <param-name>, else push <param-name: param-value>
      queryString.push(hasEmptyVal ? p.name : `${p.name}=${p.value}`);
    }
  });

  return queryString.join('&');
};

export const interpolateVars = (request, combinedVars = {}) => {
  const _interpolate = (str) => {
    if (!str || !str.length || typeof str !== 'string') {
      return str;
    }

    return interpolate(str, combinedVars);
  };

  request.url = _interpolate(request.url);

  forOwn(request.headers, (value, key) => {
    delete request.headers[key];
    request.headers[_interpolate(key)] = _interpolate(value);
  });

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

    request.url = url.origin + urlPathnameInterpolatedWithPathParams + url.search;
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

export const splitOnFirst = (str, char) => {
  if (!str || !str.length) {
    return [str];
  }

  let index = str.indexOf(char);
  if (index === -1) {
    return [str];
  }

  return [str.slice(0, index), str.slice(index + 1)];
};

export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
};

export const interpolateUrl = ({ url, envVars, runtimeVariables, processEnvVars }) => {
  if (!url || !url.length || typeof url !== 'string') {
    return;
  }

  return interpolate(url, {
    ...envVars,
    ...runtimeVariables,
    process: {
      env: {
        ...processEnvVars
      }
    }
  });
};

export const interpolateUrlPathParams = (url, params) => {
  const getInterpolatedBasePath = (pathname, params) => {
    return pathname
      .split('/')
      .map((segment) => {
        if (segment.startsWith(':')) {
          const pathParamName = segment.slice(1);
          const pathParam = params.find((p) => p?.name === pathParamName && p?.type === 'path');
          return pathParam ? pathParam.value : segment;
        }
        return segment;
      })
      .join('/');
  };

  let uri;

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`;
  }

  try {
    uri = new URL(url);
  } catch (error) {
    // if the URL is invalid, return the URL as is
    return url;
  }

  const basePath = getInterpolatedBasePath(uri.pathname, params);

  return `${uri.origin}${basePath}${uri?.search || ''}`;
};
