import find from 'lodash/find';
import { REQUEST_TYPES } from 'utils/common/constants';

export const isItemARequest = (item) => {
  return item.hasOwnProperty('request') && [REQUEST_TYPES.HTTP_REQUEST, REQUEST_TYPES.GRAPHQL_REQUEST, REQUEST_TYPES.GRPC_REQUEST, REQUEST_TYPES.WS_REQUEST].includes(item.type);
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
