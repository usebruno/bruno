import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import isEqual from 'lodash/isEqual';
import {
  collectionAddFileEvent,
  collectionChangeFileEvent,
  updateCollectionLoadingState,
  setItemWarnings,
  setCollectionWarnings
} from 'providers/ReduxStore/slices/collections';
import { findCollectionByUid, findItemInCollection, findItemInCollectionByPathname } from 'utils/collections';
import { validateItem, validateCollection } from 'utils/warnings';
import path from 'utils/common/path';

const warningsMiddleware = createListenerMiddleware();

/**
 * Listener A: File add/change events — validate the affected item incrementally.
 * Skips validation while collection is still loading (bulk load).
 */
warningsMiddleware.startListening({
  matcher: isAnyOf(collectionAddFileEvent, collectionChangeFileEvent),
  effect: (action, listenerApi) => {
    const state = listenerApi.getState();
    const file = action.payload.file;
    const collectionUid = file.meta.collectionUid;
    const collection = findCollectionByUid(state.collections.collections, collectionUid);

    if (!collection || collection.isLoading) return;

    const isCollectionRoot = !!file.meta.collectionRoot;
    const isFolderRoot = !!file.meta.folderRoot;

    if (isCollectionRoot) {
      // Validate collection root scripts
      const syntheticItem = { type: 'folder', root: collection.root };
      const newWarnings = validateItem(syntheticItem);
      if (!isEqual(newWarnings, collection.warnings || [])) {
        listenerApi.dispatch(setItemWarnings({
          collectionUid,
          itemUid: collectionUid,
          warnings: newWarnings
        }));
      }
      return;
    }

    if (isFolderRoot) {
      const folderPath = path.dirname(file.meta.pathname);
      const folder = findItemInCollectionByPathname(collection, folderPath);
      if (folder) {
        const newWarnings = validateItem(folder);
        if (!isEqual(newWarnings, folder.warnings || [])) {
          listenerApi.dispatch(setItemWarnings({
            collectionUid,
            itemUid: folder.uid,
            warnings: newWarnings
          }));
        }
      }
      return;
    }

    // Regular request file
    const itemUid = file.data?.uid;
    if (itemUid) {
      const item = findItemInCollection(collection, itemUid);
      if (item) {
        // Skip validation for items that failed to parse — script fields are unreliable.
        // Clear any stale warnings so the warning icon doesn't overlap the parse-error icon.
        if (item.partial || item.error) {
          if (item.warnings?.length) {
            listenerApi.dispatch(setItemWarnings({
              collectionUid,
              itemUid: item.uid,
              warnings: []
            }));
          }
          return;
        }

        const newWarnings = validateItem(item);
        if (!isEqual(newWarnings, item.warnings || [])) {
          listenerApi.dispatch(setItemWarnings({
            collectionUid,
            itemUid: item.uid,
            warnings: newWarnings
          }));
        }
      }
    }
  }
});

/**
 * Listener B: Loading complete — run full validation pass on the collection.
 */
warningsMiddleware.startListening({
  actionCreator: updateCollectionLoadingState,
  effect: (action, listenerApi) => {
    if (action.payload.isLoading !== false) return;

    const state = listenerApi.getState();
    const collectionUid = action.payload.collectionUid;
    const collection = findCollectionByUid(state.collections.collections, collectionUid);

    if (!collection) return;

    const warningsMap = validateCollection(collection);
    // Only dispatch if there are warnings to set, or if existing warnings need clearing
    listenerApi.dispatch(setCollectionWarnings({ collectionUid, warningsMap }));
  }
});

export default warningsMiddleware;
