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

export const findItem = (items = [], itemId) => {
  return find(items, (i) => i.id === itemId);
};

export const isItemARequest = (item) => {
  return item.hasOwnProperty('request');
};

export const itemIsOpenedInTabs = (item, tabs) => {
  return find(tabs, (t) => t.id === item.id);
};

export const cloneItem = (item) => {
  return cloneDeep(item);
};

export const updateRequestTabAsChanged = (requestTabs, itemId) => {
  let currentTab = find(requestTabs, (rt) => rt.id == itemId);
  if(currentTab) {
    currentTab.hasChanges = true;
  }
};
