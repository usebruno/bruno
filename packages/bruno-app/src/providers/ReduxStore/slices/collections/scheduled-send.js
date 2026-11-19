import { findCollectionByUid, findItemInCollection } from 'utils/collections';
import { sendRequest } from './actions';

// "Repeat on Interval" for a single request.
// Timers are not serializable, so they live here instead of the Redux store.
// itemUid -> { intervalMs, timer }
const schedules = new Map();
const listeners = new Set();

const notify = () => listeners.forEach((listener) => listener());

export const subscribeScheduledSends = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getScheduledSend = (itemUid) => schedules.get(itemUid) ?? null;

export const stopScheduledSend = (itemUid) => {
  const schedule = schedules.get(itemUid);
  if (!schedule) return;
  clearTimeout(schedule.timer);
  schedules.delete(itemUid);
  notify();
};

export const startScheduledSend = (itemUid, collectionUid, intervalMs) => (dispatch, getState) => {
  stopScheduledSend(itemUid);

  const fire = () => {
    const state = getState();
    const collection = findCollectionByUid(state.collections.collections, collectionUid);
    const item = collection ? findItemInCollection(collection, itemUid) : null;
    const isTabOpen = state.tabs.tabs.some((tab) => tab.uid === itemUid);

    // Request deleted, collection closed or tab closed: stop silently
    if (!item || !isTabOpen) {
      stopScheduledSend(itemUid);
      return;
    }

    // Skip this tick if the previous request is still in flight, so sends never overlap
    if (!['queued', 'sending'].includes(item.requestState)) {
      dispatch(sendRequest(item, collectionUid)).catch(() => {});
    }

    schedules.set(itemUid, { intervalMs, timer: setTimeout(fire, intervalMs) });
    notify();
  };

  fire();
};
