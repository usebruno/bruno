import { createSlice } from '@reduxjs/toolkit';
import filter from 'lodash/filter';
import { updateNextAction } from 'providers/ReduxStore/slices/collections/index';
import toast from 'react-hot-toast';
import { isItemAFolder, isItemARequest } from 'utils/collections';

const initialState = {
  isDragging: false,
  idbConnectionReady: false,
  leftSidebarWidth: 222,
  screenWidth: 500,
  showHomePage: false,
  showPreferences: false,
  preferences: {
    request: {
      sslVerification: true,
      timeout: 0
    },
    font: {
      codeFont: 'default'
    }
  },
  cookies: [],
  eventsQueue: []
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    idbConnectionReady: (state) => {
      state.idbConnectionReady = true;
    },
    refreshScreenWidth: (state) => {
      state.screenWidth = window.innerWidth;
    },
    updateLeftSidebarWidth: (state, action) => {
      state.leftSidebarWidth = action.payload.leftSidebarWidth;
    },
    updateIsDragging: (state, action) => {
      state.isDragging = action.payload.isDragging;
    },
    showHomePage: (state) => {
      state.showHomePage = true;
    },
    hideHomePage: (state) => {
      state.showHomePage = false;
    },
    showPreferences: (state, action) => {
      state.showPreferences = action.payload;
    },
    updatePreferences: (state, action) => {
      state.preferences = action.payload;
    },
    updateCookies: (state, action) => {
      state.cookies = action.payload;
    },
    insertEventsIntoQueue: (state, action) => {
      state.eventsQueue = state.eventsQueue.concat(action.payload);
    },
    removeEventsFromQueue: (state, action) => {
      const eventsToRemove = action.payload;
      state.eventsQueue = filter(
        state.eventsQueue,
        (event) => !eventsToRemove.some((e) => e.itemUid === event.itemUid && e.type === event.type)
      );
    }
  }
});

export const {
  idbConnectionReady,
  refreshScreenWidth,
  updateLeftSidebarWidth,
  updateIsDragging,
  showHomePage,
  hideHomePage,
  showPreferences,
  updatePreferences,
  updateCookies,
  insertEventsIntoQueue,
  removeEventsFromQueue
} = appSlice.actions;

export const savePreferences = (preferences) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    ipcRenderer
      .invoke('renderer:save-preferences', preferences)
      .then(() => toast.success('Preferences saved successfully'))
      .then(() => dispatch(updatePreferences(preferences)))
      .then(resolve)
      .catch((err) => {
        toast.error('An error occurred while saving preferences');
        console.error(err);
        reject(err);
      });
  });
};

export const deleteCookiesForDomain = (domain) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    ipcRenderer.invoke('renderer:delete-cookies-for-domain', domain).then(resolve).catch(reject);
  });
};

export const startQuitFlow = () => (dispatch, getState) => {
  const state = getState();
  console.log(state);

  const currentDrafts = [];
  const { collections } = state.collections;

  const getAllDraftsFromItems = (collectionUid, currentLevel) => {
    for (const item of currentLevel.items) {
      if (isItemARequest(item) && item.draft) {
        currentDrafts.push({ collectionUid, pathname: item.pathname });
      } else if (isItemAFolder(item)) {
        getAllDraftsFromItems(collectionUid, item);
      }
    }
  };
  collections.forEach((collection) => getAllDraftsFromItems(collection.uid, collection));

  if (currentDrafts.length === 0) {
    const { ipcRenderer } = window;
    return ipcRenderer.invoke('main:complete-quit-flow');
  }

  const [draft] = currentDrafts;
  if (draft) {
    dispatch(
      updateNextAction({
        nextAction: {
          type: 'OPEN_REQUEST',
          payload: {
            pathname: draft.pathname
          }
        },
        collectionUid: draft.collectionUid
      })
    );
  }
};

export default appSlice.reducer;
