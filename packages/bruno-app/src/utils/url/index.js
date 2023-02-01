import isEmpty from 'lodash/isEmpty';
import trim from 'lodash/trim';
import each from 'lodash/each';
import filter from 'lodash/filter';

const hasLength = (str) => {
  if(!str || !str.length) {
    return false;
  }

  str = str.trim();

  return str.length > 0;
};

export const parseQueryParams = (query) => {
  if (!query || !query.length) {
    return [];
  }

  let params =  query.split('&').map(param => {
    let [name, value = ''] = param.split('=');
    return { name, value };
  });

  return filter(params, (p) => hasLength(p.name));
};

export const stringifyQueryParams = (params) => {
  if (!params || isEmpty(params)) {
    return '';
  }

  let queryString = [];
  each(params, (p) => {
    if (!isEmpty(trim(p.name)) && !isEmpty(trim(p.value))) {
      queryString.push(`${p.name}=${p.value}`);
    }
  });

  return queryString.join('&');
};
