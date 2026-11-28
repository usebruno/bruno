import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isOpen: false,
  page: null,
  openingId: null,
  importLoadId: null,
  chooseFolder: {
    status: 'idle',
    searchId: null,
    searchLabel: null,
    result: null
  },
  recents: {
    status: 'idle',
    loadId: null,
    items: [],
    error: null
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
      if (state.page !== action.payload) {
        state.importLoadId = null;
      }
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
    importLoadStarted: (state, action) => {
      state.importLoadId = action.payload;
    },
    importLoadEnded: (state) => {
      state.importLoadId = null;
    },
    collectionsOpeningStarted: (state, action) => {
      state.openingId = action.payload;
    },
    collectionsOpeningEnded: (state, action) => {
      if (state.openingId === action.payload) {
        state.openingId = null;
      }
    },
    recentsLoadStarted: (state, action) => {
      state.recents.loadId = action.payload;
      if (state.recents.status === 'idle') {
        state.recents.status = 'loading';
      }
    },
    recentsLoadFinished: (state, action) => {
      if (action.payload.loadId !== state.recents.loadId) {
        return;
      }
      state.recents = { ...initialState.recents, status: 'ready', items: action.payload.items };
    },
    recentsLoadFailed: (state, action) => {
      if (action.payload.loadId !== state.recents.loadId) {
        return;
      }
      state.recents.status = 'error';
      state.recents.loadId = null;
      state.recents.error = action.payload.error;
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
  importLoadStarted,
  importLoadEnded,
  collectionsOpeningStarted,
  collectionsOpeningEnded,
  recentsLoadStarted,
  recentsLoadFinished,
  recentsLoadFailed
} = openCollectionModalSlice.actions;

export default openCollectionModalSlice.reducer;
