import { createSlice } from '@reduxjs/toolkit';
import filter from 'lodash/filter';

const initialState = {
  isDragging: false,
  idbConnectionReady: false,
  leftSidebarWidth: 222,
  sidebarCollapsed: false,
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
        enabled: true
      },
      timeout: 0
    },
    font: {
      codeFont: 'default'
    },
    general: {
      defaultCollectionLocation: ''
    },
    beta: {
      grpc: false,
      websocket: false,
    }
  },
  generateCode: {
    mainLanguage: 'Shell',
    library: 'curl',
    shouldInterpolate: true
  },
  cookies: [],
  taskQueue: [],
  systemProxyEnvVariables: {}
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
    },
    updateSystemProxyEnvVariables: (state, action) => {
      state.systemProxyEnvVariables = action.payload;
    },
    updateGenerateCode: (state, action) => {
      state.generateCode = {
        ...state.generateCode,
        ...action.payload
      };
    },
    toggleSidebarCollapse: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    }
  }
});

export const {
  idbConnectionReady,
  refreshScreenWidth,
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
  removeAllTasksFromQueue,
  updateSystemProxyEnvVariables,
  updateGenerateCode,
  toggleSidebarCollapse
} = appSlice.actions;

export const savePreferences = (preferences) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    ipcRenderer
      .invoke('renderer:save-preferences', preferences)
      .then(() => dispatch(updatePreferences(preferences)))
      .then(resolve)
      .catch(reject);
  });
};

export const deleteCookiesForDomain = (domain) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    ipcRenderer.invoke('renderer:delete-cookies-for-domain', domain).then(resolve).catch(reject);
  });
};

export const deleteCookie = (domain, path, cookieKey) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    ipcRenderer.invoke('renderer:delete-cookie', domain, path, cookieKey).then(resolve).catch(reject);
  });
};

export const addCookie = (domain, cookie) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    ipcRenderer.invoke('renderer:add-cookie', domain, cookie).then(resolve).catch(reject);
  });
};

export const modifyCookie = (domain, oldCookie, cookie) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    ipcRenderer.invoke('renderer:modify-cookie', domain, oldCookie, cookie).then(resolve).catch(reject);
  });
};

export const getParsedCookie = (cookieStr) => () => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('renderer:get-parsed-cookie', cookieStr).then(resolve).catch(reject);
  });
};

export const createCookieString = (cookieObj) => () => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('renderer:create-cookie-string', cookieObj).then(resolve).catch(reject);
  });
};

export const completeQuitFlow = () => (dispatch, getState) => {
  const { ipcRenderer } = window;
  return ipcRenderer.invoke('main:complete-quit-flow');
};

export default appSlice.reducer;
