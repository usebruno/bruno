import { createListenerMiddleware } from '@reduxjs/toolkit';
import { completeQuitFlow, removeEventsFromQueue } from 'providers/ReduxStore/slices/app';
import { addTab, closeTabs, focusTab, setShowConfirmClose } from 'providers/ReduxStore/slices/tabs';
import {
  findCollectionByUid,
  findItemInCollection,
  findItemInCollectionByPathname,
  getDefaultRequestPaneTab
} from 'utils/collections/index';
import { eventMatchesItem, eventTypes } from 'utils/events-queue/index';
import { itemIsOpenedInTabs } from 'utils/tabs/index';

const listenerMiddleware = createListenerMiddleware();

listenerMiddleware.startListening({
  predicate: (action) => ['app/insertEventsIntoQueue', 'app/removeEventsFromQueue'].includes(action.type),
  effect: async (action, listenerApi) => {
    const state = listenerApi.getState();
    const { tabs } = state.tabs;

    // after events are added or removed from queue, it will handle the first (if there is any left)
    const [firstEvent] = state.app.eventsQueue;
    if (!firstEvent) return;

    if (firstEvent.eventType === eventTypes.CLOSE_APP) {
      // this events closes the window
      return listenerApi.dispatch(completeQuitFlow());
    }

    const { itemUid, itemPathname, collectionUid, eventType } = firstEvent;
    let eventItem = null;
    if (firstEvent.eventType === eventTypes.OPEN_REQUEST) {
      // this event adds or opens a request
      // waiting until item is added into collection (only happens after IO completes) before handling event
      // this happens when first opening a request just after creating it
      await listenerApi.condition((action, currentState, originalState) => {
        const { collections } = currentState.collections;
        const collection = findCollectionByUid(collections, collectionUid);
        const item = findItemInCollectionByPathname(collection, itemPathname);
        if (item) eventItem = item;
        return !!item;
      });
    } else {
      const { collections } = state.collections;
      const collection = findCollectionByUid(collections, collectionUid);
      const item = findItemInCollection(collection, itemUid);
      if (item) eventItem = item;
    }
    if (eventItem) {
      switch (eventType) {
        case eventTypes.OPEN_REQUEST: // this event adds or opens a request
          return listenerApi.dispatch(
            itemIsOpenedInTabs(eventItem, tabs)
              ? focusTab({
                  uid: eventItem.uid
                })
              : addTab({
                  uid: eventItem.uid,
                  collectionUid,
                  requestPaneTab: getDefaultRequestPaneTab(eventItem)
                })
          );
        case eventTypes.CLOSE_REQUEST: // this event prompts the user if they want to save the request
          return listenerApi.dispatch(
            setShowConfirmClose({
              tabUid: eventItem.uid,
              showConfirmClose: true
            })
          );
      }
    }
  }
});

listenerMiddleware.startListening({
  predicate: (action) => ['tabs/addTab', 'tabs/focusTab'].includes(action.type),
  effect: (action, listenerApi) => {
    let { uid, collectionUid } = action.payload;
    const state = listenerApi.getState();
    const { eventsQueue } = state.app;
    const { collections } = state.collections;
    const { tabs } = state.tabs;

    // after tab is opened, remove corresponding event from start of queue (if any)
    const [firstEvent] = eventsQueue;
    if (firstEvent && firstEvent.eventType == eventTypes.OPEN_REQUEST) {
      collectionUid = collectionUid ?? tabs.find((t) => t.uid === uid).collectionUid;
      const collection = findCollectionByUid(collections, collectionUid);
      const item = findItemInCollection(collection, uid);
      const eventToRemove = eventMatchesItem(firstEvent, item) ? firstEvent : null;
      if (eventToRemove) {
        listenerApi.dispatch(removeEventsFromQueue([eventToRemove]));
      }
    }
  }
});

listenerMiddleware.startListening({
  actionCreator: closeTabs,
  effect: (action, listenerApi) => {
    const state = listenerApi.getState();
    const { tabUids } = action.payload;
    const { eventsQueue } = state.app;

    // after tab is closed, remove corresponding event from start of queue (if any)
    const [firstEvent] = eventsQueue;
    if (!firstEvent || firstEvent.eventType !== eventTypes.CLOSE_REQUEST) return;
    const eventToRemove = tabUids.some((uid) => uid === firstEvent.itemUid) ? firstEvent : null;
    if (eventToRemove) {
      listenerApi.dispatch(removeEventsFromQueue([eventToRemove]));
    }
  }
});

export default listenerMiddleware;
