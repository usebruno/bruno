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

// const useCollectionNextAction = () => {
//   const collections = useSelector((state) => state.collections.collections);
//   const tabs = useSelector((state) => state.tabs.tabs);
//   const dispatch = useDispatch();

//   useEffect(() => {
//     each(collections, (collection) => {
//       if (collection.nextAction && collection.nextAction.type === 'OPEN_REQUEST') {
//         const item = findItemInCollectionByPathname(collection, get(collection, 'nextAction.payload.pathname'));

//         if (item) {
//           dispatch(updateNextAction({ collectionUid: collection.uid, nextAction: null }));
//           if (tabs.some((t) => t.uid === item.uid)) {
//             dispatch(focusTab({ uid: item.uid }));
//           } else {
//             dispatch(
//               addTab({
//                 uid: item.uid,
//                 collectionUid: collection.uid,
//                 requestPaneTab: getDefaultRequestPaneTab(item)
//               })
//             );
//             dispatch(hideHomePage());
//           }
//         }
//       }
//     });
//   }, [collections, each, dispatch, updateNextAction, hideHomePage, addTab]);
// };

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

listenerMiddleware.startListening({
  predicate: () => true,
  effect: (action, listenerApi) => {
    console.log('action', action.type);
    console.log(listenerApi.getState());
  }
});

// listenerMiddleware.startListening({
//   actionCreator: insertEventsIntoQueue,
//   effect: (action, listenerApi) => {
//     const state = listenerApi.getState();
//     const { eventsQueue } = state.app;
//     const [event] = eventsQueue;

//     if (event.type === 'OPEN_REQUEST') {
//       console.log('Dispatching addTab');
//       const { collectionUid, itemUid, itemType } = event
//       listenerApi.dispatch(
//         addTab({
//           uid: itemUid,
//           collectionUid,
//           requestPaneTab: getDefaultRequestPaneTab({ type: itemType })
//         })
//       );
//       listenerApi.dispatch(hideHomePage());
//     }
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
