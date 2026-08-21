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

export const getActiveScriptTab = (scriptPaneTab, requestScript) => {
  if (scriptPaneTab) return scriptPaneTab;
  const hasPreRequestScript = requestScript && requestScript.trim().length > 0;
  return hasPreRequestScript ? 'pre-request' : 'post-response';
};

export const getActiveGrpcScriptTab = (scriptPaneTab, scripts) => {
  if (scriptPaneTab) return scriptPaneTab;
  if (scripts?.beforeCallStart && scripts.beforeCallStart.trim().length > 0) return 'grpc:before-call-start';
  if (scripts?.beforeMessageSend && scripts.beforeMessageSend.trim().length > 0) return 'grpc:before-message-send';
  if (scripts?.afterMessageReceive && scripts.afterMessageReceive.trim().length > 0) return 'grpc:after-message-receive';
  if (scripts?.afterCallEnd && scripts.afterCallEnd.trim().length > 0) return 'grpc:after-call-end';
  return 'grpc:before-call-start';
};
