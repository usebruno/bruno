import filter from 'lodash/filter';
import { isItemARequest, isItemAFolder } from 'utils/tabs';
import { doesRequestMatchSearchText, doesFolderHaveItemsMatchSearchText, doesCollectionHaveItemsMatchingSearchText } from 'utils/collections/search';
import { sortByNameThenSequence } from 'utils/common/index';

const sortItemsBySequence = (items = []) => {
  return items.sort((a, b) => a.seq - b.seq);
};

export const flattenCollectionTree = (item, collectionUid, collectionPathname, searchText) => {
  let flattened = [];
  const hasSearchText = searchText && searchText.trim().length > 0;

  if (hasSearchText) {
    if (isItemARequest(item)) {
      if (!doesRequestMatchSearchText(item, searchText)) {
        return [];
      }
    } else {
      if (!doesFolderHaveItemsMatchSearchText(item, searchText)) {
        return [];
      }
    }
  }

  flattened.push({
    type: 'collection-item',
    item,
    collectionUid,
    collectionPathname
  });

  const itemIsCollapsed = hasSearchText ? false : item.collapsed;

  if (!itemIsCollapsed) {
    const folderItems = sortByNameThenSequence(filter(item.items, (i) => isItemAFolder(i) && !i.isTransient));
    const requestItems = sortItemsBySequence(
      filter(item.items, (i) => (isItemARequest(i) || i.type === 'app') && !i.isTransient)
    );

    if (isItemAFolder(item) && folderItems.length === 0 && requestItems.length === 0 && !hasSearchText) {
      flattened.push({
        type: 'empty-folder-message',
        item,
        collectionUid,
        collectionPathname
      });
    } else {
      folderItems.forEach((child) => {
        flattened = flattened.concat(flattenCollectionTree(child, collectionUid, collectionPathname, searchText));
      });

      requestItems.forEach((child) => {
        flattened = flattened.concat(flattenCollectionTree(child, collectionUid, collectionPathname, searchText));
      });
    }
  }

  return flattened;
};

export const flattenSidebar = (sidebarEntries, searchText) => {
  let flattened = [];
  const hasSearchText = searchText && searchText.trim().length > 0;

  sidebarEntries.forEach(entry => {
    if (entry.kind === 'loaded') {
      const collection = entry.collection;
      
      if (hasSearchText && !doesCollectionHaveItemsMatchingSearchText(collection, searchText)) {
        return;
      }
      
      flattened.push({
        type: 'collection-root',
        collection
      });

      const collectionIsCollapsed = hasSearchText ? false : collection.collapsed;
      if (!collectionIsCollapsed) {
        const folderItems = sortByNameThenSequence(filter(collection.items, (i) => isItemAFolder(i) && !i.isTransient));
        const requestItems = sortItemsBySequence(
          filter(collection.items, (i) => (isItemARequest(i) || i.type === 'app') && !i.isTransient)
        );

        if (folderItems.length === 0 && requestItems.length === 0 && !hasSearchText) {
          flattened.push({
            type: 'empty-collection-message',
            collection
          });
        } else {
          folderItems.forEach((child) => {
            flattened = flattened.concat(flattenCollectionTree(child, collection.uid, collection.pathname, searchText));
          });

          requestItems.forEach((child) => {
            flattened = flattened.concat(flattenCollectionTree(child, collection.uid, collection.pathname, searchText));
          });
        }
      }
    } else if (entry.kind === 'ghost') {
      flattened.push({
        type: 'ghost-collection',
        entry: entry.entry
      });
    }
  });

  return flattened;
};
