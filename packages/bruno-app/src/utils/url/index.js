import isEmpty from 'lodash/isEmpty';
import trim from 'lodash/trim';
import each from 'lodash/each';
import splitOnFirst from 'split-on-first';

export const parseQueryParams = (query) => {
  if(!query || !query.length) {
    return [];
  }

  let params = query.split("&");
  let result = [];

  for (let i = 0; i < params.length; i++) {
    let pair = splitOnFirst(params[i], '=');;
    result.push({
      name: pair[0],
      value: pair[1]
    });
  }

  return result;
};

export const stringifyQueryParams = (params) => {
  if(!params || isEmpty(params)) {
    return '';
  }

  let queryString = [];
  each(params, (p) => {
    if(!isEmpty(trim(p.name)) && !isEmpty(trim(p.value))) {
      queryString.push(`${p.name}=${p.value}`);
    }
  });

  return queryString.join('&');
};
