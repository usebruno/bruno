import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  enableShortCuts: true,
  sidebarCollapsed: false,
  showGlobalSearch: false,
  showSideBarSearch: false,
  showImportCollectionModal: { show: false, importData: null },
  cloneRequestorFolderModal: false,
  cloneCollectionModal: { open: false, collectionUid: null },
  newRequestModal: { open: false, item: null, collectionUid: null },
  cloneCollectionItemModal: { open: false, item: null, collectionUid: null },
  showConfirmCollectionCloseModal: { show: false, item: null, tab: null, collection: null },
  showConfirmEnvironmentClose: { show: false, tab: null, collection: null },
  showConfirmFolderCloseModal: { show: false, item: null, tab: null, collection: null, folder: null },
  showConfirmGlobalEnvironmentClose: { show: false, globalEnvDraft: null, tab: null },
  showConfirmRequestCloseModal: { show: false, entity: null, example: null, item: null, tab: null, collection: null }
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
      const item = action.payload?.item;

      if (uid) {
        state.newRequestModal = { open: true, item: item, collectionUid: uid };
      }
    },
    closeNewRequestModal: (state) => {
      state.newRequestModal = { open: false, item: null, collectionUid: null };
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
    toggleConfirmRequestCloseModal: (state, action) => {
      const { show, entity, example, item, tab, collection } = action.payload;
      state.showConfirmRequestCloseModal = { show, entity, example, item, tab, collection };
    },
    toggleConfirmCollectionCloseModal: (state, action) => {
      const { show, item, tab, collection } = action.payload;
      state.showConfirmCollectionCloseModal = { show, item, tab, collection };
    },
    toggleConfirmFolderCloseModal: (state, action) => {
      const { show, item, tab, collection, folder } = action.payload;
      state.showConfirmFolderCloseModal = { show, item, tab, collection, folder };
    },
    toggleConfirmEnvironmentCloseModal: (state, action) => {
      const { show, tab, collection } = action.payload;
      state.showConfirmEnvironmentClose = { show, tab, collection };
    },
    toggleConfirmGlobalEnvironmentCloseModal: (state, action) => {
      const { show, globalEnvDraft, tab } = action.payload;
      state.showConfirmGlobalEnvironmentClose = { show, globalEnvDraft, tab };
    },
    // Import Collection Modal
    toggleShowImportCollectionModal: (state, action) => {
      const { show, importData } = action.payload;
      state.showImportCollectionModal = { show, importData: importData || null };
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
  closeCollectionCloneModal,
  openCollectionCloneItemModal,
  closeCollectionCloneItemModal,
  toggleConfirmFolderCloseModal,
  toggleConfirmRequestCloseModal,
  toggleShowImportCollectionModal,
  toggleConfirmCollectionCloseModal,
  toggleConfirmEnvironmentCloseModal,
  toggleConfirmGlobalEnvironmentCloseModal
} = keybindingsSlice.actions;

export default keybindingsSlice.reducer;
