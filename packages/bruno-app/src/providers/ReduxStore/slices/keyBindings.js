import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  enableShortCuts: true,
  sidebarCollapsed: false,
  showGlobalSearch: false,
  showSideBarSearch: false,
  showImportCollectionModal: false,
  cloneRequestorFolderModal: false,
  showConfirmRequestCloseModal: { show: false },
  newRequestModal: { open: false, collectionUid: null },
  cloneCollectionModal: { open: false, collectionUid: null },
  cloneCollectionItemModal: { open: false, item: null, collectionUid: null }
};

export const keybindingsSlice = createSlice({
  name: 'keybindings',
  initialState,
  reducers: {
    // Global Enable Keyshortcuts
    enableKeyShortCuts: (state) => {
      state.enableShortCuts = !state.enableShortCuts;
    },
    // Global Search
    toggleGlobalSearch: (state) => {
      state.showGlobalSearch = !state.showGlobalSearch;
    },
    // Side Bar Search
    toggleSideSearch: (state) => {
      state.showSideBarSearch = !state.showSideBarSearch;
    },
    // Sidebar
    toggleSidebarCollapse: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    // New Request Modal
    openNewRequestModal: (state, action) => {
      const uid = action.payload?.collectionUid;
      if (uid) {
        state.newRequestModal = { open: true, collectionUid: uid };
      }
    },
    closeNewRequestModal: (state) => {
      state.newRequestModal = { open: false, collectionUid: null };
    },
    // Clone Collection
    openCollectionCloneModal: (state, action) => {
      const uid = action.payload?.collectionUid;
      if (uid) {
        state.cloneCollectionModal = { open: true, collectionUid: uid };
      }
    },
    closeCollectionCloneModal: (state) => {
      state.cloneCollectionModal = { open: false, collectionUid: null };
    },
    // Clone Collection Items - Request/Folder/Examples
    openCollectionCloneItemModal: (state, action) => {
      const uid = action.payload?.collectionUid;
      const item = action.payload?.item;
      if (uid) {
        state.cloneCollectionItemModal = { open: true, item: item, collectionUid: uid };
      }
    },
    closeCollectionCloneItemModal: (state) => {
      state.cloneCollectionItemModal = { open: false, item: null, collectionUid: null };
    },
    // Unsaved Request/Example Modal
    toggleConfirmRequestModal: (state, action) => {
      state.showConfirmRequestCloseModal = { show: action.payload.show };
    },
    // Import Collection Modal
    toggleShowImportCollectionModal: (state, action) => {
      state.showImportCollectionModal = { show: action.payload.show };
    }
  }
});

export const {
  toggleSideSearch,
  enableKeyShortCuts,
  toggleGlobalSearch,
  openNewRequestModal,
  closeNewRequestModal,
  toggleSidebarCollapse,
  openCollectionCloneModal,
  toggleConfirmRequestModal,
  closeCollectionCloneModal,
  openCollectionCloneItemModal,
  closeCollectionCloneItemModal,
  toggleShowImportCollectionModal
} = keybindingsSlice.actions;

export default keybindingsSlice.reducer;
