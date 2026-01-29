import { createSlice } from '@reduxjs/toolkit';
import { find } from 'lodash';
import toast from 'react-hot-toast';

const initialState = {
  apiSpecs: [],
  activeApiSpecUid: null
};

export const apiSpecSlice = createSlice({
  name: 'apiSpec',
  initialState,
  reducers: {
    apiSpecAddFileEvent: (state, action) => {
      const { name, raw, uid, filename, pathname, json } = action?.payload?.data || {};
      if (!uid) {
        toast.error('Error adding API spec');
      }
      const apiSpec = findApiSpecByUid(state.apiSpecs, uid);
      if (apiSpec) {
        apiSpec.raw = raw;
        apiSpec.name = name;
        apiSpec.filename = filename;
        apiSpec.pathname = pathname;
        apiSpec.json = json;
      } else {
        const newApiSpec = {
          name,
          raw,
          uid,
          filename,
          pathname,
          json
        };
        state.apiSpecs.push(newApiSpec);
      }
      state.activeApiSpecUid = uid;
    },
    apiSpecChangeFileEvent: (state, action) => {
      const { name, raw, uid, filename, pathname, json } = action?.payload?.data || {};
      if (!uid) return;

      const apiSpec = findApiSpecByUid(state.apiSpecs, uid);
      if (apiSpec) {
        apiSpec.raw = raw;
        apiSpec.name = name;
        apiSpec.filename = filename;
        apiSpec.pathname = pathname;
        apiSpec.json = json;
      }
    },
    saveApiSpec: (state, action) => {
      const { content, uid } = action.payload;
      const apiSpec = findApiSpecByUid(state.apiSpecs, uid);
      if (apiSpec) {
        apiSpec.raw = content;
      }
    },
    setActiveApiSpecUid: (state, action) => {
      state.activeApiSpecUid = action.payload.uid;
    },
    removeApiSpec: (state, action) => {
      const { uid } = action.payload;
      let apiSpecIndex = state.apiSpecs.findIndex((c) => c.uid == uid);
      state.apiSpecs = state.apiSpecs.filter((c) => c.uid !== uid);
      let shiftedApiSpec = state.apiSpecs.at(apiSpecIndex);
      let lastApiSpec = state.apiSpecs.at(-1);
      state.activeApiSpecUid = shiftedApiSpec?.uid || lastApiSpec?.uid || null;
    }
  }
});

export const { apiSpecAddFileEvent, apiSpecChangeFileEvent, saveApiSpec, removeApiSpec, setActiveApiSpecUid } = apiSpecSlice.actions;

export default apiSpecSlice.reducer;

const findApiSpecByUid = (apiSpecs, uid) => {
  return find(apiSpecs, (apiSpec) => apiSpec.uid === uid);
};

export const openApiSpec = (workspacePath = null) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    if (!workspacePath) {
      const state = getState();
      const activeWorkspace = state.workspaces.workspaces.find((w) => w.uid === state.workspaces.activeWorkspaceUid);
      workspacePath = activeWorkspace?.pathname || null;
    }

    ipcRenderer.invoke('renderer:open-api-spec', workspacePath).then(resolve).catch(reject);
  });
};

export const saveApiSpecToFile
  = ({ uid, content }) =>
    (dispatch, getState) => {
      return new Promise((resolve, reject) => {
        const { ipcRenderer } = window;
        const state = getState();
        const apiSpec = findApiSpecByUid(state.apiSpec.apiSpecs, uid);
        const { pathname } = apiSpec;
        ipcRenderer
          .invoke('renderer:save-api-spec', pathname, content)
          .then(() => {
            dispatch(saveApiSpec({ content, uid }));
            toast.success('Saved API spec successfully!');
            resolve();
          })
          .catch((reject) => {
            toast.error('Error saving file');
            resolve();
          });
      });
    };

export const createApiSpecFile = (apiSpecName, apiSpecLocation, content, workspacePath = null) => (dispatch, getState) => {
  const { ipcRenderer } = window;

  if (!workspacePath) {
    const state = getState();
    const activeWorkspace = state.workspaces.workspaces.find((w) => w.uid === state.workspaces.activeWorkspaceUid);
    workspacePath = activeWorkspace?.pathname || null;
  }

  return new Promise((resolve, reject) => {
    ipcRenderer.invoke('renderer:create-api-spec', apiSpecName, apiSpecLocation, content, workspacePath).then(resolve).catch(reject);
  });
};

export const closeApiSpecFile
  = ({ uid }) =>
    (dispatch, getState) => {
      return new Promise((resolve, reject) => {
        const state = getState();
        const apiSpec = findApiSpecByUid(state.apiSpec.apiSpecs, uid);
        if (!apiSpec) {
          return reject(new Error('API Spec not found'));
        }
        if (apiSpec) {
          const { ipcRenderer } = window;

          const activeWorkspace = state.workspaces.workspaces.find((w) => w.uid === state.workspaces.activeWorkspaceUid);
          const workspacePath = activeWorkspace?.pathname || null;

          ipcRenderer
            .invoke('renderer:remove-api-spec', apiSpec.pathname, workspacePath)
            .then(async () => {
              dispatch(removeApiSpec({ uid }));

              if (activeWorkspace) {
                const { loadWorkspaceApiSpecs } = require('./workspaces/actions');
                await dispatch(loadWorkspaceApiSpecs(activeWorkspace.uid));
              }

              resolve();
            })
            .catch((error) => reject(error));
        }
        return;
      });
    };
