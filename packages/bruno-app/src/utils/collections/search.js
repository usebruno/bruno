import { flattenItems, isItemARequest } from './index';
import filter from 'lodash/filter';
import find from 'lodash/find';

const normalizedSearch = (searchText = '') => searchText.trim().toLowerCase();

export const doesNameMatchSearchText = (name, searchText = '') => {
  const needle = normalizedSearch(searchText);
  if (!needle) return true;
  return (name ?? '').toLowerCase().includes(needle);
};

export const doesRequestMatchSearchText = (request, searchText = '') => {
  return doesNameMatchSearchText(request?.name, searchText);
};

export const doesCollectionNameMatchSearchText = (collection, searchText = '') => {
  return doesNameMatchSearchText(collection?.name, searchText);
};

export const doesFolderHaveItemsMatchSearchText = (item, searchText = '') => {
  let flattenedItems = flattenItems(item.items);
  let requestItems = filter(flattenedItems, (item) => isItemARequest(item) && !item.isTransient);

  return find(requestItems, (request) => doesRequestMatchSearchText(request, searchText));
};

export const doesCollectionHaveItemsMatchingSearchText = (collection, searchText = '') => {
  if (doesCollectionNameMatchSearchText(collection, searchText)) return true;

  let flattenedItems = flattenItems(collection.items);
  let requestItems = filter(flattenedItems, (item) => isItemARequest(item) && !item.isTransient);

  return find(requestItems, (request) => doesRequestMatchSearchText(request, searchText));
};
