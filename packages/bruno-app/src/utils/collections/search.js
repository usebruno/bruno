import { flattenItems, isItemARequest } from './index';
import filter from 'lodash/filter';
import find from 'lodash/find';

const includesSearchText = (value, searchText = '') =>
  Boolean(value?.toLowerCase().includes(searchText.trim().toLowerCase()));

export const doesRequestMatchSearchText = (request, searchText = '') => {
  return includesSearchText(request?.name, searchText)
    || includesSearchText(request?.request?.url, searchText);
};

export const doesFolderHaveItemsMatchSearchText = (item, searchText = '') => {
  let flattenedItems = flattenItems(item.items);
  let requestItems = filter(flattenedItems, (item) => isItemARequest(item) && !item.isTransient);

  return find(requestItems, (request) => doesRequestMatchSearchText(request, searchText));
};

export const doesCollectionHaveItemsMatchingSearchText = (collection, searchText = '') => {
  if (includesSearchText(collection?.name, searchText)) return true;

  let flattenedItems = flattenItems(collection.items);
  let requestItems = filter(flattenedItems, (item) => isItemARequest(item) && !item.isTransient);

  return find(requestItems, (request) => doesRequestMatchSearchText(request, searchText));
};
