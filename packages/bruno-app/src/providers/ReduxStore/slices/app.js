import { createSlice } from '@reduxjs/toolkit';
import filter from 'lodash/filter';
import groupBy from 'lodash/groupBy';
import toast from 'react-hot-toast';
import { isItemARequest } from 'utils/collections';
import { findCollectionByUid, flattenItems } from 'utils/collections/index';
import { uuid } from 'utils/common';

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
        (event) => !eventsToRemove.some((e) => e.eventUid === event.eventUid)
      );
    },
    removeAllEventsFromQueue: (state) => {
      state.eventsQueue = [];
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
  removeEventsFromQueue,
  removeAllEventsFromQueue
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
  const { tabs } = state.tabs;

  const tabsByCollection = groupBy(tabs, (t) => t.collectionUid);
  Object.keys(tabsByCollection).forEach((collectionUid) => {
    const collectionItems = flattenItems(findCollectionByUid(collections, collectionUid).items);
    let openedTabs = tabsByCollection[collectionUid];
    for (const item of collectionItems) {
      if (isItemARequest(item) && item.draft) {
        openedTabs = filter(openedTabs, (t) => t.uid !== item.uid);
        currentDrafts.push({ ...item, collectionUid });
      }
      if (!openedTabs.length) return;
    }
  });

  if (currentDrafts.length === 0) {
    return dispatch(completeQuitFlow());
  }

  const events = currentDrafts
    .reduce((acc, draft) => {
      const { uid, pathname, collectionUid } = draft;
      const defaultProperties = { itemUid: uid, collectionUid, itemPathname: pathname };
      acc.push(
        ...[
          { eventUid: uuid(), eventType: 'OPEN_REQUEST', ...defaultProperties },
          { eventUid: uuid(), eventType: 'CLOSE_REQUEST', ...defaultProperties }
        ]
      );
      return acc;
    }, [])
    .concat([{ eventUid: uuid(), eventType: 'CLOSE_APP' }]);

  dispatch(insertEventsIntoQueue(events));
};

export const completeQuitFlow = () => (dispatch, getState) => {
  const { ipcRenderer } = window;
  return ipcRenderer.invoke('main:complete-quit-flow');
};

export default appSlice.reducer;
