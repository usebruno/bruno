import find from 'lodash/find';
import { findParentItemInCollection } from '../collections';

export const isItemARequest = (item) => {
  return item.hasOwnProperty('request') && ['http-request', 'graphql-request', 'grpc-request', 'ws-request'].includes(item.type);
};

export const isItemAFolder = (item) => {
  return !item.hasOwnProperty('request') && item.type === 'folder';
};

export const itemIsOpenedInTabs = (item, tabs) => {
  return find(tabs, (t) => t.uid === item.uid);
};

export const scrollToTheActiveTab = () => {
  const activeTab = document.querySelector('.request-tab.active');
  if (activeTab) {
    activeTab.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

export const sortTabs = (tabs, order) => {
  if (!order || !order.length) {
    return tabs;
  }

  const sortedTabs = [...tabs];
  sortedTabs.sort((a, b) => {
    const aIndex = order.indexOf(a.key);
    const bIndex = order.indexOf(b.key);

    if (aIndex === -1 && bIndex === -1) {
      return 0;
    }

    if (aIndex === -1) {
      return 1;
    }

    if (bIndex === -1) {
      return -1;
    }

    return aIndex - bIndex;
  });

  return sortedTabs;
};

export const getEffectiveTabOrder = (item, collection, preferences) => {
  const scope = preferences.requestTabOrderPersistenceScope || 'global';
  let type = 'http';
  if (item.type === 'graphql-request') type = 'graphql';
  if (item.type === 'grpc-request') type = 'grpc';
  if (item.type === 'ws-request') type = 'ws';

  if (scope === 'global') {
    return preferences.requestTabOrder?.[type];
  }

  if (scope === 'request') {
    return item.requestTabOrder;
  }

  if (scope === 'folder') {
    const parentFolder = findParentItemInCollection(collection, item.uid);
    if (parentFolder) {
      return parentFolder.requestTabOrder;
    }
    return collection.requestTabOrder;
  }

  if (scope === 'collection') {
    return collection.requestTabOrder;
  }

  return preferences.requestTabOrder?.[type];
};
