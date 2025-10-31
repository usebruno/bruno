import { makeTabPermanent } from "providers/ReduxStore/slices/tabs";
import { findCollectionByUid, findItemInCollection } from "utils/collections/index";
import find from 'lodash/find';

function handleMakeTabParmanent(state, action, dispatch) {
  const tabs = state.tabs.tabs;
  const activeTabUid = state.tabs.activeTabUid;
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
      dispatch(makeTabPermanent({ uid: itemUid }));
    }
  }
  // Handle folder-level changes (folder settings tab)
  else if (folderUid) {
    const folder = findItemInCollection(collection, folderUid);
    if (folder) {
      dispatch(makeTabPermanent({ uid: folderUid }));
    }
  } else if (collectionUid) {
    // Handle collection-level changes (collection settings tab)
    dispatch(makeTabPermanent({ uid: collectionUid }));
  }
}

export {
  handleMakeTabParmanent
}