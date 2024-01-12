import isEmpty from 'lodash/isEmpty';
import trim from 'lodash/trim';
import each from 'lodash/each';
import filter from 'lodash/filter';

const hasLength = (str) => {
  if (!str || !str.length) {
    return false;
  }

  str = str.trim();

  return str.length > 0;
};

export const parseQueryParams = (query, decodeQuery = false) => {
  if (!query || !query.length) {
    return [];
  }

  let params = query.split('&').map((param) => {
    let [name, value = ''] = param.split('=');
    return { name, value: decodeQuery ? decodeURIComponent(value) : value };
  });

  return filter(params, (p) => hasLength(p.name));
};

export const stringifyQueryParams = (params, encodeQuery) => {
  if (!params || isEmpty(params)) {
    return '';
  }

  let queryString = [];
  each(params, (p) => {
    if (!isEmpty(trim(p.name)) && !isEmpty(trim(p.value))) {
      queryString.push(`${p.name}=${encodeQuery ? encodeURIComponent(p.value) : p.value}`);
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

export const getUrlWithQueryParams = (url, params, encodeQuery) => {
  const parts = splitOnFirst(url, '?');
  const query = stringifyQueryParams(
    filter(params, (p) => p.enabled),
    encodeQuery
  );
  if (query && query.length) return parts[0] + '?' + query;
  return parts[0];
};
