import { createSlice } from '@reduxjs/toolkit';
import filter from 'lodash/filter';
import toast from 'react-hot-toast';

const initialState = {
  isDragging: false,
  idbConnectionReady: false,
  leftSidebarWidth: 222,
  topBarHeight: 154,
  screenWidth: 500,
  showHomePage: false,
  showPreferences: false,
  isEnvironmentSettingsModalOpen: false,
  preferences: {
    request: {
      sslVerification: true,
      customCaCertificate: {
        enabled: false,
        filePath: null
      },
      keepDefaultCaCertificates: {
        enabled: false
      },
      timeout: 0
    },
    font: {
      codeFont: 'default'
    },
    userInterface: {
      responsePaneDockedToBottom: false
    }
  },
  cookies: [],
  taskQueue: []
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    idbConnectionReady: (state) => {
      state.idbConnectionReady = true;
    },
    refreshScreenWidthAndHeight: (state) => {
      state.screenWidth = window.innerWidth;
      state.screenHeight = window.innerHeight;
    },
    updateLeftSidebarWidth: (state, action) => {
      state.leftSidebarWidth = action.payload.leftSidebarWidth;
    },
    updateIsDragging: (state, action) => {
      state.isDragging = action.payload.isDragging;
    },
    updateEnvironmentSettingsModalVisibility: (state, action) => {
      state.isEnvironmentSettingsModalOpen = action.payload;
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
    insertTaskIntoQueue: (state, action) => {
      state.taskQueue.push(action.payload);
    },
    removeTaskFromQueue: (state, action) => {
      state.taskQueue = filter(state.taskQueue, (task) => task.uid !== action.payload.taskUid);
    },
    removeAllTasksFromQueue: (state) => {
      state.taskQueue = [];
    }
  }
});

export const {
  idbConnectionReady,
  refreshScreenWidthAndHeight,
  updateLeftSidebarWidth,
  updateIsDragging,
  updateEnvironmentSettingsModalVisibility,
  showHomePage,
  hideHomePage,
  showPreferences,
  updatePreferences,
  updateCookies,
  insertTaskIntoQueue,
  removeTaskFromQueue,
  removeAllTasksFromQueue
} = appSlice.actions;

export const savePreferences = (preferences, displaySuccessToast) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    ipcRenderer
      .invoke('renderer:save-preferences', preferences)
      .then(() => {
        const shouldDisplaySuccessToast = _.isUndefined(displaySuccessToast) || displaySuccessToast;

        if (shouldDisplaySuccessToast) {
          toast.success('Preferences saved successfully');
        }
      })
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

export const completeQuitFlow = () => (dispatch, getState) => {
  const { ipcRenderer } = window;
  return ipcRenderer.invoke('main:complete-quit-flow');
};

export default appSlice.reducer;
