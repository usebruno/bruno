import cloneDeep from 'lodash/cloneDeep';
import {
  findCollectionByUid,
  findItemInCollection,
  transformCollectionToSaveToIdb
} from 'utils/collections';
import { saveCollectionToIdb } from 'utils/idb';

import {
  _renameCollection
} from './index';

export const renameCollection = (newName, collectionUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  if(collection) {
    const collectionCopy = cloneDeep(collection);
    collectionCopy.name = newName;
    const collectionToSave = transformCollectionToSaveToIdb(collectionCopy, {
      ignoreDraft: true
    });

    saveCollectionToIdb(window.__idb, collectionToSave)
      .then(() => {
        dispatch(_renameCollection({
          newName: newName,
          collectionUid: collectionUid
        }));
      })
      .catch((err) => console.log(err));
  }
};