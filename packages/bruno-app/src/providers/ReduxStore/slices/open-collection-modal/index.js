import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isOpen: false,
  page: null,
  openingId: null,
  chooseFolder: {
    status: 'idle',
    searchId: null,
    searchLabel: null,
    result: null
  }
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
      if (state.chooseFolder.result) {
        state.chooseFolder.result.note = null;
      }
    },
    hideOpenCollectionModal: () => initialState,
    folderPickStarted: (state) => {
      state.chooseFolder.status = 'picking';
    },
    folderSearchStarted: (state, action) => {
      state.chooseFolder.status = 'searching';
      state.chooseFolder.searchId = action.payload.searchId;
      state.chooseFolder.searchLabel = action.payload.searchLabel;
    },
    folderSearchFinished: (state, action) => {
      if (action.payload.searchId !== state.chooseFolder.searchId) {
        return;
      }
      state.chooseFolder = { ...initialState.chooseFolder, result: action.payload.result };
    },
    folderPickEnded: (state) => {
      state.chooseFolder.status = 'idle';
      state.chooseFolder.searchId = null;
      state.chooseFolder.searchLabel = null;
    },
    folderNoteDismissed: (state) => {
      if (state.chooseFolder.result) {
        state.chooseFolder.result.note = null;
      }
    },
    folderResultCleared: (state) => {
      state.chooseFolder.result = null;
    },
    collectionsOpeningStarted: (state, action) => {
      state.openingId = action.payload;
    },
    collectionsOpeningEnded: (state, action) => {
      if (state.openingId === action.payload) {
        state.openingId = null;
      }
    }
  }
});

export const {
  showOpenCollectionModal,
  showOpenCollectionPage,
  hideOpenCollectionModal,
  folderPickStarted,
  folderSearchStarted,
  folderSearchFinished,
  folderPickEnded,
  folderNoteDismissed,
  folderResultCleared,
  collectionsOpeningStarted,
  collectionsOpeningEnded
} = openCollectionModalSlice.actions;

export default openCollectionModalSlice.reducer;
