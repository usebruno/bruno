import { createSlice } from '@reduxjs/toolkit'
import { getCollectionsFromIdb } from 'utils/idb';

const initialState = {
  collections: []
};

export const collectionsSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    loadCollections: (state, action) => {
      state.collections = action.payload;
    }
  }
});

export const { loadCollections } = collectionsSlice.actions;

export const loadCollectionsFromIdb = () => (dispatch) => {
  getCollectionsFromIdb(window.__idb)
    .then((collections) => dispatch(loadCollections(collections)))
    .catch((err) => console.log(err));
};

export default collectionsSlice.reducer;
