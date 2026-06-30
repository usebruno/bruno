import { createSlice } from '@reduxjs/toolkit';
import { uuid } from 'utils/common/index';
import { environmentSchema } from '@usebruno/schema';
import { getDataTypeFromValue } from '@usebruno/common/utils';
import { cloneDeep } from 'lodash';
import { applyScriptEnvVars, getScriptModifiedKeys } from 'utils/environments';

const initialState = {
  globalEnvironments: [],
  activeGlobalEnvironmentUid: null,
  globalEnvironmentDraft: null,
  _scriptGlobalEnvBaseline: null
};

// Properties prefixed with `_` (e.g. `_scriptGlobalEnvBaseline`) are transient runtime state —
// never persisted to disk or included in exports.
export const globalEnvironmentsSlice = createSlice({
  name: 'global-environments',
  initialState,
  reducers: {
    updateGlobalEnvironments: (state, action) => {
      const newEnvs = action.payload?.globalEnvironments || [];
      const incomingActiveUid = action.payload?.activeGlobalEnvironmentUid ?? null;

      const resolvedActiveUid = incomingActiveUid && newEnvs.some((e) => e?.uid === incomingActiveUid)
        ? incomingActiveUid
        : null;

      state.globalEnvironments = newEnvs;
      state.activeGlobalEnvironmentUid = resolvedActiveUid;
    },
    _addGlobalEnvironment: (state, action) => {
      const { name, uid, variables = [], color } = action.payload;
      if (name?.length) {
        state.globalEnvironments.push({
          uid,
          name,
          variables,
          color
        });
      }
    },
    _saveGlobalEnvironment: (state, action) => {
      const { environmentUid: globalEnvironmentUid, variables } = action.payload;
      if (globalEnvironmentUid) {
        const environment = state.globalEnvironments.find((env) => env?.uid == globalEnvironmentUid);
        if (environment) {
          environment.variables = variables;
        }
      }
    },
    _renameGlobalEnvironment: (state, action) => {
      const { environmentUid: globalEnvironmentUid, name } = action.payload;
      if (globalEnvironmentUid) {
        const environment = state.globalEnvironments.find((env) => env?.uid == globalEnvironmentUid);
        if (environment) {
          environment.name = name;
        }
      }
    },
    _copyGlobalEnvironment: (state, action) => {
      const { name, uid, variables } = action.payload;
      if (name?.length && uid) {
        state.globalEnvironments.push({
          uid,
          name,
          variables
        });
      }
    },
    _selectGlobalEnvironment: (state, action) => {
      const { environmentUid: globalEnvironmentUid } = action.payload;
      if (globalEnvironmentUid) {
        const environment = state.globalEnvironments.find((env) => env?.uid == globalEnvironmentUid);
        if (environment) {
          state.activeGlobalEnvironmentUid = globalEnvironmentUid;
        }
      } else {
        state.activeGlobalEnvironmentUid = null;
      }
    },
    _deleteGlobalEnvironment: (state, action) => {
      const { environmentUid: uid } = action.payload;
      if (uid) {
        state.globalEnvironments = state.globalEnvironments.filter((env) => env?.uid !== uid);
        if (uid === state.activeGlobalEnvironmentUid) {
          state.activeGlobalEnvironmentUid = null;
        }
      }
    },
    setGlobalEnvironmentDraft: (state, action) => {
      const { environmentUid, variables } = action.payload;
      state.globalEnvironmentDraft = { environmentUid, variables };
    },
    clearGlobalEnvironmentDraft: (state) => {
      state.globalEnvironmentDraft = null;
    },
    _setScriptGlobalEnvBaseline: (state, action) => {
      state._scriptGlobalEnvBaseline = action.payload;
    },
    _clearScriptGlobalEnvBaseline: (state) => {
      state._scriptGlobalEnvBaseline = null;
    },
    _updateGlobalEnvironmentColor: (state, action) => {
      const { environmentUid, color } = action.payload;
      if (environmentUid) {
        state.globalEnvironments = state.globalEnvironments.map((env) => env?.uid == environmentUid ? { ...env, color } : env);
      }
    }
  }
});

export const {
  updateGlobalEnvironments,
  _addGlobalEnvironment,
  _saveGlobalEnvironment,
  _renameGlobalEnvironment,
  _copyGlobalEnvironment,
  _selectGlobalEnvironment,
  _deleteGlobalEnvironment,
  _updateGlobalEnvironmentColor,
  setGlobalEnvironmentDraft,
  clearGlobalEnvironmentDraft,
  _setScriptGlobalEnvBaseline,
  _clearScriptGlobalEnvBaseline
} = globalEnvironmentsSlice.actions;

const getWorkspaceContext = (state) => {
  const workspaceUid = state.workspaces?.activeWorkspaceUid;
  const workspace = state.workspaces?.workspaces?.find((w) => w.uid === workspaceUid);
  return { workspaceUid, workspacePath: workspace?.pathname };
};

export const addGlobalEnvironment = ({ name, variables = [], color }) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const uid = uuid();
    const environment = { name, uid, variables };
    const { ipcRenderer } = window;
    const state = getState();
    const { workspaceUid, workspacePath } = getWorkspaceContext(state);

    environmentSchema
      .validate(environment)
      .then(() => ipcRenderer.invoke('renderer:create-global-environment', { name, uid, variables, color, workspaceUid, workspacePath }))
      .then((result) => {
        const finalUid = result?.uid || uid;
        const finalName = result?.name || name;
        const finalVariables = result?.variables || variables;
        const finalColor = result?.color || color;
        dispatch(_addGlobalEnvironment({ name: finalName, uid: finalUid, variables: finalVariables, color: finalColor }));
        return finalUid;
      })
      .then((finalUid) => dispatch(selectGlobalEnvironment({ environmentUid: finalUid })))
      .then(resolve)
      .catch(reject);
  });
};

export const copyGlobalEnvironment = ({ name, environmentUid: baseEnvUid }) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const state = getState();
    const { workspaceUid, workspacePath } = getWorkspaceContext(state);
    const globalEnvironments = state.globalEnvironments.globalEnvironments;
    const baseEnv = globalEnvironments?.find((env) => env?.uid == baseEnvUid);
    if (!baseEnv) {
      return reject(new Error('Base environment not found'));
    }
    const uid = uuid();
    const environment = { uid, name, variables: baseEnv.variables };
    const { ipcRenderer } = window;

    environmentSchema
      .validate(environment)
      .then(() => ipcRenderer.invoke('renderer:create-global-environment', { uid, name, variables: baseEnv.variables, workspaceUid, workspacePath }))
      .then((result) => {
        const finalUid = result?.uid || uid;
        const finalName = result?.name || name;
        const finalVariables = result?.variables || baseEnv.variables;
        dispatch(_copyGlobalEnvironment({ name: finalName, uid: finalUid, variables: finalVariables }));
      })
      .then(resolve)
      .catch(reject);
  });
};

export const renameGlobalEnvironment = ({ name: newName, environmentUid }) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    const state = getState();
    const { workspaceUid, workspacePath } = getWorkspaceContext(state);
    const globalEnvironments = state.globalEnvironments.globalEnvironments;
    const environment = globalEnvironments?.find((env) => env?.uid == environmentUid);
    if (!environment) {
      return reject(new Error('Environment not found'));
    }
    environmentSchema
      .validate(environment)
      .then(() => ipcRenderer.invoke('renderer:rename-global-environment', { name: newName, environmentUid, workspaceUid, workspacePath }))
      .then((result) => {
        const resolvedUid = result?.uid || environmentUid;
        dispatch(_renameGlobalEnvironment({ name: newName, environmentUid: resolvedUid }));
        return ipcRenderer
          .invoke('renderer:get-global-environments', { workspaceUid, workspacePath })
          .then((data) => {
            dispatch(updateGlobalEnvironments(data));
            if (resolvedUid !== environmentUid) {
              const currentState = getState();
              const draft = currentState.globalEnvironments.globalEnvironmentDraft;
              if (draft?.environmentUid === environmentUid) {
                dispatch(setGlobalEnvironmentDraft({ environmentUid: resolvedUid, variables: draft.variables }));
              }
            }
            return resolvedUid;
          });
      })
      .then((resolvedUid) => dispatch(_selectGlobalEnvironment({ environmentUid: resolvedUid })))
      .then(resolve)
      .catch(reject);
  });
};

export const saveGlobalEnvironment = ({ variables, environmentUid }) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const state = getState();
    const { workspaceUid, workspacePath } = getWorkspaceContext(state);
    const globalEnvironments = state.globalEnvironments.globalEnvironments;
    let environment = globalEnvironments?.find((env) => env?.uid == environmentUid);
    if (!environment) {
      const activeUid = state.globalEnvironments?.activeGlobalEnvironmentUid;
      const activeEnv = globalEnvironments?.find((env) => env?.uid == activeUid);
      if (activeEnv) {
        environment = activeEnv;
        environmentUid = activeEnv.uid;
      }
    }

    if (!environment) {
      return reject(new Error('Environment not found'));
    }

    const environmentToSave = { ...environment, variables };
    const { ipcRenderer } = window;

    environmentSchema
      .validate(environmentToSave)
      .then(() => ipcRenderer.invoke('renderer:save-global-environment', {
        environmentUid,
        variables,
        color: environment.color,
        workspaceUid,
        workspacePath
      }))
      .then(() => dispatch(_saveGlobalEnvironment({ environmentUid, variables })))
      .then(resolve)
      .catch(reject);
  });
};

export const selectGlobalEnvironment = ({ environmentUid }) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    const state = getState();
    const { workspaceUid, workspacePath } = getWorkspaceContext(state);

    ipcRenderer
      .invoke('renderer:select-global-environment', { environmentUid, workspaceUid, workspacePath })
      .then(() => dispatch(_selectGlobalEnvironment({ environmentUid })))
      .then(resolve)
      .catch(reject);
  });
};

export const deleteGlobalEnvironment = ({ environmentUid }) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    const state = getState();
    const { workspaceUid, workspacePath } = getWorkspaceContext(state);

    ipcRenderer
      .invoke('renderer:delete-global-environment', { environmentUid, workspaceUid, workspacePath })
      .then(() => dispatch(_deleteGlobalEnvironment({ environmentUid })))
      .then(resolve)
      .catch(reject);
  });
};

export const globalEnvironmentsUpdateEvent = ({ globalEnvironmentVariables, collectionUid, requestUid }) => (dispatch, getState) => {
  if (!globalEnvironmentVariables) return;

  const state = getState();

  // Ignore stale updates from superseded requests on the originating collection.
  if (collectionUid && requestUid) {
    const sourceCollection = state?.collections?.collections?.find((c) => c.uid === collectionUid);
    if (sourceCollection?._scriptRequestUid && requestUid !== sourceCollection._scriptRequestUid) {
      return;
    }
  }

  const globalEnvironments = state?.globalEnvironments?.globalEnvironments || [];
  const environmentUid = state?.globalEnvironments?.activeGlobalEnvironmentUid;
  const environment = globalEnvironments?.find((env) => env?.uid == environmentUid);

  if (!environment || !environmentUid) return;

  const draft = state?.globalEnvironments?.globalEnvironmentDraft;
  if (draft && draft.environmentUid === environmentUid && draft.variables) {
    const baseline = {};
    environment.variables?.forEach((v) => {
      if (v.enabled) baseline[v.name] = v.value;
    });
    dispatch(_setScriptGlobalEnvBaseline(baseline));

    dispatch(_saveGlobalEnvironment({ environmentUid, variables: draft.variables }));
    dispatch(clearGlobalEnvironmentDraft());
  }

  const updatedState = getState();
  const updatedEnv = updatedState?.globalEnvironments?.globalEnvironments?.find((env) => env?.uid == environmentUid);
  const baseline = updatedState?.globalEnvironments?._scriptGlobalEnvBaseline;
  let variables = cloneDeep(updatedEnv?.variables || []);

  variables = applyScriptEnvVars(variables, globalEnvironmentVariables, baseline, { skipKeys: ['__name__'] });

  // Re-infer dataType only for vars the script actually modified — preserves draft-only type edits
  // when a script does a structurally-equal no-op write.
  const modifiedKeys = getScriptModifiedKeys(globalEnvironmentVariables, baseline, { skipKeys: ['__name__'] });
  variables.forEach((v) => {
    if (!modifiedKeys.has(v.name)) return;
    const inferred = getDataTypeFromValue(globalEnvironmentVariables[v.name]);
    if (inferred === 'string') {
      delete v.dataType;
    } else {
      v.dataType = inferred;
    }
  });

  dispatch(_saveGlobalEnvironment({ environmentUid, variables }));

  const { ipcRenderer } = window;
  const { workspaceUid, workspacePath } = getWorkspaceContext(state);
  environmentSchema
    .validate({ ...environment, variables })
    .then(() => ipcRenderer.invoke('renderer:save-global-environment', {
      environmentUid,
      variables,
      color: environment.color,
      workspaceUid,
      workspacePath
    }))
    .catch((err) => console.error('Failed to persist global environment:', err));
};

export const updateGlobalEnvironmentColor = (environmentUid, color) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    const state = getState();
    const { workspaceUid, workspacePath } = getWorkspaceContext(state);
    ipcRenderer.invoke('renderer:update-global-environment-color', { environmentUid, color, workspaceUid, workspacePath })
      .then(() => dispatch(_updateGlobalEnvironmentColor({ environmentUid, color })))
      .then(resolve)
      .catch(reject);
  });
};

export default globalEnvironmentsSlice.reducer;
