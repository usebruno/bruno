/**
 * Snapshot Middleware
 *
 * Automatically saves app state to disk when relevant state changes occur.
 * Uses debouncing to prevent excessive disk writes.
 */

import { SAVE_TRIGGERS } from 'utils/snapshot';
import { serializeSnapshot } from './serializeSnapshot';

const { ipcRenderer } = window;

let saveTimer = null;
const DEBOUNCE_MS = 1000;

const scheduleSave = (getState) => {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  saveTimer = setTimeout(async () => {
    try {
      const state = getState();

      if (!state.app?.snapshotReady) {
        saveTimer = null;
        return;
      }

      const snapshot = await serializeSnapshot(state);
      await ipcRenderer.invoke('renderer:snapshot:save', snapshot);
    } catch (err) {
      console.error('Failed to save snapshot:', err);
    }
    saveTimer = null;
  }, DEBOUNCE_MS);
};

export const flushSnapshotNow = async (getState) => {
  try {
    const state = getState();
    const snapshot = await serializeSnapshot(state);
    await ipcRenderer.invoke('renderer:snapshot:save', snapshot);
  } catch (err) {
    console.error('Failed to flush snapshot:', err);
  }
};

/**
 * Snapshot middleware
 * Only saves after app signals it's ready (snapshotReady = true)
 */
export const snapshotMiddleware = ({ getState }) => (next) => (action) => {
  const wasSnapshotReady = getState().app.snapshotReady;
  const result = next(action);

  if (action.type === 'app/setSnapshotReady' && action.payload === false && wasSnapshotReady) {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }

    void flushSnapshotNow(getState);
    return result;
  }

  const state = getState();
  if (state.app.snapshotReady && SAVE_TRIGGERS.has(action.type)) {
    scheduleSave(getState);
  }

  return result;
};

export default snapshotMiddleware;
