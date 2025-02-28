const { each, forOwn, get } = require('lodash');
const FormData = require('form-data');
const { mockDataFunctions } = require('./faker-functions');

const getContentType = (headers = {}) => {
  let contentType = '';
  forOwn(headers, (value, key) => {
    if (key && key.toLowerCase() === 'content-type') {
      contentType = value;
    }
  });

  return contentType;
};

const interpolateRandom = (request) => {
  const _interpolate = (str) => {
    if (!str || !str.length || typeof str !== 'string') {
      return str;
    }

    let resultStr = str;
    let matchFound = true;

    while (matchFound) {
      const patternRegex = /\{\{\$([^}]+)\}\}/g;
      matchFound = false;
      resultStr = resultStr.replace(patternRegex, (_, placeholder) => {
        const replacement = getRandomValue(placeholder);
        matchFound = true;
        return replacement;
      });
    }

    return resultStr;
  };

  request.url = _interpolate(request.url);

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
    if (typeof request.data === 'object' && !(request.data instanceof FormData)) {
      try {
        forOwn(request?.data, (value, key) => {
          request.data[key] = _interpolate(value);
        });
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

  return request;
};

function getRandomValue(variableName) {
  const randomFn = get(mockDataFunctions, variableName);
  if (typeof randomFn === 'function') {
    return randomFn();
  }
}

module.exports = interpolateRandom;
