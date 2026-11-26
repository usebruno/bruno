import find from 'lodash/find';
import findLast from 'lodash/findLast';

export const isItemARequest = (item) => {
  return item.hasOwnProperty('request') && ['http-request', 'graphql-request', 'grpc-request', 'ws-request'].includes(item.type);
};

export const isItemAFolder = (item) => {
  return !item.hasOwnProperty('request') && item.type === 'folder';
};

export const itemIsOpenedInTabs = (item, tabs) => {
  return find(tabs, (t) => t.uid === item.uid);
};

export const getActiveScriptTab = (scriptPaneTab, requestScript) => {
  if (scriptPaneTab) return scriptPaneTab;
  const hasPreRequestScript = requestScript && requestScript.trim().length > 0;
  return hasPreRequestScript ? 'pre-request' : 'post-response';
};

export const getNeighbourCollectionUid = (orderedUids, closedUid, hasTabs) => {
  const index = orderedUids.indexOf(closedUid);
  if (index === -1) return null;
  return find(orderedUids.slice(index + 1), hasTabs) || findLast(orderedUids.slice(0, index), hasTabs) || null;
};
