import { isItemARequest } from './index';

const matchesNeedle = (value, needle) => Boolean(value?.toLowerCase().includes(needle));

const findMatchingRequest = (items, needle) => {
  for (const item of items ?? []) {
    if (isItemARequest(item) && !item.isTransient && (matchesNeedle(item?.name, needle) || matchesNeedle(item?.request?.url, needle))) {
      return item;
    }
    if (item?.items?.length) {
      const found = findMatchingRequest(item.items, needle);
      if (found) return found;
    }
  }
};

export const doesRequestMatchSearchText = (request, searchText = '') => {
  const needle = searchText.trim().toLowerCase();
  return matchesNeedle(request?.name, needle) || matchesNeedle(request?.request?.url, needle);
};

export const doesFolderHaveItemsMatchSearchText = (item, searchText = '') =>
  findMatchingRequest(item.items, searchText.trim().toLowerCase());

export const doesCollectionHaveItemsMatchingSearchText = (collection, searchText = '') => {
  const needle = searchText.trim().toLowerCase();
  return matchesNeedle(collection?.name, needle) || findMatchingRequest(collection.items, needle);
};
