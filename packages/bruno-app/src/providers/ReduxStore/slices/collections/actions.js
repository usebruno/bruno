import { uuid } from 'utils/common';
import cloneDeep from 'lodash/cloneDeep';
import {
  findCollectionByUid,
  recursivelyGetAllItemUids,
  transformCollectionToSaveToIdb
} from 'utils/collections';
import { waitForNextTick } from 'utils/common';
import { saveCollectionToIdb, deleteCollectionInIdb } from 'utils/idb';

import {
  createCollection as _createCollection,
  renameCollection as _renameCollection,
  deleteCollection as _deleteCollection,
} from './index';

import { closeTabs, addTab } from 'providers/ReduxStore/slices/tabs';
import { addCollectionToWorkspace } from 'providers/ReduxStore/slices/workspaces/actions';

export const createCollection = (collectionName) => (dispatch, getState) => {
  const newCollection = {
    uid: uuid(),
    name: collectionName,
    items: [],
    environments: [],
  };

  const requestItem = {
    uid: uuid(),
    type: 'http',
    name: 'Untitled',
    request: {
      method: 'GET',
      url: '',
      headers: [],
      body: {
        mode: 'none',
        json: null,
        text: null,
        xml: null,
        multipartForm: null,
        formUrlEncoded: null
      }
    }
  };

  newCollection.items.push(requestItem)

  const state = getState();
  const { activeWorkspaceUid } = state.workspaces;

  return new Promise((resolve, reject) => {
    saveCollectionToIdb(window.__idb, newCollection)
      .then(() => dispatch(_createCollection(newCollection)))
      .then(waitForNextTick)
      .then(() => dispatch(addCollectionToWorkspace(activeWorkspaceUid, newCollection.uid)))
      .then(waitForNextTick)
      .then(() => dispatch(addTab({
        uid: requestItem.uid,
        collectionUid: newCollection.uid
      })))
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