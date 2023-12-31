import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import {
  findCollectionByUid,
  findItemInCollection,
  findItemInCollectionByPathname,
  getDefaultRequestPaneTab
} from 'utils/collections/index';
import appReducer, { insertEventsIntoQueue, removeEventsFromQueue } from './slices/app';
import collectionsReducer from './slices/collections';
import tabsReducer, { addTab } from './slices/tabs';

const listenerMiddleware = createListenerMiddleware();

listenerMiddleware.startListening({
  actionCreator: insertEventsIntoQueue,
  effect: async (action, listenerApi) => {
    const [event] = listenerApi.getState().app.eventsQueue;
    const { itemPathname, collectionUid, eventType } = event;
    let eventItem = null;
    // waiting until item is added into collection (only happens after IO completes) before handling event
    await listenerApi.condition((action, currentState, originalState) => {
      const { collections } = currentState.collections;
      const collection = findCollectionByUid(collections, collectionUid);
      const item = findItemInCollectionByPathname(collection, itemPathname);
      if (item) eventItem = item;
      return !!item;
    });
    if (eventItem) {
      switch (eventType) {
        case 'OPEN_REQUEST':
          return listenerApi.dispatch(
            addTab({
              uid: eventItem.uid,
              collectionUid,
              requestPaneTab: getDefaultRequestPaneTab(eventItem)
            })
          );
      }
    }
  }
});

listenerMiddleware.startListening({
  actionCreator: addTab,
  effect: (action, listenerApi) => {
    const { uid, collectionUid } = action.payload;
    const state = listenerApi.getState();
    const { eventsQueue } = state.app;
    const { collections } = state.collections;
    if (eventsQueue.length) {
      const collection = findCollectionByUid(collections, collectionUid);
      const item = findItemInCollection(collection, uid);
      const eventToRemove = eventsQueue.find(
        (event) => event.itemPathname === item.pathname && event.eventType === 'OPEN_REQUEST'
      );
      if (eventToRemove) {
        listenerApi.dispatch(
          removeEventsFromQueue([
            {
              eventUid: eventToRemove.eventUid
            }
          ])
        );
      }
    }
  }
});

// listenerMiddleware.startListening({
//   predicate: () => true,
//   effect: (action, listenerApi) => {
//     console.log('action', action.type);
//     console.log(listenerApi.getState());
//   }
// });

export const store = configureStore({
  reducer: {
    app: appReducer,
    collections: collectionsReducer,
    tabs: tabsReducer
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(listenerMiddleware.middleware)
});

export default store;
