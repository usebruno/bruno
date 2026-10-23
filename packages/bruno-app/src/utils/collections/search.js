import { flattenItems, isItemARequest } from './index';
import filter from 'lodash/filter';
import find from 'lodash/find';

const searchParamsRegex = /\((?<key>\w+):\s*(?<value>[^)]*)\)/g;

const buildSearchParamsObject = (query) => {
  const params = {};

  for (const match of query.matchAll(searchParamsRegex)) {
    params[match.groups.key] = match.groups.value
      .split(',')
      .map((value) => value.trim());
  }

  return params;
};

const matchesSearchParams = (request, query) => {
  const requestFieldSearchableByParam = {
    method: request?.request?.method,
    url: request?.request?.url,
    folder: request?.pathname,
    tag: request?.tags
  };

  const matchesField = ([param, values]) => {
    const field = requestFieldSearchableByParam[param];

    if (field == null) return false;

    if (Array.isArray(field)) {
      return values.some((value) =>
        field.some((item) => item.toLowerCase() === value)
      );
    }

    return values.some((value) =>
      field.toLowerCase().includes(value)
    );
  };

  const searchParams = buildSearchParamsObject(query);
  return Object.entries(searchParams).every(matchesField);
};

export const doesRequestMatchSearchText = (request, searchText = '') => {
  const query = searchText.toLowerCase();
  const name = query.replace(searchParamsRegex, '').trim();

  const matchesName = !name
    || request?.name?.toLowerCase().includes(name);

  return matchesName && matchesSearchParams(request, query);
};

export const doesFolderHaveItemsMatchSearchText = (item, searchText = '') => {
  let flattenedItems = flattenItems(item.items);
  let requestItems = filter(flattenedItems, (item) => isItemARequest(item) && !item.isTransient);

  return find(requestItems, (request) => doesRequestMatchSearchText(request, searchText));
};

export const doesCollectionHaveItemsMatchingSearchText = (collection, searchText = '') => {
  let flattenedItems = flattenItems(collection.items);
  let requestItems = filter(flattenedItems, (item) => isItemARequest(item) && !item.isTransient);

  return find(requestItems, (request) => doesRequestMatchSearchText(request, searchText));
};
