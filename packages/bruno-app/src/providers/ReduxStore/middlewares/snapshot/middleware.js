import { serializeAppSnapshot } from 'utils/app-snapshot';

const { ipcRenderer } = window;

const actionsToIntercept = [
  // Tab actions
  'tabs/addTab',
  'tabs/focusTab',
  'tabs/closeTabs',
  'tabs/closeAllCollectionTabs',
  'tabs/makeTabPermanent',
  'tabs/reorderTabs',
  'tabs/updateRequestPaneTab',
  'tabs/updateResponsePaneTab',
  'tabs/updateRequestPaneTabWidth',
  'tabs/updateRequestPaneTabHeight',
  'tabs/updateResponseFormat',
  'tabs/updateResponseViewTab',

  // Workspace actions
  'workspaces/setActiveWorkspace',

  // Collection actions
  'collections/collectionAddedToWorkspace',
  'collections/removeCollection',
  'collections/selectEnvironment',
  'collections/setCollectionCollapsed',

  // DevTools/Logs actions
  'logs/openConsole',
  'logs/closeConsole',
  'logs/setActiveTab',
  'logs/setDevtoolsHeight'
];

const DEBOUNCE_DELAY = 1000;
let saveTimer = null;

const saveSnapshot = async (state) => {
  try {
    const snapshot = serializeAppSnapshot(state);
    await ipcRenderer.invoke('renderer:save-app-snapshot', snapshot);
  } catch (error) {
    console.error('[app-snapshot] Failed to save snapshot:', error);
  }
};

const scheduleSave = (getState) => {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  saveTimer = setTimeout(() => {
    const state = getState();
    saveSnapshot(state);
    saveTimer = null;
  }, DEBOUNCE_DELAY);
};

export const snapshotMiddleware = ({ getState }) => (next) => (action) => {
  const result = next(action);

  const { snapshotSaveEnabled } = getState().app;
  if (!snapshotSaveEnabled) {
    return result;
  }

  if (!actionsToIntercept.includes(action.type)) {
    return result;
  }

  scheduleSave(getState);

  return result;
};
