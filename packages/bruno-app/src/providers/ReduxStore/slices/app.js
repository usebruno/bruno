import { createSlice } from '@reduxjs/toolkit';
import filter from 'lodash/filter';
import brunoClipboard from 'utils/bruno-clipboard';
import { addTab, focusTab, closeTabs } from './tabs';

const initialState = {
  isDragging: false,
  idbConnectionReady: false,
  leftSidebarWidth: 250,
  sidebarCollapsed: false,
  screenWidth: 500,
  showHomePage: false,
  showApiSpecPage: false,
  showManageWorkspacePage: false,
  isEnvironmentSettingsModalOpen: false,
  isGlobalEnvironmentSettingsModalOpen: false,
  activePreferencesTab: 'general',
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
      timeout: 0,
      oauth2: {
        useSystemBrowser: false
      }
    },
    font: {
      codeFont: 'default'
    },
    general: {
      defaultCollectionLocation: ''
    },
    autoSave: {
      enabled: false,
      interval: 1000
    },
    ai: {
      enabled: false
    }
  },
  generateCode: {
    mainLanguage: 'Shell',
    library: 'curl',
    shouldInterpolate: true
  },
  cookies: [],
  taskQueue: [],
  systemProxyEnvVariables: {},
  clipboard: {
    hasCopiedItems: false // Whether clipboard has Bruno data (for UI)
  },
  showAIPanel: false,
  aiPanelContext: null, // { scriptType, currentScript, item, collection }
  aiPanelWidth: 360,
  aiMode: 'ask-before-edit', // 'ask' | 'auto-accept' | 'ask-before-edit'
  responsePaneHiddenByAI: false, // Whether ResponsePane is auto-hidden due to wide AI panel
  forceVerticalLayoutForAI: false, // Force vertical layout when AI panel is open
  // Multi-file AI selection
  multiFileMode: false,
  selectedFilesForAI: [] // Array of { itemUid, collectionUid, name, method, url }
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
      state.showApiSpecPage = false;
      state.showManageWorkspacePage = false;
    },
    hideHomePage: (state) => {
      state.showHomePage = false;
    },
    showManageWorkspacePage: (state) => {
      state.showManageWorkspacePage = true;
      state.showHomePage = false;
      state.showApiSpecPage = false;
    },
    hideManageWorkspacePage: (state) => {
      state.showManageWorkspacePage = false;
    },
    showApiSpecPage: (state) => {
      state.showHomePage = false;
      state.showApiSpecPage = true;
    },
    hideApiSpecPage: (state) => {
      state.showApiSpecPage = false;
    },
    updatePreferences: (state, action) => {
      state.preferences = action.payload;
    },
    updateActivePreferencesTab: (state, action) => {
      state.activePreferencesTab = action.payload.tab;
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
    },
    setClipboard: (state, action) => {
      // Update clipboard UI state
      state.clipboard.hasCopiedItems = action.payload.hasCopiedItems;
    },
    toggleAIPanel: (state) => {
      state.showAIPanel = !state.showAIPanel;
      state.forceVerticalLayoutForAI = state.showAIPanel; // Force vertical when opening
      if (!state.showAIPanel) {
        state.responsePaneHiddenByAI = false; // Restore ResponsePane when AI panel closes
      }
    },
    openAIPanel: (state, action) => {
      state.showAIPanel = true;
      state.aiPanelContext = action.payload;
      state.forceVerticalLayoutForAI = true; // Force vertical layout when AI panel opens
    },
    closeAIPanel: (state) => {
      state.showAIPanel = false;
      state.responsePaneHiddenByAI = false; // Restore ResponsePane when AI panel closes
      state.forceVerticalLayoutForAI = false; // Restore original layout when AI panel closes
    },
    updateAIPanelContext: (state, action) => {
      state.aiPanelContext = action.payload;
    },
    updateAIPanelWidth: (state, action) => {
      state.aiPanelWidth = action.payload;
    },
    setAIMode: (state, action) => {
      state.aiMode = action.payload;
    },
    setResponsePaneHiddenByAI: (state, action) => {
      state.responsePaneHiddenByAI = action.payload;
    },
    // Multi-file AI selection actions
    toggleMultiFileMode: (state) => {
      state.multiFileMode = !state.multiFileMode;
      // Clear selection when toggling off
      if (!state.multiFileMode) {
        state.selectedFilesForAI = [];
      }
    },
    setMultiFileMode: (state, action) => {
      state.multiFileMode = action.payload;
      if (!action.payload) {
        state.selectedFilesForAI = [];
      }
    },
    addFileToAISelection: (state, action) => {
      const { itemUid } = action.payload;
      // Prevent duplicates
      if (!state.selectedFilesForAI.some((f) => f.itemUid === itemUid)) {
        state.selectedFilesForAI.push(action.payload);
      }
    },
    removeFileFromAISelection: (state, action) => {
      const itemUid = action.payload;
      state.selectedFilesForAI = state.selectedFilesForAI.filter((f) => f.itemUid !== itemUid);
    },
    clearAIFileSelection: (state) => {
      state.selectedFilesForAI = [];
    },
    setAIFileSelection: (state, action) => {
      state.selectedFilesForAI = action.payload;
    }
  },
  extraReducers: (builder) => {
    // Automatically hide special pages when any tab is added or focused
    builder
      .addCase(addTab, (state) => {
        state.showHomePage = false;
        state.showApiSpecPage = false;
        state.showManageWorkspacePage = false;
      })
      .addCase(focusTab, (state) => {
        state.showHomePage = false;
        state.showApiSpecPage = false;
        state.showManageWorkspacePage = false;
      });
  }
});

export const {
  idbConnectionReady,
  refreshScreenWidth,
  updateLeftSidebarWidth,
  updateIsDragging,
  showHomePage,
  hideHomePage,
  showManageWorkspacePage,
  hideManageWorkspacePage,
  showApiSpecPage,
  hideApiSpecPage,
  updatePreferences,
  updateActivePreferencesTab,
  updateCookies,
  insertTaskIntoQueue,
  removeTaskFromQueue,
  removeAllTasksFromQueue,
  updateSystemProxyEnvVariables,
  updateGenerateCode,
  toggleSidebarCollapse,
  setClipboard,
  toggleAIPanel,
  openAIPanel,
  closeAIPanel,
  updateAIPanelContext,
  updateAIPanelWidth,
  setAIMode,
  setResponsePaneHiddenByAI,
  // Multi-file AI selection
  toggleMultiFileMode,
  setMultiFileMode,
  addFileToAISelection,
  removeFileFromAISelection,
  clearAIFileSelection,
  setAIFileSelection
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

export const copyRequest = (item) => (dispatch, getState) => {
  brunoClipboard.write(item);
  dispatch(setClipboard({ hasCopiedItems: true }));
  return Promise.resolve();
};

export default appSlice.reducer;
