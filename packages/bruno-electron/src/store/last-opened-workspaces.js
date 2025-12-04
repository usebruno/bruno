const Store = require('electron-store');
const { generateUidBasedOnHash } = require('../utils/common');

const MAX_WORKSPACES = 10;

class LastOpenedWorkspaces {
  constructor() {
    this.store = new Store({
      name: 'preferences',
      defaults: {}
    });
  }

  getAll() {
    return this.store.get('workspaces.lastOpenedWorkspaces', []);
  }

  add(workspacePath, workspaceConfig) {
    const workspaces = this.getAll();

    const workspaceUid = generateUidBasedOnHash(workspacePath);

    const filteredWorkspaces = workspaces.filter((w) => w.uid !== workspaceUid);

    const workspaceEntry = {
      ...workspaceConfig,
      uid: workspaceUid,
      name: workspaceConfig.name,
      lastOpened: new Date().toISOString(),
      pathname: workspacePath
    };

    filteredWorkspaces.unshift(workspaceEntry);

    const limitedWorkspaces = filteredWorkspaces.slice(0, MAX_WORKSPACES);

    this.store.set('workspaces.lastOpenedWorkspaces', limitedWorkspaces);
    return limitedWorkspaces;
  }

  remove(workspaceUid) {
    const workspaces = this.getAll();
    const filteredWorkspaces = workspaces.filter((w) => w.uid !== workspaceUid);
    this.store.set('workspaces.lastOpenedWorkspaces', filteredWorkspaces);
    return filteredWorkspaces;
  }
}

module.exports = LastOpenedWorkspaces;
