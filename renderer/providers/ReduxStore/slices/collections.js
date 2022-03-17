import { nanoid } from 'nanoid';
import { createSlice } from '@reduxjs/toolkit'
import { getCollectionsFromIdb, saveCollectionToIdb } from 'utils/idb';
import { findCollectionByUid } from 'utils/collections';

// todo: errors should be tracked in each slice and displayed as toasts

const initialState = {
  collections: []
};

export const collectionsSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    _loadCollections: (state, action) => {
      state.collections = action.payload;
    },
    _createCollection: (state, action) => {
      state.collections.push(action.payload);
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

export default collectionsSlice.reducer;
