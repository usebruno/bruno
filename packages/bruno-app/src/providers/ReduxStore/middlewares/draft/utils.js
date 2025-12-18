import { makeTabPermanent, selectTabsForLocation, selectActiveTabIdForLocation } from 'providers/ReduxStore/slices/tabs';
import { findCollectionByUid, findItemInCollection } from 'utils/collections/index';
import find from 'lodash/find';

const LOCATION = 'request-pane';

function handleMakeTabParmanent(state, action, dispatch) {
  const tabs = state.tabs.tabs[LOCATION] || [];
  const activeTabUid = state.tabs.activeTabId[LOCATION];
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);

  if (!focusedTab || focusedTab.preview !== true) {
    return;
  }

  const { itemUid, folderUid, collectionUid } = action.payload;
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  if (!collection) {
    return;
  }

  // Handle request-level changes
  if (itemUid) {
    const item = findItemInCollection(collection, itemUid);
    if (item) {
      dispatch(makeTabPermanent({ uid: itemUid, location: LOCATION }));
    }
  } else if (folderUid) { // Handle folder-level changes (folder settings tab)
    const folder = findItemInCollection(collection, folderUid);
    if (folder) {
      dispatch(makeTabPermanent({ uid: folderUid, location: LOCATION }));
    }
  } else if (collectionUid) {
    // Handle collection-level changes (collection settings tab)
    dispatch(makeTabPermanent({ uid: collectionUid, location: LOCATION }));
  }
}

export {
  handleMakeTabParmanent
};
