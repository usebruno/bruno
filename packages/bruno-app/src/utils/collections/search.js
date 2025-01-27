import { flattenItems, isItemARequest } from './index';
import filter from 'lodash/filter';
import find from 'lodash/find';

export const doesRequestMatchSearchText = (item, searchText = '', viewRequestBy = 'name') => {
  let value = item?.name;
  
  if(item.type === 'http-request' && viewRequestBy === 'url' && item?.request?.url){
    let url = item.request.url;

    value = url.substring(url.indexOf('/', 8),
                          (url.includes('?') ? url.indexOf('?') : url.length));
  }
  
  return value?.toLowerCase().includes(searchText.toLowerCase());
};

export const doesFolderHaveItemsMatchSearchText = (item, searchText = '', viewRequestBy = 'name') => {
  let flattenedItems = flattenItems(item.items);
  let requestItems = filter(flattenedItems, (item) => isItemARequest(item));

  return find(requestItems, (item) => doesRequestMatchSearchText(item, searchText, viewRequestBy));
};

export const doesCollectionHaveItemsMatchingSearchText = (collection, searchText = '', viewRequestBy = 'name') => {
  let flattenedItems = flattenItems(collection.items);
  let requestItems = filter(flattenedItems, (item) => isItemARequest(item));

  return find(requestItems, (item) => doesRequestMatchSearchText(item, searchText, viewRequestBy));
};
