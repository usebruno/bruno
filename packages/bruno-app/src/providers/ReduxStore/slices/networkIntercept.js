import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Proxy status
  proxyStatus: 'stopped', // 'stopped' | 'starting' | 'running' | 'stopping'
  proxyPort: null,
  proxyError: null,

  // CA certificate info
  caInfo: null,

  // Available browsers
  availableBrowsers: [],
  launchedBrowsers: [],

  // Intercepted requests
  interceptedRequests: [],
  selectedRequestId: null,
  maxRequests: 1000,

  // Filters
  filters: {
    search: '',
    methods: {
      GET: true,
      POST: true,
      PUT: true,
      DELETE: true,
      PATCH: true,
      HEAD: true,
      OPTIONS: true
    },
    statusCodes: {
      '2xx': true,
      '3xx': true,
      '4xx': true,
      '5xx': true
    },
    domains: [] // Empty means all domains
  },

  // UI state
  isPaused: false,
  showTerminalSetup: false,
  terminalCommands: null
};

export const networkInterceptSlice = createSlice({
  name: 'networkIntercept',
  initialState,
  reducers: {
    // Proxy status
    setProxyStatus: (state, action) => {
      state.proxyStatus = action.payload;
    },
    setProxyPort: (state, action) => {
      state.proxyPort = action.payload;
    },
    setProxyError: (state, action) => {
      state.proxyError = action.payload;
    },
    proxyStarted: (state, action) => {
      state.proxyStatus = 'running';
      state.proxyPort = action.payload.port;
      state.proxyError = null;
    },
    proxyStopped: (state) => {
      state.proxyStatus = 'stopped';
      state.proxyPort = null;
      state.proxyError = null;
      state.launchedBrowsers = [];
    },

    // CA info
    setCAInfo: (state, action) => {
      state.caInfo = action.payload;
    },

    // Browsers
    setAvailableBrowsers: (state, action) => {
      state.availableBrowsers = action.payload;
    },
    addLaunchedBrowser: (state, action) => {
      state.launchedBrowsers.push(action.payload);
    },
    removeLaunchedBrowser: (state, action) => {
      state.launchedBrowsers = state.launchedBrowsers.filter(
        (b) => b.id !== action.payload
      );
    },
    setLaunchedBrowsers: (state, action) => {
      state.launchedBrowsers = action.payload;
    },

    // Intercepted requests
    addInterceptedRequest: (state, action) => {
      if (state.isPaused) return;

      const request = action.payload;
      // Check if request already exists (update with response)
      const existingIndex = state.interceptedRequests.findIndex(
        (r) => r.id === request.id
      );

      if (existingIndex !== -1) {
        state.interceptedRequests[existingIndex] = {
          ...state.interceptedRequests[existingIndex],
          ...request
        };
      } else {
        state.interceptedRequests.unshift(request);
        // Trim to max requests
        if (state.interceptedRequests.length > state.maxRequests) {
          state.interceptedRequests = state.interceptedRequests.slice(0, state.maxRequests);
        }
      }
    },
    updateInterceptedRequest: (state, action) => {
      const { id, response } = action.payload;
      const index = state.interceptedRequests.findIndex((r) => r.id === id);
      if (index !== -1) {
        state.interceptedRequests[index] = {
          ...state.interceptedRequests[index],
          response,
          statusCode: response.statusCode,
          statusMessage: response.statusMessage,
          duration: response.duration,
          responseSize: response.size
        };
      }
    },
    clearInterceptedRequests: (state) => {
      state.interceptedRequests = [];
      state.selectedRequestId = null;
    },
    setSelectedRequest: (state, action) => {
      state.selectedRequestId = action.payload;
    },
    clearSelectedRequest: (state) => {
      state.selectedRequestId = null;
    },

    // Filters
    setSearchFilter: (state, action) => {
      state.filters.search = action.payload;
    },
    toggleMethodFilter: (state, action) => {
      const method = action.payload;
      state.filters.methods[method] = !state.filters.methods[method];
    },
    setMethodFilters: (state, action) => {
      state.filters.methods = action.payload;
    },
    toggleStatusCodeFilter: (state, action) => {
      const code = action.payload;
      state.filters.statusCodes[code] = !state.filters.statusCodes[code];
    },
    setStatusCodeFilters: (state, action) => {
      state.filters.statusCodes = action.payload;
    },
    addDomainFilter: (state, action) => {
      if (!state.filters.domains.includes(action.payload)) {
        state.filters.domains.push(action.payload);
      }
    },
    removeDomainFilter: (state, action) => {
      state.filters.domains = state.filters.domains.filter(
        (d) => d !== action.payload
      );
    },
    clearDomainFilters: (state) => {
      state.filters.domains = [];
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },

    // UI state
    togglePause: (state) => {
      state.isPaused = !state.isPaused;
    },
    setPaused: (state, action) => {
      state.isPaused = action.payload;
    },
    setShowTerminalSetup: (state, action) => {
      state.showTerminalSetup = action.payload;
    },
    setTerminalCommands: (state, action) => {
      state.terminalCommands = action.payload;
    }
  }
});

export const {
  setProxyStatus,
  setProxyPort,
  setProxyError,
  proxyStarted,
  proxyStopped,
  setCAInfo,
  setAvailableBrowsers,
  addLaunchedBrowser,
  removeLaunchedBrowser,
  setLaunchedBrowsers,
  addInterceptedRequest,
  updateInterceptedRequest,
  clearInterceptedRequests,
  setSelectedRequest,
  clearSelectedRequest,
  setSearchFilter,
  toggleMethodFilter,
  setMethodFilters,
  toggleStatusCodeFilter,
  setStatusCodeFilters,
  addDomainFilter,
  removeDomainFilter,
  clearDomainFilters,
  resetFilters,
  togglePause,
  setPaused,
  setShowTerminalSetup,
  setTerminalCommands
} = networkInterceptSlice.actions;

// Selectors
export const selectProxyStatus = (state) => state.networkIntercept.proxyStatus;
export const selectProxyPort = (state) => state.networkIntercept.proxyPort;
export const selectIsProxyRunning = (state) => state.networkIntercept.proxyStatus === 'running';
export const selectCAInfo = (state) => state.networkIntercept.caInfo;
export const selectAvailableBrowsers = (state) => state.networkIntercept.availableBrowsers;
export const selectLaunchedBrowsers = (state) => state.networkIntercept.launchedBrowsers;
export const selectInterceptedRequests = (state) => state.networkIntercept.interceptedRequests;
export const selectSelectedRequestId = (state) => state.networkIntercept.selectedRequestId;
export const selectFilters = (state) => state.networkIntercept.filters;
export const selectIsPaused = (state) => state.networkIntercept.isPaused;

// Filtered requests selector
export const selectFilteredRequests = (state) => {
  const { interceptedRequests, filters } = state.networkIntercept;

  return interceptedRequests.filter((request) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const urlMatch = request.url?.toLowerCase().includes(searchLower);
      const hostMatch = request.host?.toLowerCase().includes(searchLower);
      if (!urlMatch && !hostMatch) return false;
    }

    // Method filter
    if (!filters.methods[request.method]) return false;

    // Status code filter (only for completed requests)
    if (request.statusCode) {
      const statusCategory = `${Math.floor(request.statusCode / 100)}xx`;
      if (!filters.statusCodes[statusCategory]) return false;
    }

    // Domain filter
    if (filters.domains.length > 0) {
      if (!filters.domains.includes(request.host)) return false;
    }

    return true;
  });
};

// Selected request selector
export const selectSelectedRequest = (state) => {
  const { interceptedRequests, selectedRequestId } = state.networkIntercept;
  if (!selectedRequestId) return null;
  return interceptedRequests.find((r) => r.id === selectedRequestId);
};

export default networkInterceptSlice.reducer;
