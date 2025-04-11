import interpolate from './index';
import { forOwn, cloneDeep, each, find } from 'lodash';
import { mockDataFunctions } from '../mock';
const FormData = require('form-data');

const getContentType = (headers = {}) => {
  let contentType = '';

  Object.keys(headers).forEach((key) => {
    if (key && key.toLowerCase() === 'content-type') {
      contentType = headers[key];
    }
  });

  return contentType;
};

const interpolateMockVars = (str) => {
  const patternRegex = /\{\{\$(\w+)\}\}/g;

  return str.replace(patternRegex, (match, keyword) => {
    if (mockDataFunctions[keyword]) {
      try {
        const replacement = mockDataFunctions[keyword]();
        return replacement !== undefined && replacement !== null ? String(replacement) : match;
      } catch (error) {
        console.warn(`Error executing mock function for keyword "${keyword}":`, error);
        return match;
      }
    } else {
      console.warn(`No mock function found for keyword "${keyword}"`);
      return match;
    }
  });
};

export const interpolateVars = (request, envVariables = {}, runtimeVariables = {}, processEnvVars = {}) => {
  const collectionVariables = request?.collectionVariables || {};
  const folderVariables = request?.folderVariables || {};
  const requestVariables = request?.requestVariables || {};
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

  /**
   * Interpolates a given string by replacing placeholders with corresponding variable values.
   * 
   * The function uses a precedence order for variables when resolving placeholders:
   * 1. `runtimeVariables` - Variables provided at runtime.
   * 2. `requestVariables` - Variables specific to the current request.
   * 3. `folderVariables` - Variables defined at the folder level.
   * 4. `envVariables` - Environment-specific variables.
   * 5. `collectionVariables` - Variables defined at the collection level.
   * 6. `process.env` - System environment variables.
   * 
   * @param {string} str - The string to interpolate.
   * @returns {string} - The interpolated string with placeholders replaced by their corresponding values.
   */
  const _interpolate = (str) => {
    if (!str || !str.length || typeof str !== 'string') {
      return str;
    }

    const combinedVars = {
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

    return interpolateMockVars(interpolate(str, combinedVars));
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
      if (request?.data?.length) {
        request.data = _interpolate(request.data);
      }
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
        if (path[0] !== ':') {
          return '/' + path;
        } else {
          const name = path.slice(1);
          const existingPathParam = request?.pathParams?.find((param) => param.type === 'path' && param.name === name);
          return existingPathParam ? '/' + existingPathParam.value : '';
        }
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
