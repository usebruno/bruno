import { serializeAppSnapshot, safeValidateSnapshot } from 'utils/app-snapshot';

const { ipcRenderer } = window;

/**
 * State selectors for snapshot-relevant state.
 *
 * Instead of tracking specific actions, we track state changes directly.
 * This approach makes it easier to extend the snapshot to new states -
 * just add serialization/deserialization and add a selector here.
 *
 * Each selector extracts a piece of state that, when changed, should trigger
 * a snapshot save. We use reference equality for comparison, which works
 * because Redux uses immutable updates.
 */
const watchedStateSelectors = [
  // Tabs - entire slice (tabs array and activeTabUid)
  (state) => state.tabs,

  // Collections - extract only snapshot-relevant properties to avoid
  // triggering on unrelated changes (like request/response data)
  (state) => {
    const collections = state.collections.collections;
    // Create a derived value that only changes when snapshot-relevant properties change
    return collections.map((c) => `${c.uid}:${c.collapsed}:${c.mountStatus}:${c.activeEnvironmentUid}`).join('|');
  },

  // Workspaces - active workspace
  (state) => state.workspaces.activeWorkspaceUid,

  // DevTools/Logs - console state
  (state) => state.logs.isConsoleOpen,
  (state) => state.logs.activeTab,
  (state) => state.logs.devtoolsHeight
];

const DEBOUNCE_DELAY = 1000;
let saveTimer = null;

const saveSnapshot = async (state) => {
  try {
    const snapshot = serializeAppSnapshot(state);

    // Validate snapshot against schema before saving
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
    const state = getState();
    saveSnapshot(state);
    saveTimer = null;
  }, DEBOUNCE_DELAY);
};

/**
 * Snapshot middleware that tracks state changes instead of actions.
 *
 * This approach eliminates the need to maintain a list of actions that affect
 * snapshot state. To add new state to the snapshot:
 * 1. Add serialization in utils/app-snapshot/index.js
 * 2. Add deserialization in utils/app-snapshot/restore.js
 * 3. Add a selector to watchedStateSelectors above
 */
export const snapshotMiddleware = ({ getState }) => {
  // Track previous values of watched state
  let prevValues = null;

  return (next) => (action) => {
    const result = next(action);

    const state = getState();
    const { snapshotRestoreMessage } = state.app;

    // Don't save while restoring (message is set during restore)
    if (snapshotRestoreMessage) {
      return result;
    }

    // Get current values of all watched state
    const currentValues = watchedStateSelectors.map((selector) => selector(state));

    // Check if any watched state has changed
    const hasChanged
      = prevValues === null || currentValues.some((value, index) => value !== prevValues[index]);

    if (hasChanged) {
      scheduleSave(getState);
    }

    // Update previous values for next comparison
    prevValues = currentValues;

    return result;
  };
};
