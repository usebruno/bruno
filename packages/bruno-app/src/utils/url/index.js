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
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch (err) {
    // Return true if it has a protocol or Bruno template syntax
    return /^https?:\/\//i.test(url) || url.includes('://') || url.includes('{{');
  }
};
export const interpolateUrl = ({ url, variables }) => {
  if (!url || !url.length || typeof url !== 'string') {
    return;
  }

  return interpolate(url, variables);
};

export const interpolateUrlPathParams = (url, params) => {
  if (!url || typeof url !== 'string') return url;

  // 1. Ensure we have a protocol for parsing.
  // If missing, we prepend 'http://' and keep it.
  let resultUrl = url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    resultUrl = `http://${url}`;
  }

  // 2. Manual split on '?' to isolate the query string.
  // This prevents the 'new URL()' / 'URI malformed' crash on literal '%' signs.
  const [urlWithoutQuery, searchPart] = splitOnFirst(resultUrl, '?');

  // 3. Extract the origin and pathname using Regex.
  // This is safer than new URL() for strings containing {{vars}}.
  const originMatch = urlWithoutQuery.match(/^https?:\/\/[^/]+/);
  const origin = originMatch ? originMatch[0] : '';
  const pathname = urlWithoutQuery.replace(origin, '');

  // 4. Interpolate the path segments.
  const interpolatedPath = pathname
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        const name = segment.slice(1);
        const p = params.find((p) => p?.name === name && p?.type === 'path');
        return p ? p.value : segment;
      }
      return segment;
    })
    .join('/');

  // 5. Reconstruct the final URL.
  return `${origin}${interpolatedPath}${searchPart ? '?' + searchPart : ''}`;
};
