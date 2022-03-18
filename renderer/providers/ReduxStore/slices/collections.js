import { nanoid } from 'nanoid';
import { createSlice } from '@reduxjs/toolkit'
import { getCollectionsFromIdb, saveCollectionToIdb } from 'utils/idb';
import { sendNetworkRequest } from 'utils/network';
import { findCollectionByUid, findItemInCollection } from 'utils/collections';

// todo: errors should be tracked in each slice and displayed as toasts

const initialState = {
  collections: []
};

export const collectionsSlice = createSlice({
  name: 'collections',
  initialState,
  reducers: {
    _loadCollections: (state, action) => {
      state.collections = action.payload;
    },
    _createCollection: (state, action) => {
      state.collections.push(action.payload);
    },
    _requestSent: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if(collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);
        if(item) {
          item.response = item.response || {};
          item.response.state = 'sending';
        }
      }
    },
    _responseReceived: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if(collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);
        if(item) {
          item.response = action.payload.response;
        }
      }
    },
    collectionClicked: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload);

      if(collection) {
        collection.collapsed = !collection.collapsed;
      }
    }
  }
});

export const {
  _loadCollections,
  _createCollection,
  _requestSent,
  _responseReceived,
  collectionClicked
} = collectionsSlice.actions;

export const loadCollectionsFromIdb = () => (dispatch) => {
  getCollectionsFromIdb(window.__idb)
    .then((collections) => dispatch(_loadCollections(collections)))
    .catch((err) => console.log(err));
};

export const createCollection = (collectionName) => (dispatch) => {
  const newCollection = {
    uid: nanoid(),
    name: collectionName,
    items: [],
    environments: [],
    userId: null
  };

  saveCollectionToIdb(window.__idb, newCollection)
    .then(() => dispatch(_createCollection(newCollection)))
    .catch((err) => console.log(err));
};

export const sendRequest = (item, collectionUid) => (dispatch) => {
  dispatch(_requestSent({
    itemUid: item.uid,
    collectionUid: collectionUid
  }));
  sendNetworkRequest(item)
    .then((response) => dispatch(_responseReceived({
      itemUid: item.uid,
      collectionUid: collectionUid,
      response: response
    })))
    .catch((err) => console.log(err));
};

export default collectionsSlice.reducer;
