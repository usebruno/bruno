import { createSlice } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';
import { setGlobalLocalScriptCommands } from 'utils/collections';

/**
 * Global local scripts (`{{$script:name}}` host commands) are defined once and
 * usable from every collection. The main process owns the registry file
 * (~/.bruno/local-scripts.json); this slice mirrors it for the management
 * page and the codemirror variable layer.
 */
const initialState = {
  commands: []
};

const localScriptsSlice = createSlice({
  name: 'local-scripts',
  initialState,
  reducers: {
    localScriptsUpdated: (state, action) => {
      state.commands = Array.isArray(action.payload?.commands) ? action.payload.commands : [];
    }
  }
});

const syncRegistry = (commands) => {
  setGlobalLocalScriptCommands(Array.isArray(commands) ? commands : []);
};

export const localScriptsLoadedEvent = (payload) => (dispatch) => {
  const commands = Array.isArray(payload?.commands) ? payload.commands : [];
  dispatch(localScriptsSlice.actions.localScriptsUpdated({ commands }));
  syncRegistry(commands);
  if (payload?.error) {
    toast.error(`Could not read local scripts registry: ${payload.error}`);
  }
};

export const loadLocalScripts = () => async (dispatch) => {
  const config = await window.ipcRenderer.invoke('renderer:get-local-scripts');
  dispatch(localScriptsSlice.actions.localScriptsUpdated({ commands: config?.commands || [] }));
  syncRegistry(config?.commands || []);
  return config;
};

export const saveLocalScripts = (commands) => async (dispatch) => {
  const config = await window.ipcRenderer.invoke('renderer:save-local-scripts', {
    config: { commands }
  });
  dispatch(localScriptsSlice.actions.localScriptsUpdated({ commands: config?.commands || [] }));
  syncRegistry(config?.commands || []);
  return config;
};

export default localScriptsSlice.reducer;
