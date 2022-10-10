import { uuid } from 'utils/common';
import cloneDeep from 'lodash/cloneDeep';
import {
  findCollectionByUid,
  recursivelyGetAllItemUids,
  transformCollectionToSaveToIdb
} from 'utils/collections';
import { saveCollectionToIdb, deleteCollectionInIdb } from 'utils/idb';

import {
  createCollection as _createCollection,
  renameCollection as _renameCollection,
  deleteCollection as _deleteCollection,
} from './index';

import { closeTabs } from 'providers/ReduxStore/slices/tabs';

export const createCollection = (collectionName) => (dispatch) => {
  const newCollection = {
    uid: uuid(),
    name: collectionName,
    items: [],
    environments: [],
  };

  return new Promise((resolve, reject) => {
    saveCollectionToIdb(window.__idb, newCollection)
      .then(() => dispatch(_createCollection(newCollection)))
      .then(resolve)
      .catch(reject);
  });
};

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

export const deleteCollection = (collectionUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  return new Promise((resolve, reject) => {
    if(!collection) {
      return reject('collection not found');
    }

    deleteCollectionInIdb(window.__idb, collection.uid)
      .then(() => {
        dispatch(closeTabs({
          tabUids: recursivelyGetAllItemUids(collection.items)
        }));
        dispatch(_deleteCollection({
          collectionUid: collectionUid
        }));
      })
      .then(resolve)
      .catch(reject);
  });
};