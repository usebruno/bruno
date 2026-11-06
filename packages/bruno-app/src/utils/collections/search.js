import { flattenItems, isItemARequest } from './index';
import filter from 'lodash/filter';
import find from 'lodash/find';

const matchesNeedle = (value, needle) => Boolean(value?.toLowerCase().includes(needle));

export const doesRequestMatchSearchText = (request, searchText = '') => {
  const needle = searchText.trim().toLowerCase();
  return matchesNeedle(request?.name, needle) || matchesNeedle(request?.request?.url, needle);
};

export const doesFolderHaveItemsMatchSearchText = (item, searchText = '') => {
  let flattenedItems = flattenItems(item.items);
  let requestItems = filter(flattenedItems, (item) => isItemARequest(item) && !item.isTransient);

  return find(requestItems, (request) => doesRequestMatchSearchText(request, searchText));
};

export const doesCollectionHaveItemsMatchingSearchText = (collection, searchText = '') => {
  if (matchesNeedle(collection?.name, searchText.trim().toLowerCase())) return true;

  let flattenedItems = flattenItems(collection.items);
  let requestItems = filter(flattenedItems, (item) => isItemARequest(item) && !item.isTransient);

  return find(requestItems, (request) => doesRequestMatchSearchText(request, searchText));
};
