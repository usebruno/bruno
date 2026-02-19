import { cloneDeep, set } from 'lodash';
import { findCollectionByUid, findItemInCollection, isItemARequest } from 'utils/collections';

export const updateRequestHooksScript = (state, action) => {
  const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, action.payload.itemUid);

    if (item && isItemARequest(item)) {
      if (!item.draft) {
        item.draft = cloneDeep(item);
      }
      set(item.draft, 'request.script.hooks', action.payload.hooks);
    }
  }
};

export const updateCollectionHooksScript = (state, action) => {
  const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

  if (collection) {
    if (!collection.draft) {
      collection.draft = {
        root: cloneDeep(collection.root)
      };
    }
    set(collection, 'draft.root.request.script.hooks', action.payload.hooks);
  }
};

export const updateFolderHooksScript = (state, action) => {
  const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
  const folder = collection ? findItemInCollection(collection, action.payload.folderUid) : null;
  if (folder) {
    if (!folder.draft) {
      folder.draft = cloneDeep(folder.root) || {};
    }
    set(folder, 'draft.request.script.hooks', action.payload.hooks);
  }
};
