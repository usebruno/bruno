import find from 'lodash/find';
import { uuid } from 'utils/common';
import { getWorkspacesFromIdb, saveWorkspaceToIdb, deleteWorkspaceInIdb } from 'utils/idb/workspaces';
import {
  loadWorkspaces,
  addWorkspace as _addWorkspace,
  renameWorkspace as _renameWorkspace,
  deleteWorkspace as _deleteWorkspace
} from './index';

const seedWorkpace = () => {
  const uid = uuid();
  const workspace = {
    uid: uid,
    name: 'My workspace'
  };

  return new Promise((resolve, reject) => {
    saveWorkspaceToIdb(window.__idb, workspace)
      .then(() => resolve([workspace]))
      .catch(reject);
  });
};

export const loadWorkspacesFromIdb = () => (dispatch) => {
  return new Promise((resolve, reject) => {
    getWorkspacesFromIdb(window.__idb)
      .then((workspaces) => {
        if(!workspaces || !workspaces.length) {
          return seedWorkpace();
        }

        return workspaces;
      })
      .then((workspaces) => dispatch(loadWorkspaces({
        workspaces: workspaces
      })))
      .then(resolve)
      .catch(reject);
  });
};

export const addWorkspace = (workspaceName) => (dispatch) => {
  const newWorkspace = {
    uid: uuid(),
    name: workspaceName
  };

  return new Promise((resolve, reject) => {
    saveWorkspaceToIdb(window.__idb, newWorkspace)
      .then(() => dispatch(_addWorkspace({
        workspace: newWorkspace
      })))
      .then(resolve)
      .catch(reject);
  });
};

export const renameWorkspace = (newName, uid) => (dispatch, getState) => {
  const state = getState();

  return new Promise((resolve, reject) => {
    const workspace = find(state.workspaces.workspaces, (w) => w.uid === uid);

    if(!workspace) {
      return reject(new Error('Workspace not found'));
    }

    saveWorkspaceToIdb(window.__idb, {
      uid: workspace.uid,
      name: newName,
    })
      .then(() => dispatch(_renameWorkspace({
        uid: uid,
        name: newName
      })))
      .then(resolve)
      .catch((err) => console.log(err));
  });
};

export const deleteWorkspace = (workspaceUid) => (dispatch, getState) => {
  const state = getState();

  return new Promise((resolve, reject) => {
    if(state.workspaces.activeWorkspaceUid === workspaceUid) {
      throw new Error("User cannot delete current workspace");
    }

    const workspace = find(state.workspaces.workspaces, (w) => w.uid === workspaceUid);

    if(!workspace) {
      return reject(new Error('Workspace not found'));
    }

    deleteWorkspaceInIdb(window.__idb, workspaceUid)
      .then(() => dispatch(_deleteWorkspace({
        workspaceUid: workspaceUid
      })))
      .then(resolve)
      .catch((err) => console.log(err));
  });
};