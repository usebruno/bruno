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

export const isSpecialTab = ({ type }) => {
  if (!type) {
    return false;
  }
  return ['variables', 'collection-settings', 'collection-runner'].includes(type);
};

export const getSpecialTabName = (type) => {
  switch (type) {
    case 'variables':
      return 'Variables';
    case 'collection-settings':
      return 'Settings';
    case 'collection-runner':
      return 'Runner';
    default:
      console.error('Unknown special tab type', type);
      return type;
  }
};
