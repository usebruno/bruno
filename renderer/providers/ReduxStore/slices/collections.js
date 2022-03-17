import { createSlice } from '@reduxjs/toolkit'
import { getCollectionsFromIdb } from 'utils/idb';
import { findCollectionByUid } from 'utils/collections';

const initialState = {
  collections: []
};

export const collectionsSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    loadCollections: (state, action) => {
      state.collections = action.payload;
    },
    collectionClicked: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload);

      if(collection) {
        collection.collapsed = !collection.collapsed;
      }
    }
  }
});

export const { loadCollections, collectionClicked } = collectionsSlice.actions;

export const loadCollectionsFromIdb = () => (dispatch) => {
  getCollectionsFromIdb(window.__idb)
    .then((collections) => dispatch(loadCollections(collections)))
    .catch((err) => console.log(err));
};

export default collectionsSlice.reducer;
