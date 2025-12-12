import find from 'lodash/find';

import { interpolate } from '@usebruno/common';

const hasLength = (str) => {
  if (!str || !str.length) {
    return false;
  }

  str = str.trim();

  return str.length > 0;
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

  // Enhanced: also match :param inside parentheses and/or quotes
  const foundParams = new Set();
  paths.forEach((segment) => {
    // traditional path parameters
    if (segment.startsWith(':')) {
      const name = segment.slice(1);
      if (name && !foundParams.has(name)) {
        foundParams.add(name);
      }
      return;
    }

    // for OData-style parameters (parameters inside parentheses)
    // Check if segment matches valid OData syntax:
    // 1. EntitySet('key') or EntitySet(key)
    // 2. EntitySet(Key1=value1,Key2=value2)
    // 3. Function(param=value)
    if (!/^[A-Za-z0-9_.-]+\([^)]*\)$/.test(segment)) {
      return;
    }

    const paramRegex = /[:](\w+)/g;
    let match;
    while ((match = paramRegex.exec(segment))) {
      if (!match[1]) continue;

      let name = match[1].replace(/[')"`]+$/, '');
      name = name.replace(/^[('"`]+/, '');
      if (name && !foundParams.has(name)) {
        foundParams.add(name);
      }
    }
  });
  return Array.from(foundParams).map((name) => ({ name, value: '' }));
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

export const interpolateUrl = ({ url, variables }) => {
  if (!url || !url.length || typeof url !== 'string') {
    return;
  }

  return interpolate(url, variables);
};

export const interpolateUrlPathParams = (url, params) => {
  const getInterpolatedBasePath = (pathname, params) => {
    return pathname
      .split('/')
      .map((segment) => {
        // traditional path parameters
        if (segment.startsWith(':')) {
          const name = segment.slice(1);
          const pathParam = params.find((p) => p?.name === name && p?.type === 'path');
          return pathParam ? pathParam.value : segment;
        }

        // for OData-style parameters (parameters inside parentheses)
        // Check if segment matches valid OData syntax:
        // 1. EntitySet('key') or EntitySet(key)
        // 2. EntitySet(Key1=value1,Key2=value2)
        // 3. Function(param=value)
        if (!/^[A-Za-z0-9_.-]+\([^)]*\)$/.test(segment)) {
          return segment;
        }

        const regex = /[:](\w+)/g;
        let match;
        let result = segment;
        while ((match = regex.exec(segment))) {
          if (!match[1]) continue;

          let name = match[1].replace(/[')"`]+$/, '');
          name = name.replace(/^[('"`]+/, '');
          if (!name) continue;

          const pathParam = params.find((p) => p?.name === name && p?.type === 'path');
          if (pathParam) {
            result = result.replace(':' + match[1], pathParam.value);
          }
        }
        return result;
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
