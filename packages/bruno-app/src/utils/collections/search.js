import { flattenItems, isItemARequest } from './index';
import filter from 'lodash/filter';
import find from 'lodash/find';

export const doesRequestMatchSearchText = (request, searchText = '') => {
  return request?.name?.toLowerCase().includes(searchText.toLowerCase());
};

export const doesFolderMatchSearchText = (folder, searchText = '') => {
  return folder?.name?.toLowerCase().includes(searchText.toLowerCase());
};

export const doesCollectionMatchSearchText = (collection, searchText = '') => {
  return collection?.name?.toLowerCase().includes(searchText.toLowerCase());
};

export const doesFolderHaveItemsMatchSearchText = (item, searchText = '') => {
  // First check if the folder name itself matches
  if (doesFolderMatchSearchText(item, searchText)) {
    return true;
  }

  // Then check if any requests inside match
  let flattenedItems = flattenItems(item.items);
  let requestItems = filter(flattenedItems, (item) => isItemARequest(item));

  return find(requestItems, (request) => doesRequestMatchSearchText(request, searchText));
};

export const doesCollectionHaveItemsMatchingSearchText = (collection, searchText = '') => {
  // First check if the collection name itself matches
  if (doesCollectionMatchSearchText(collection, searchText)) {
    return true;
  }

  // Then check if any requests or folders inside match
  let flattenedItems = flattenItems(collection.items);
  let requestItems = filter(flattenedItems, (item) => isItemARequest(item));
  let folderItems = filter(flattenedItems, (item) => !isItemARequest(item));

  return find(requestItems, (request) => doesRequestMatchSearchText(request, searchText)) ||
         find(folderItems, (folder) => doesFolderMatchSearchText(folder, searchText));
};
