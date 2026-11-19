import toast from 'react-hot-toast';
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

export const stopScheduledSendsWithoutTab = (openTabUids) => {
  [...schedules.keys()].filter((itemUid) => !openTabUids.has(itemUid)).forEach(stopScheduledSend);
};

export const startScheduledSend = (itemUid, collectionUid, intervalMs) => (dispatch, getState) => {
  stopScheduledSend(itemUid);

  const schedule = { intervalMs, timer: null };
  // A stop (or a restart) while a send is in flight replaces or removes this entry
  const isActive = () => schedules.get(itemUid) === schedule;

  const fire = async () => {
    if (!isActive()) return;

    const state = getState();
    const collection = findCollectionByUid(state.collections.collections, collectionUid);
    const item = collection ? findItemInCollection(collection, itemUid) : null;
    const isTabOpen = state.tabs.tabs.some((tab) => tab.uid === itemUid);

    // Request deleted, collection closed or tab closed: stop silently
    if (!item || !isTabOpen) {
      stopScheduledSend(itemUid);
      return;
    }

    // A send already in flight (or an open stream, which a new send would cancel) is left alone until the next tick
    const isBusy = ['queued', 'sending'].includes(item.requestState) || item.response?.stream?.running;
    if (!isBusy) {
      try {
        // Waiting for the send to settle keeps sends from overlapping and prompts from stacking up
        await dispatch(sendRequest(item, collectionUid));
      } catch (error) {
        stopScheduledSend(itemUid);
        toast.error(`Repeat on Interval stopped: ${error?.message || 'the request could not be sent'}`);
        return;
      }
    }

    if (isActive()) {
      schedule.timer = setTimeout(fire, intervalMs);
    }
  };

  schedules.set(itemUid, schedule);
  notify();
  fire();
};
