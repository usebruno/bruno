import { getWorkspacesFromIdb } from 'utils/idb/workspaces';
import {
  loadWorkspaces
} from './index';

export const loadWorkspacesFromIdb = () => (dispatch) => {
  return new Promise((resolve, reject) => {
    getWorkspacesFromIdb(window.__idb)
      .then((workspaces) => dispatch(loadWorkspaces({
        workspaces: workspaces
      })))
      .then(resolve)
      .catch(reject);
  });
};