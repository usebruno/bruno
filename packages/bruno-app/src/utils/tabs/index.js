import find from 'lodash/find';

export const isItemARequest = (item) => {
  return item.hasOwnProperty('request') && ['http-request', 'graphql-request'].includes(item.type);
};

export const isItemAFolder = (item) => {
  return !item.hasOwnProperty('request') && item.type === 'folder';
};

export const itemIsOpenedInTabs = (item, tabs) => {
  return find(tabs, (t) => t.uid === item.uid);
};

export const isFolderSettingsOpenedInTabs = (tabs, { collectionUid, folderUid, type }) => {
  return tabs.find((tab) => tab.collectionUid === collectionUid && tab.folderUid === folderUid && tab.type === type);
};
