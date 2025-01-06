import { createSlice } from '@reduxjs/toolkit';
import { stringifyIfNot, uuid } from 'utils/common/index';
import { environmentSchema } from '@usebruno/schema';
import { cloneDeep } from 'lodash';

const initialState = {
  globalEnvironments: [],
  activeGlobalEnvironmentUid: null
};

export const globalEnvironmentsSlice = createSlice({
  name: 'global-environments',
  initialState,
  reducers: {
    updateGlobalEnvironments: (state, action) => {
      state.globalEnvironments = action.payload?.globalEnvironments;
      state.activeGlobalEnvironmentUid = action.payload?.activeGlobalEnvironmentUid;
    },
    _addGlobalEnvironment: (state, action) => {
      const { name, uid, variables = [] } = action.payload;
      if (name?.length) {
        state.globalEnvironments.push({
          uid,
          name,
          variables
        });
      }
    },
    _saveGlobalEnvironment: (state, action) => {
      const { environmentUid: globalEnvironmentUid, variables } = action.payload;
      if (globalEnvironmentUid) {
        const environment = state.globalEnvironments.find(env => env?.uid == globalEnvironmentUid);
        if (environment) {
          environment.variables = variables;
        }
      }
    },
    _renameGlobalEnvironment: (state, action) => {
      const { environmentUid: globalEnvironmentUid, name } = action.payload;
      if (globalEnvironmentUid) {
        const environment = state.globalEnvironments.find(env => env?.uid == globalEnvironmentUid);
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
        const environment = state.globalEnvironments.find(env => env?.uid == globalEnvironmentUid);
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
        state.globalEnvironments = state.globalEnvironments.filter(env => env?.uid !== uid);
        if (uid === state.activeGlobalEnvironmentUid) {
          state.activeGlobalEnvironmentUid = null;
        }
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
  _deleteGlobalEnvironment
} = globalEnvironmentsSlice.actions;

export const addGlobalEnvironment = ({ name, variables = [] }) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const uid = uuid();
    ipcRenderer
      .invoke('renderer:create-global-environment', { name, uid, variables })
      .then(() => dispatch(_addGlobalEnvironment({ name, uid, variables })))
      .then(resolve)
      .catch(reject);
  });
};

export const copyGlobalEnvironment = ({ name, environmentUid: baseEnvUid }) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const state = getState();
    const globalEnvironments = state.globalEnvironments.globalEnvironments;
    const baseEnv = globalEnvironments?.find(env => env?.uid == baseEnvUid)
    const uid = uuid();
    ipcRenderer
      .invoke('renderer:create-global-environment', { uid, name, variables: baseEnv.variables })
      .then(() => dispatch(_copyGlobalEnvironment({ name, uid, variables: baseEnv.variables })))
      .then(resolve)
      .catch(reject);
  });
};

export const renameGlobalEnvironment = ({ name: newName, environmentUid }) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const state = getState();
    const globalEnvironments = state.globalEnvironments.globalEnvironments;
    const environment = globalEnvironments?.find(env => env?.uid == environmentUid)
    if (!environment) {
      return reject(new Error('Environment not found'));
    }
    environmentSchema
      .validate(environment)
      .then(() => ipcRenderer.invoke('renderer:rename-global-environment', { name: newName, environmentUid }))
      .then(() => dispatch(_renameGlobalEnvironment({ name: newName, environmentUid })))
      .then(resolve)
      .catch(reject);
  });
};

export const saveGlobalEnvironment = ({ variables, environmentUid }) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const state = getState();
    const globalEnvironments = state.globalEnvironments.globalEnvironments;
    const environment = globalEnvironments?.find(env => env?.uid == environmentUid);

    if (!environment) {
      return reject(new Error('Environment not found'));
    }

    environmentSchema
      .validate(environment)
      .then(() => ipcRenderer.invoke('renderer:save-global-environment', {
        environmentUid,
        variables
      }))
      .then(() => dispatch(_saveGlobalEnvironment({ environmentUid, variables })))
      .then(resolve)
      .catch((error) => {
        reject(error);
      });
  });
};

export const selectGlobalEnvironment = ({ environmentUid }) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('renderer:select-global-environment', { environmentUid })
      .then(() => dispatch(_selectGlobalEnvironment({ environmentUid })))
      .then(resolve)
      .catch(reject);
  });
};

export const deleteGlobalEnvironment = ({ environmentUid }) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('renderer:delete-global-environment', { environmentUid })
      .then(() => dispatch(_deleteGlobalEnvironment({ environmentUid })))
      .then(resolve)
      .catch(reject);
  });
};

export const globalEnvironmentsUpdateEvent = ({ globalEnvironmentVariables }) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    if (!globalEnvironmentVariables) resolve();

    const state = getState();
    const globalEnvironments = state?.globalEnvironments?.globalEnvironments || [];
    const environmentUid = state?.globalEnvironments?.activeGlobalEnvironmentUid;
    const environment = globalEnvironments?.find(env => env?.uid == environmentUid);

    if (!environment || !environmentUid) {
      return resolve();
    }

    let variables = cloneDeep(environment?.variables);

    // update existing values
    variables = variables?.map?.(variable => ({
      ...variable,
      value: globalEnvironmentVariables?.[variable?.name]
    }));

    // add new env values
    Object.entries(globalEnvironmentVariables)?.forEach?.(([key, value]) => {
      let isAnExistingVariable = variables?.find(v => v?.name == key)
      if (!isAnExistingVariable) {
        variables.push({
          uid: uuid(),
          name: key,
          value,
          type: 'text',
          secret: false,
          enabled: true
        });
      }
    });

    environmentSchema
      .validate(environment)
      .then(() => ipcRenderer.invoke('renderer:save-global-environment', {
        environmentUid,
        variables
      }))
      .then(() => dispatch(_saveGlobalEnvironment({ environmentUid, variables })))
      .then(resolve)
      .catch((error) => {
        reject(error);
      });
  });
}


export default globalEnvironmentsSlice.reducer;