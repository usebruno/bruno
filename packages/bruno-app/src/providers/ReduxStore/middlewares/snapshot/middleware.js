import { serializeAppSnapshot, safeValidateSnapshot } from 'utils/app-snapshot';

const { ipcRenderer } = window;

// Actions that should trigger a snapshot save
const SNAPSHOT_ACTIONS = new Set([
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
]);

const DEBOUNCE_DELAY = 1000;
let saveTimer = null;

const saveSnapshot = async (state) => {
  try {
    const snapshot = serializeAppSnapshot(state);
    const validation = safeValidateSnapshot(snapshot);
    if (!validation.success) {
      console.error('[app-snapshot] Snapshot validation failed:', validation.error.errors);
      return;
    }
    await ipcRenderer.invoke('renderer:save-app-snapshot', validation.data);
  } catch (error) {
    console.error('[app-snapshot] Failed to save snapshot:', error);
  }
};

const scheduleSave = (getState) => {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => {
    saveSnapshot(getState());
    saveTimer = null;
  }, DEBOUNCE_DELAY);
};

export const snapshotMiddleware = ({ getState }) => (next) => (action) => {
  const result = next(action);

  if (getState().app.snapshotRestoreMessage) {
    return result;
  }

  if (SNAPSHOT_ACTIONS.has(action.type)) {
    scheduleSave(getState);
  }

  return result;
};
