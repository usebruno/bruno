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
  const paramRegex = /[:](\w+)/g;
  const foundParams = new Set();
  paths.forEach((segment) => {
    let match;
    while ((match = paramRegex.exec(segment))) {
      if (match[1]) {
        // Clean up: remove trailing quotes/parentheses if present
        let name = match[1].replace(/[')"`]+$/, '');
        // Remove leading quotes/parentheses if present
        name = name.replace(/^[('"`]+/, '');
        if (name && !foundParams.has(name)) {
          foundParams.add(name);
        }
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
    const regex = /[:](\w+)/g;
    return pathname
      .split('/')
      .map((segment) => {

        if(!segment.startsWith(":")) return segment

        let match;
        while ((match = regex.exec(segment))) {
          if (match[1]) {
            // Clean up: remove trailing quotes/parentheses if present
            let name = match[1].replace(/[')"`]+$/, '');
            // Remove leading quotes/parentheses if present
            name = name.replace(/^[('"`]+/, '');
            if (name) {
              const pathParam = params.find((p) => p?.name === name && p?.type === 'path');
              return pathParam ? pathParam.value : segment;
            }
          }
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
