import filter from 'lodash/filter';
import find from 'lodash/find';
import { flattenItems, isItemARequest } from './index';

export const doesRequestMatchSearchText = (request, searchText = '') => {
  return request?.name?.toLowerCase().includes(searchText.toLowerCase());
};

export const doesFolderHaveItemsMatchSearchText = (item, searchText = '') => {
  let flattenedItems = flattenItems(item.items);
  let requestItems = filter(flattenedItems, (item) => isItemARequest(item));

  return find(requestItems, (request) => doesRequestMatchSearchText(request, searchText));
};

export const doesCollectionHaveItemsMatchingSearchText = (collection, searchText = '') => {
  if (collection?.name?.toLowerCase().includes(searchText.toLowerCase())) {
    return true;
  }
  let flattenedItems = flattenItems(collection.items);
  let requestItems = filter(flattenedItems, (item) => isItemARequest(item));

  return find(requestItems, (request) => doesRequestMatchSearchText(request, searchText));
};
