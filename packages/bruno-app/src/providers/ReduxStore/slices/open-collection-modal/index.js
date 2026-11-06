import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isOpen: false,
  page: null
};

export const openCollectionModalSlice = createSlice({
  name: 'openCollectionModal',
  initialState,
  reducers: {
    showOpenCollectionModal: (state, action) => {
      state.isOpen = true;
      state.page = action.payload;
    },
    showOpenCollectionPage: (state, action) => {
      state.page = action.payload;
    },
    hideOpenCollectionModal: () => initialState
  }
});

export const { showOpenCollectionModal, showOpenCollectionPage, hideOpenCollectionModal } = openCollectionModalSlice.actions;

export default openCollectionModalSlice.reducer;
