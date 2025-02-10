import { makeTabPermanent } from "providers/ReduxStore/slices/tabs";
import { findCollectionByUid, findItemInCollection } from "utils/collections/index";
import find from 'lodash/find';

function handleMakeTabParmanent(state, action, dispatch) {
  const tabs = state.tabs.tabs;
  const activeTabUid = state.tabs.activeTabUid;
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const itemUid = action.payload.itemUid || action.payload.folderUid
  const collection = findCollectionByUid(state.collections.collections, action.payload.collectionUid);
  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && focusedTab.preview == true) {
      dispatch(makeTabPermanent({ uid: itemUid }));
    }
  }
}

export {
  handleMakeTabParmanent
}