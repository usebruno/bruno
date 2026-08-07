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

// App-level tabs aren't tied to a collection and stay visible in every collection's strip.
const isAppLevelTab = (tab) => tab.type === 'preferences';

// The workspace home tabs (overview, environments) belong to the workspace, not to a collection
// shown in the sidebar. Loose scratch requests live in the same scratch collection but are ordinary
// request tabs, so they must not be lumped together with these.
const isWorkspaceHomeTab = (tab) => tab.type === 'workspaceOverview' || tab.type === 'workspaceEnvironments';

// The tabs the tab strip shows, which hotkeys and tab navigation must stay in lockstep with.
// With tabs-across-collections off, only the active collection's tabs (plus app-level tabs) are
// shown. With it on, every collection's request tabs are shown together — including loose scratch
// requests — while the workspace home tabs stay out unless the workspace home itself is active.
export const getVisibleTabs = ({ tabs, tabsAcrossCollections, activeTab }) => {
  const activeTabCollectionUid = activeTab?.collectionUid;
  if (!tabsAcrossCollections) {
    return tabs.filter((tab) => isAppLevelTab(tab) || tab.collectionUid === activeTabCollectionUid);
  }
  const inWorkspaceHome = activeTab ? isWorkspaceHomeTab(activeTab) : false;
  return tabs.filter((tab) => {
    if (isAppLevelTab(tab)) return true;
    if (isWorkspaceHomeTab(tab)) return inWorkspaceHome;
    return true;
  });
};

export const scrollToTheActiveTab = () => {
  const activeTab = document.querySelector('.request-tab.active');
  if (activeTab) {
    activeTab.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

export const getActiveScriptTab = (scriptPaneTab, requestScript) => {
  if (scriptPaneTab) return scriptPaneTab;
  const hasPreRequestScript = requestScript && requestScript.trim().length > 0;
  return hasPreRequestScript ? 'pre-request' : 'post-response';
};
