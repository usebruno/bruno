import find from 'lodash/find';

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