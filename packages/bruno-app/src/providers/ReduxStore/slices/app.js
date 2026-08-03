import { createSlice } from '@reduxjs/toolkit';
import filter from 'lodash/filter';
import brunoClipboard from 'utils/bruno-clipboard';
import { normalizePath } from 'utils/common/path';
import { addTab, focusTab } from './tabs';
import { clearPersistedScope } from 'hooks/usePersistedState/PersistedScopeProvider';
import {
  DEFAULT_SIDEBAR_WIDTH,
  DEFAULT_SIDEBAR_COLLAPSED
} from 'utils/common/constants';
import {
  getLocalStorageValue,
  setLocalStorageValue,
  SIDEBAR_WIDTH_KEY,
  SIDEBAR_COLLAPSED_KEY
} from 'utils/common/localStorage';

const initialState = {
  isDragging: false,
  idbConnectionReady: false,
  snapshotReady: false,
  snapshotHydration: {
    workspaceUid: null,
    pendingCollectionPathnames: [],
    activeCollectionPathname: null,
    startedAt: null
  },
  leftSidebarWidth: null,
  sidebarCollapsed: null,
  showSidebarSearch: false,
  focusedSidebarPath: null,
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
      },
      clientCertificates: {
        certs: []
      }
    },
    font: {
      codeFont: 'default'
    },
    general: {
      defaultLocation: ''
    },
    onboarding: {
      hasLaunchedBefore: false,
      hasSeenWelcomeModal: true,
      lastSeenVersion: null
    },
    autoSave: {
      enabled: false,
      interval: 1000
    },
    cache: {
      sslSession: {
        enabled: false
      }
    },
    ai: {
      enabled: false,
      providers: {
        openai: { enabled: false },
        anthropic: { enabled: false }
      },
      models: {},
      defaultModel: '',
      autocomplete: {
        enabled: true,
        model: '',
        triggerMode: 'debounced'
      },
      security: {
        redactHeaders: true,
        redactBody: true,
        redactVariables: true,
        redactResponse: true,
        customRedactedHeaders: [],
        customRedactedVariables: []
      }
    }
  },
  generateCode: {
    mainLanguage: 'Shell',
    library: 'curl',
    shouldInterpolate: true
  },
  cookies: [],
  taskQueue: [],
  gitOperationProgress: {},
  gitVersion: null,
  clipboard: {
    hasCopiedItems: false // Whether clipboard has Bruno data (for UI)
  },
  systemProxyVariables: {},
  systemProxyLastRefreshedAt: null,
  envVarSearch: {
    collection: {
      variables: { query: '', expanded: false },
      secrets: { query: '', expanded: false }
    },
    global: {
      variables: { query: '', expanded: false },
      secrets: { query: '', expanded: false }
    }
  },
  isCreatingCollection: false,
  isOpeningCollection: false
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    idbConnectionReady: (state) => {
      state.idbConnectionReady = true;
    },
    setSnapshotReady: (state, action) => {
      state.snapshotReady = action.payload;
    },
    setSidebarState: (state, action) => {
      const { width, collapsed } = action.payload || {};
      if (width !== undefined) {
        state.leftSidebarWidth = width;
      }
      if (collapsed !== undefined) {
        state.sidebarCollapsed = collapsed;
      }
      state.sidebarHydrated = true;
    },
    startSnapshotHydrationSession: (state, action) => {
      const {
        workspaceUid = null,
        pendingCollectionPathnames = [],
        activeCollectionPathname = null
      } = action.payload || {};
      const normalizedPathnames = [...new Set(
        pendingCollectionPathnames
          .filter(Boolean)
          .map((pathname) => normalizePath(pathname))
      )];

      state.snapshotHydration = {
        workspaceUid,
        pendingCollectionPathnames: normalizedPathnames,
        activeCollectionPathname: activeCollectionPathname ? normalizePath(activeCollectionPathname) : null,
        startedAt: Date.now()
      };
    },
    markSnapshotCollectionHydrated: (state, action) => {
      const pathname = action.payload?.pathname;
      if (!pathname) {
        return;
      }

      const normalizedPathname = normalizePath(pathname);
      state.snapshotHydration.pendingCollectionPathnames = state.snapshotHydration.pendingCollectionPathnames
        .filter((pendingPathname) => normalizePath(pendingPathname) !== normalizedPathname);
    },
    clearSnapshotHydrationSession: (state) => {
      state.snapshotHydration = {
        workspaceUid: null,
        pendingCollectionPathnames: [],
        activeCollectionPathname: null,
        startedAt: null
      };
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
    updateSystemProxyVariables: (state, action) => {
      state.systemProxyVariables = action.payload;
    },
    updateSystemProxyLastRefreshedAt: (state, action) => {
      state.systemProxyLastRefreshedAt = action.payload;
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
    toggleSidebarSearch: (state) => {
      state.showSidebarSearch = !state.showSidebarSearch;
    },
    setFocusedSidebarPath: (state, action) => {
      state.focusedSidebarPath = action.payload;
    },
    updateGitOperationProgress: (state, action) => {
      const { uid, data } = action.payload;
      if (!state.gitOperationProgress[uid]) {
        state.gitOperationProgress[uid] = { progressData: [] };
      }
      state.gitOperationProgress[uid].progressData.push(data);
    },
    removeGitOperationProgress: (state, action) => {
      delete state.gitOperationProgress[action.payload];
    },
    setGitVersion: (state, action) => {
      state.gitVersion = action.payload;
    },
    setClipboard: (state, action) => {
      // Update clipboard UI state
      state.clipboard.hasCopiedItems = action.payload.hasCopiedItems;
    },
    setEnvVarSearchQuery: (state, { payload: { context, tab = 'variables', query } }) => {
      if (!state.envVarSearch[context]?.[tab]) return;
      state.envVarSearch[context][tab].query = query;
    },
    setEnvVarSearchExpanded: (state, { payload: { context, tab = 'variables', expanded } }) => {
      if (!state.envVarSearch[context]?.[tab]) return;
      state.envVarSearch[context][tab].expanded = expanded;
    },
    setIsCreatingCollection: (state, action) => {
      state.isCreatingCollection = action.payload;
    },
    setIsOpeningCollection: (state, action) => {
      state.isOpeningCollection = action.payload;
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
  setSnapshotReady,
  setSidebarState,
  startSnapshotHydrationSession,
  markSnapshotCollectionHydrated,
  clearSnapshotHydrationSession,
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
  updateSystemProxyVariables,
  updateSystemProxyLastRefreshedAt,
  updateGenerateCode,
  toggleSidebarCollapse,
  toggleSidebarSearch,
  setFocusedSidebarPath,
  updateGitOperationProgress,
  removeGitOperationProgress,
  setGitVersion,
  setClipboard,
  setEnvVarSearchQuery,
  setEnvVarSearchExpanded,
  setIsCreatingCollection,
  setIsOpeningCollection
} = appSlice.actions;

/**
 * NOTE:
 * We generally avoid persisting the same piece of application state in multiple
 * places (snapshot + localStorage) as it increases complexity and can lead to
 * consistency issues.
 *
 * This is an intentional exception. The sidebar renders before the snapshot has
 * finished loading, which can briefly cause an incorrect UI state (visible
 * flicker). localStorage provides an immediate value during startup, while the
 * snapshot remains the canonical persisted state.
 *
 * Ideally, rendering would wait until snapshot hydration completes, but that
 * introduces a noticeable startup delay that we want to avoid.
 */
export const hydrateSidebarState = () => async (dispatch) => {
  if (!window.ipcRenderer) {
    return;
  }
  try {
    const localWidth = getLocalStorageValue(SIDEBAR_WIDTH_KEY, null, (val) => {
      const width = parseInt(val, 10);
      return Number.isFinite(width) ? width : null;
    });
    const localCollapsed = getLocalStorageValue(SIDEBAR_COLLAPSED_KEY, null, (val) => val === 'true');
    const hasLocalWidth = localWidth !== null;
    const hasLocalCollapsed = localCollapsed !== null;
    if (hasLocalWidth && hasLocalCollapsed) {
      dispatch(setSidebarState({
        width: localWidth,
        collapsed: localCollapsed
      }));
    }
    const sidebar = await window.ipcRenderer.invoke('renderer:snapshot:get-sidebar');
    dispatch(setSidebarState({
      width: hasLocalWidth ? localWidth : sidebar?.width ?? DEFAULT_SIDEBAR_WIDTH,
      collapsed: hasLocalCollapsed ? localCollapsed : sidebar?.collapsed ?? DEFAULT_SIDEBAR_COLLAPSED
    }));
    if (!hasLocalWidth) {
      setLocalStorageValue(SIDEBAR_WIDTH_KEY, sidebar?.width ?? DEFAULT_SIDEBAR_WIDTH);
    }
    if (!hasLocalCollapsed) {
      setLocalStorageValue(SIDEBAR_COLLAPSED_KEY, sidebar?.collapsed ?? DEFAULT_SIDEBAR_COLLAPSED);
    }
  } catch (error) {
    console.error('Failed to hydrate snapshot:', error);
  }
};

export const savePreferences = (preferences) => (dispatch, getState) => {
  const previous = getState().app.preferences;
  dispatch(updatePreferences(preferences));

  const { ipcRenderer } = window;
  return ipcRenderer
    .invoke('renderer:save-preferences', preferences)
    .catch((err) => {
      if (getState().app.preferences === preferences) {
        dispatch(updatePreferences(previous));
      }
      throw err;
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
  // Wipe all `persisted::*` keys from localStorage before quitting
  clearPersistedScope();
  return ipcRenderer.invoke('main:complete-quit-flow');
};

export const copyRequest = (item) => (dispatch, getState) => {
  brunoClipboard.write(item);
  dispatch(setClipboard({ hasCopiedItems: true }));
  return Promise.resolve();
};

export const getSystemProxyVariables = () => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('renderer:get-system-proxy-variables')
      .then((variables) => {
        dispatch(updateSystemProxyVariables(variables));
        return variables;
      })
      .then(resolve).catch(reject);
  });
};

export const refreshSystemProxy = () => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('renderer:refresh-system-proxy')
      .then((variables) => {
        dispatch(updateSystemProxyVariables(variables));
        dispatch(updateSystemProxyLastRefreshedAt(Date.now()));
        return variables;
      })
      .then(resolve).catch(reject);
  });
};

export const clearHttpHttpsAgentCache = () => () => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('renderer:clear-http-https-agent-cache').then(resolve).catch(reject);
  });
};

export const refreshPacCache = () => () => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('renderer:refresh-pac-cache').then(resolve).catch(reject);
  });
};

export default appSlice.reducer;
