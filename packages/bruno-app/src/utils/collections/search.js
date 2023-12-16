import { flattenItems, isItemARequest } from './index';
import filter from 'lodash/filter';
import find from 'lodash/find';

export const doesItemMatchSearchText = (item, searchText = '') => {
  return item.name.toLowerCase().includes(searchText.toLowerCase());
};

export const doesFolderHaveItemsMatchSearchText = (item, searchText = '', includeFolders = false) => {
  let flattenedItems = flattenItems(item.items);
  let requestItems = includeFolders ? flattenedItems : filter(flattenedItems, (item) => isItemARequest(item));

  return find(requestItems, (request) => doesItemMatchSearchText(request, searchText));
};

export const doesCollectionHaveItemsMatchingSearchText = (collection, searchText = '', includeFolders = false) => {
  let flattenedItems = flattenItems(collection.items);
  let requestItems = includeFolders ? flattenedItems : filter(flattenedItems, (item) => isItemARequest(item));

  return find(requestItems, (request) => doesItemMatchSearchText(request, searchText));
};
