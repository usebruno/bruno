import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  logs: [],
  debugErrors: [],
  isConsoleOpen: false,
  activeTab: 'console',
  filters: {
    info: true,
    warn: true,
    error: true,
    debug: true,
    log: true
  },
  networkFilters: {
    GET: true,
    POST: true,
    PUT: true,
    DELETE: true,
    PATCH: true,
    HEAD: true,
    OPTIONS: true
  },
  selectedRequest: null,
  selectedError: null,
  maxLogs: 1000,
  maxDebugErrors: 500
};

export const logsSlice = createSlice({
  name: 'logs',
  initialState,
  reducers: {
    addLog: (state, action) => {
      const { type, args, timestamp } = action.payload;
      const newLog = {
        id: Date.now() + Math.random(),
        type: type || 'log',
        message: args ? args.join(' ') : '',
        args: args || [],
        timestamp: timestamp || new Date().toISOString()
      };
      
      state.logs.push(newLog);
      
      if (state.logs.length > state.maxLogs) {
        state.logs = state.logs.slice(-state.maxLogs);
      }
    },
    addDebugError: (state, action) => {
      const { message, stack, filename, lineno, colno, args, timestamp } = action.payload;
      const newError = {
        id: Date.now() + Math.random(),
        message: message || 'Unknown error',
        stack: stack,
        filename: filename,
        lineno: lineno,
        colno: colno,
        args: args || [],
        timestamp: timestamp || new Date().toISOString()
      };
      
      state.debugErrors.push(newError);
      
      if (state.debugErrors.length > state.maxDebugErrors) {
        state.debugErrors = state.debugErrors.slice(-state.maxDebugErrors);
      }
    },
    clearLogs: (state) => {
      state.logs = [];
    },
    clearDebugErrors: (state) => {
      state.debugErrors = [];
    },
    openConsole: (state) => {
      state.isConsoleOpen = true;
    },
    closeConsole: (state) => {
      state.isConsoleOpen = false;
    },
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
      if (action.payload !== 'network') {
        state.selectedRequest = null;
      }
      if (action.payload !== 'debug') {
        state.selectedError = null;
      }
    },
    updateFilter: (state, action) => {
      const { filterType, enabled } = action.payload;
      state.filters[filterType] = enabled;
    },
    toggleAllFilters: (state, action) => {
      const enabled = action.payload;
      Object.keys(state.filters).forEach(key => {
        state.filters[key] = enabled;
      });
    },
    updateNetworkFilter: (state, action) => {
      const { method, enabled } = action.payload;
      state.networkFilters[method] = enabled;
    },
    toggleAllNetworkFilters: (state, action) => {
      const enabled = action.payload;
      Object.keys(state.networkFilters).forEach(key => {
        state.networkFilters[key] = enabled;
      });
    },
    setSelectedRequest: (state, action) => {
      state.selectedRequest = action.payload;
    },
    clearSelectedRequest: (state) => {
      state.selectedRequest = null;
    },
    setSelectedError: (state, action) => {
      state.selectedError = action.payload;
    },
    clearSelectedError: (state) => {
      state.selectedError = null;
    }
  }
});

export const { 
  addLog, 
  addDebugError,
  clearLogs, 
  clearDebugErrors,
  openConsole, 
  closeConsole, 
  setActiveTab,
  updateFilter, 
  toggleAllFilters,
  updateNetworkFilter,
  toggleAllNetworkFilters,
  setSelectedRequest,
  clearSelectedRequest,
  setSelectedError,
  clearSelectedError
} = logsSlice.actions;

export default logsSlice.reducer; 