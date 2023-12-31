import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import { findCollectionByUid, findItemInCollectionByPathname, getDefaultRequestPaneTab } from 'utils/collections/index';
import appReducer from './slices/app';
import collectionsReducer, { updateNextAction } from './slices/collections';
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
  actionCreator: updateNextAction,
  effect: async (action, listenerApi) => {
    const { nextAction, collectionUid } = action.payload;
    const { pathname } = nextAction.payload;
    let createdItem = null;
    await listenerApi.condition((action, currentState, originalState) => {
      const { collections } = currentState.collections;
      const collection = findCollectionByUid(collections, collectionUid);
      const item = findItemInCollectionByPathname(collection, pathname);
      if (item) createdItem = item;
      return !!item;
    });
    if (createdItem) {
      listenerApi.dispatch(
        addTab({
          uid: createdItem.uid,
          collectionUid,
          requestPaneTab: getDefaultRequestPaneTab(createdItem)
        })
      );
    }
  }
});

// listenerMiddleware.startListening({
//   actionCreator: addTab,
//   effect: (action, listenerApi) => {
//     console.log('Heard addTab');
//     const state = listenerApi.getState();
//     const { eventsQueue } = state.app;
//     console.log('action', action);
//     console.log('eventsQueue[0]', eventsQueue[0]);
//   }
// });

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
