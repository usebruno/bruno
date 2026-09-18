import { createSlice } from '@reduxjs/toolkit';
import { find } from 'lodash';
import toast from 'react-hot-toast';
import { addTab, closeTabs } from 'providers/ReduxStore/slices/tabs';
import {
  API_SPEC_TAB_TYPE,
  findApiSpecByPathname,
  getApiSpecPathKey,
  getApiSpecTabUid,
  hasUnsavedApiSpecChanges,
  isApiSpecTabForPathname
} from 'utils/api-specs';
import { normalizePath } from 'utils/common/path';

const initialState = {
  apiSpecs: []
};

export const apiSpecSlice = createSlice({
  name: 'apiSpec',
  initialState,
  reducers: {
    apiSpecAddFileEvent: (state, action) => {
      const { name, raw, uid, filename, pathname, json, resolvedJson } = action?.payload?.data || {};
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
        apiSpec.resolvedJson = resolvedJson;
      } else {
        const newApiSpec = {
          name,
          raw,
          uid,
          filename,
          pathname,
          json,
          resolvedJson
        };
        state.apiSpecs.push(newApiSpec);
      }
    },
    apiSpecChangeFileEvent: (state, action) => {
      const { name, raw, uid, filename, pathname, json, resolvedJson } = action?.payload?.data || {};
      if (!uid) return;

      const apiSpec = findApiSpecByUid(state.apiSpecs, uid);
      if (apiSpec) {
        apiSpec.raw = raw;
        apiSpec.name = name;
        apiSpec.filename = filename;
        apiSpec.pathname = pathname;
        apiSpec.json = json;
        apiSpec.resolvedJson = resolvedJson;
      }
    },
    saveApiSpec: (state, action) => {
      const { content, uid } = action.payload;
      const apiSpec = findApiSpecByUid(state.apiSpecs, uid);
      if (apiSpec) {
        apiSpec.raw = content;
        if (apiSpec.draft === content) {
          delete apiSpec.draft;
        }
      }
    },
    updateApiSpecDraft: (state, action) => {
      const { uid, content } = action.payload;
      const apiSpec = findApiSpecByUid(state.apiSpecs, uid);
      if (apiSpec) {
        apiSpec.draft = content;
      }
    },
    clearApiSpecDraft: (state, action) => {
      const apiSpec = findApiSpecByUid(state.apiSpecs, action.payload.uid);
      if (apiSpec) {
        delete apiSpec.draft;
      }
    },
    removeApiSpec: (state, action) => {
      const { uid } = action.payload;
      state.apiSpecs = state.apiSpecs.filter((c) => c.uid !== uid);
    }
  }
});

export const {
  apiSpecAddFileEvent,
  apiSpecChangeFileEvent,
  saveApiSpec,
  updateApiSpecDraft,
  clearApiSpecDraft,
  removeApiSpec
} = apiSpecSlice.actions;

export default apiSpecSlice.reducer;

const findApiSpecByUid = (apiSpecs, uid) => {
  return find(apiSpecs, (apiSpec) => apiSpec.uid === uid);
};

const getActiveWorkspace = (state) =>
  state.workspaces.workspaces.find((workspace) => workspace.uid === state.workspaces.activeWorkspaceUid);

export const openApiSpecTab = (apiSpec) => async (dispatch, getState) => {
  const pathname = normalizePath(apiSpec?.pathname);
  const workspace = getActiveWorkspace(getState());

  if (!pathname || !workspace) {
    toast.error('Could not open the API spec');
    return;
  }

  let collectionUid = workspace.scratchCollectionUid;
  if (!collectionUid) {
    const { mountScratchCollection } = require('./workspaces/actions');
    collectionUid = (await dispatch(mountScratchCollection(workspace.uid)))?.uid;
  }

  if (getState().workspaces.activeWorkspaceUid !== workspace.uid) {
    return;
  }

  const uid = getApiSpecTabUid(collectionUid, pathname);

  if (!uid) {
    toast.error('Could not open the API spec in this workspace');
    return;
  }

  dispatch(addTab({
    uid,
    collectionUid,
    type: API_SPEC_TAB_TYPE,
    apiSpecPathname: pathname,
    tabName: apiSpec?.filename || apiSpec?.name || null
  }));
};

export const dropApiSpecTabsMissingFrom = (workspaceUid, pathnames) => (dispatch, getState) => {
  const state = getState();
  const scratchCollectionUid = state.workspaces.workspaces
    .find((workspace) => workspace.uid === workspaceUid)?.scratchCollectionUid;

  if (!scratchCollectionUid) {
    return;
  }

  const workspacePathKeys = new Set(
    (pathnames || []).map((pathname) => getApiSpecPathKey(pathname)).filter(Boolean)
  );

  const tabUids = state.tabs.tabs
    .filter((tab) => (
      tab.type === API_SPEC_TAB_TYPE
      && tab.collectionUid === scratchCollectionUid
      && !workspacePathKeys.has(getApiSpecPathKey(tab.apiSpecPathname))
    ))
    .map((tab) => tab.uid);

  if (tabUids.length) {
    dispatch(closeTabs({ tabUids, reopenable: false }));
  }
};

const closeApiSpecTabs = (collectionUid, pathname) => (dispatch, getState) => {
  const tabUids = getState().tabs.tabs
    .filter((tab) => tab.collectionUid === collectionUid && isApiSpecTabForPathname(tab, pathname))
    .map((tab) => tab.uid);

  if (tabUids.length) {
    dispatch(closeTabs({ tabUids, reopenable: false }));
  }
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

        if (!apiSpec) {
          toast.error('Error saving file');
          return reject(new Error('API spec not found'));
        }

        ipcRenderer
          .invoke('renderer:save-api-spec', apiSpec.pathname, content)
          .then(() => {
            dispatch(saveApiSpec({ content, uid }));
            toast.success('Saved API spec successfully!');
            resolve();
          })
          .catch((error) => {
            toast.error('Error saving file');
            reject(error);
          });
      });
    };

export const saveApiSpecTabDraft = (tabUid) => (dispatch, getState) => {
  const state = getState();
  const tab = state.tabs.tabs.find((t) => t.uid === tabUid);

  if (!tab || tab.type !== API_SPEC_TAB_TYPE) {
    return Promise.resolve();
  }

  const apiSpec = findApiSpecByPathname(state.apiSpec.apiSpecs, tab.apiSpecPathname);

  if (!hasUnsavedApiSpecChanges(apiSpec)) {
    if (apiSpec) {
      dispatch(clearApiSpecDraft({ uid: apiSpec.uid }));
    }
    return Promise.resolve();
  }

  return dispatch(saveApiSpecToFile({ uid: apiSpec.uid, content: apiSpec.draft }));
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
              dispatch(closeApiSpecTabs(activeWorkspace?.scratchCollectionUid, apiSpec.pathname));
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
