import { createListenerMiddleware } from '@reduxjs/toolkit';
import { stopScheduledSendsWithoutTab } from 'providers/ReduxStore/slices/collections/scheduled-send';

const scheduledSendMiddleware = createListenerMiddleware();

// Tabs close from many places (single tab, close all, collection close), so react to any change of the tab list
scheduledSendMiddleware.startListening({
  predicate: (_action, currentState, previousState) => currentState.tabs.tabs !== previousState.tabs.tabs,
  effect: (_action, listenerApi) => {
    const openTabUids = new Set(listenerApi.getState().tabs.tabs.map((tab) => tab.uid));
    stopScheduledSendsWithoutTab(openTabUids);
  }
});

export default scheduledSendMiddleware;
