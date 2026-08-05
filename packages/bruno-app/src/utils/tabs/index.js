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

// The tabs the tab strip shows, which hotkeys and tab navigation must stay in lockstep with.
// With tabs-across-collections off, only the active collection's tabs are shown. With it on,
// every collection's tabs are shown together, but workspace-level scratch tabs (overview,
// environments, scratch requests) stay out unless their workspace is the active context —
// they belong to the workspace, not to a collection shown in the sidebar.
export const getVisibleTabs = ({ tabs, tabsAcrossCollections, activeTabCollectionUid, scratchCollectionUids }) => {
  if (!tabsAcrossCollections) {
    return tabs.filter((tab) => tab.collectionUid === activeTabCollectionUid);
  }
  return tabs.filter(
    (tab) => !scratchCollectionUids.has(tab.collectionUid) || tab.collectionUid === activeTabCollectionUid
  );
};

export const scrollToTheActiveTab = () => {
  const activeTab = document.querySelector('.request-tab.active');
  if (activeTab) {
    activeTab.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};
