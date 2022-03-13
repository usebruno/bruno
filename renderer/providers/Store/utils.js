import each from 'lodash/each';
import find from 'lodash/find';
import cloneDeep from 'lodash/cloneDeep';

export const flattenItems = (items = []) => {
  const flattenedItems = [];

  const flatten = (itms, flattened) => {
    each(itms, (i) => {
      flattened.push(i);

      if(i.items && i.items.length) {
        flatten(i.items, flattened);
      }
    })
  }

  flatten(items, flattenedItems);

  return flattenedItems;
};

export const findItem = (items = [], itemUid) => {
  return find(items, (i) => i.uid === itemUid);
};

export const isItemARequest = (item) => {
  return item.hasOwnProperty('request');
};

export const itemIsOpenedInTabs = (item, tabs) => {
  return find(tabs, (t) => t.uid === item.uid);
};

export const cloneItem = (item) => {
  return cloneDeep(item);
};

export const updateRequestTabAsChanged = (requestTabs, itemUid) => {
  let currentTab = find(requestTabs, (rt) => rt.uid == itemUid);
  if(currentTab) {
    currentTab.hasChanges = true;
  }
};

export const findCollectionByUid = (collections, collectionUid) => {
  return find(collections, (c) => c.uid === collectionUid);
};
