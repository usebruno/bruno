import isEmpty from 'lodash/isEmpty';
import trim from 'lodash/trim';
import each from 'lodash/each';
import filter from 'lodash/filter';
import find from 'lodash/find';

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

export const interpolateUrl = ({ url, globalEnvironmentVariables = {}, envVars, runtimeVariables, processEnvVars }) => {
  if (!url || !url.length || typeof url !== 'string') {
    return;
  }

  return interpolate(url, {
    ...globalEnvironmentVariables,
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
