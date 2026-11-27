import { isItemARequest } from './index';

const matchesNeedle = (value, needle) => Boolean(value?.toLowerCase().includes(needle));

const isFolder = (item) => item?.type === 'folder';

const findMatchingItem = (items, needle) => {
  for (const item of items ?? []) {
    if (isItemARequest(item) && !item.isTransient && (matchesNeedle(item?.name, needle) || matchesNeedle(item?.request?.url, needle))) {
      return item;
    }
    if (isFolder(item) && !item.isTransient) {
      if (matchesNeedle(item?.name, needle)) return item;
      const found = findMatchingItem(item.items, needle);
      if (found) return found;
    }
  }
};

export const doesRequestMatchSearchText = (request, searchText = '') => {
  const needle = searchText.trim().toLowerCase();
  return matchesNeedle(request?.name, needle) || matchesNeedle(request?.request?.url, needle);
};

export const doesFolderHaveItemsMatchSearchText = (item, searchText = '') => {
  const needle = searchText.trim().toLowerCase();
  return matchesNeedle(item?.name, needle) || Boolean(findMatchingItem(item.items, needle));
};

export const doesCollectionHaveItemsMatchingSearchText = (collection, searchText = '') => {
  const needle = searchText.trim().toLowerCase();
  return matchesNeedle(collection?.name, needle) || Boolean(findMatchingItem(collection.items, needle));
};
