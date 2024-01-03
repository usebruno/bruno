import { createSlice } from '@reduxjs/toolkit';
import filter from 'lodash/filter';
import find from 'lodash/find';
import last from 'lodash/last';
import { removeAllEventsFromQueue } from 'providers/ReduxStore/slices/app';
import { deleteRequestDraft } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { eventTypes } from 'utils/events-queue/index';

// todo: errors should be tracked in each slice and displayed as toasts

const initialState = {
  tabs: [],
  activeTabUid: null
};

const tabTypeAlreadyExists = (tabs, collectionUid, type) => {
  return find(tabs, (tab) => tab.collectionUid === collectionUid && tab.type === type);
};

export const tabsSlice = createSlice({
  name: 'tabs',
  initialState,
  reducers: {
    addTab: (state, action) => {
      const alreadyExists = find(state.tabs, (tab) => tab.uid === action.payload.uid);
      if (alreadyExists) {
        return;
      }

      if (['variables', 'collection-settings', 'collection-runner'].includes(action.payload.type)) {
        const tab = tabTypeAlreadyExists(state.tabs, action.payload.collectionUid, action.payload.type);
        if (tab) {
          state.activeTabUid = tab.uid;
          return;
        }
      }

      state.tabs.push({
        uid: action.payload.uid,
        collectionUid: action.payload.collectionUid,
        requestPaneWidth: null,
        requestPaneTab: action.payload.requestPaneTab || 'params',
        responsePaneTab: 'response',
        type: action.payload.type || 'request'
      });
      state.activeTabUid = action.payload.uid;
    },
    focusTab: (state, action) => {
      state.activeTabUid = action.payload.uid;
    },
    updateRequestPaneTabWidth: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid === action.payload.uid);

      if (tab) {
        tab.requestPaneWidth = action.payload.requestPaneWidth;
      }
    },
    updateRequestPaneTab: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid === action.payload.uid);

      if (tab) {
        tab.requestPaneTab = action.payload.requestPaneTab;
      }
    },
    updateResponsePaneTab: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid === action.payload.uid);

      if (tab) {
        tab.responsePaneTab = action.payload.responsePaneTab;
      }
    },
    closeTabs: (state, action) => {
      const activeTab = find(state.tabs, (t) => t.uid === state.activeTabUid);
      const tabUids = action.payload.tabUids || [];

      // remove the tabs from the state
      state.tabs = filter(state.tabs, (t) => !tabUids.includes(t.uid));

      if (activeTab && state.tabs.length) {
        const { collectionUid } = activeTab;
        const activeTabStillExists = find(state.tabs, (t) => t.uid === state.activeTabUid);

        // if the active tab no longer exists, set the active tab to the last tab in the list
        // this implies that the active tab was closed
        if (!activeTabStillExists) {
          // load sibling tabs of the current collection
          const siblingTabs = filter(state.tabs, (t) => t.collectionUid === collectionUid);

          // if there are sibling tabs, set the active tab to the last sibling tab
          // otherwise, set the active tab to the last tab in the list
          if (siblingTabs && siblingTabs.length) {
            state.activeTabUid = last(siblingTabs).uid;
          } else {
            state.activeTabUid = last(state.tabs).uid;
          }
        }
      }

      if (!state.tabs || !state.tabs.length) {
        state.activeTabUid = null;
      }
    },
    closeAllCollectionTabs: (state, action) => {
      const collectionUid = action.payload.collectionUid;
      state.tabs = filter(state.tabs, (t) => t.collectionUid !== collectionUid);
      state.activeTabUid = null;
    },
    setShowConfirmClose: (state, action) => {
      const { tabUid, showConfirmClose } = action.payload;
      const tab = find(state.tabs, (t) => t.uid === tabUid);
      if (tab) tab.showConfirmClose = showConfirmClose;
    }
  }
});

export const {
  addTab,
  focusTab,
  updateRequestPaneTabWidth,
  updateRequestPaneTab,
  updateResponsePaneTab,
  closeTabs,
  closeAllCollectionTabs,
  setShowConfirmClose
} = tabsSlice.actions;

export const closeAndSaveDraft = (itemUid, collectionUid) => (dispatch) => {
  dispatch(saveRequest(itemUid, collectionUid)).then(() => {
    dispatch(
      closeTabs({
        tabUids: [itemUid]
      })
    );
    dispatch(setShowConfirmClose({ tabUid: itemUid, showConfirmClose: false }));
  });
};

export const closeWithoutSavingDraft = (itemUid, collectionUid) => (dispatch) => {
  dispatch(
    deleteRequestDraft({
      itemUid: itemUid,
      collectionUid: collectionUid
    })
  );
  dispatch(
    closeTabs({
      tabUids: [itemUid]
    })
  );
  dispatch(setShowConfirmClose({ tabUid: itemUid, showConfirmClose: false }));
};

export const cancelCloseDraft = (itemUid) => (dispatch, getState) => {
  const state = getState();
  dispatch(setShowConfirmClose({ tabUid: itemUid, showConfirmClose: false }));
  const { eventsQueue } = state.app;
  const [firstEvent] = eventsQueue;
  if (firstEvent && firstEvent.eventType === eventTypes.CLOSE_REQUEST && firstEvent.itemUid === itemUid) {
    dispatch(removeAllEventsFromQueue());
  }
};

export default tabsSlice.reducer;
