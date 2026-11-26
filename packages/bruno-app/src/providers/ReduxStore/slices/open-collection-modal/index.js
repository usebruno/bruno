import { createSlice } from '@reduxjs/toolkit';
import { DEFAULT_OPEN_COLLECTION_PAGE, OPEN_COLLECTION_PAGE } from 'utils/common/constants';
import { mergeFoundCollections } from './found-collections';

const MENU_PAGES = Object.values(OPEN_COLLECTION_PAGE);

const showPage = (state, page) => {
  state.page = page;
  if (MENU_PAGES.includes(page)) {
    state.lastPage = page;
  }
};

const initialState = {
  isOpen: false,
  page: null,
  lastPage: DEFAULT_OPEN_COLLECTION_PAGE,
  openingId: null,
  importLoadId: null,
  importRequest: null,
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
  },
  myComputer: {
    status: 'idle',
    scanId: null,
    locations: null,
    collections: [],
    previousCollections: [],
    error: null
  }
};

export const openCollectionModalSlice = createSlice({
  name: 'openCollectionModal',
  initialState,
  reducers: {
    showOpenCollectionModal: (state, action) => {
      state.isOpen = true;
      showPage(state, action.payload);
    },
    showOpenCollectionPage: (state, action) => {
      if (state.page !== action.payload) {
        state.importLoadId = null;
      }
      showPage(state, action.payload);
      if (state.chooseFolder.result) {
        state.chooseFolder.result.note = null;
      }
    },
    hideOpenCollectionModal: (state) => ({ ...initialState, lastPage: state.lastPage }),
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
    folderResultAddedToSearch: (state, action) => {
      const { result } = state.chooseFolder;
      if (result?.id === action.payload.resultId && result.note) {
        result.note = { tone: 'info', text: action.payload.text };
        result.addedToSearch = true;
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
    importRequested: (state, action) => {
      state.importRequest = action.payload;
    },
    importRequestTaken: (state) => {
      state.importRequest = null;
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
    },
    myComputerScanStarted: (state, action) => {
      const { myComputer } = state;
      myComputer.previousCollections = mergeFoundCollections(myComputer.previousCollections, myComputer.collections);
      myComputer.collections = [];
      myComputer.status = 'scanning';
      myComputer.scanId = action.payload;
      myComputer.error = null;
    },
    myComputerLocationsReceived: (state, action) => {
      const { myComputer } = state;
      if (action.payload.scanId !== myComputer.scanId || myComputer.status !== 'scanning') {
        return;
      }
      const locationIds = new Set(action.payload.locations.map((location) => location.id));
      const removedIds = new Set((myComputer.locations || []).map((location) => location.id).filter((id) => !locationIds.has(id)));
      myComputer.previousCollections = myComputer.previousCollections.filter((collection) => !removedIds.has(collection.locationId));
      myComputer.locations = action.payload.locations.map((location) => ({ ...location, status: 'scanning', found: 0 }));
    },
    myComputerCollectionsFound: (state, action) => {
      const { myComputer } = state;
      if (action.payload.scanId !== myComputer.scanId) {
        return;
      }
      myComputer.collections = mergeFoundCollections(myComputer.collections, action.payload.collections);
    },
    myComputerScanFinished: (state, action) => {
      const { myComputer } = state;
      if (action.payload.scanId !== myComputer.scanId) {
        return;
      }
      myComputer.locations = action.payload.locations;
      if (action.payload.error) {
        myComputer.status = 'error';
        myComputer.error = action.payload.error;
        return;
      }
      myComputer.status = 'done';
      myComputer.previousCollections = [];
    },
    myComputerScanFailed: (state, action) => {
      const { myComputer } = state;
      if (action.payload.scanId !== myComputer.scanId) {
        return;
      }
      myComputer.status = 'error';
      myComputer.error = action.payload.error;
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
  folderResultAddedToSearch,
  folderResultCleared,
  importLoadStarted,
  importLoadEnded,
  importRequested,
  importRequestTaken,
  collectionsOpeningStarted,
  collectionsOpeningEnded,
  recentsLoadStarted,
  recentsLoadFinished,
  recentsLoadFailed,
  myComputerScanStarted,
  myComputerLocationsReceived,
  myComputerCollectionsFound,
  myComputerScanFinished,
  myComputerScanFailed
} = openCollectionModalSlice.actions;

export default openCollectionModalSlice.reducer;
