const Store = require('electron-store');

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

  add(workspacePath) {
    const workspaces = this.getAll();

    if (workspaces.includes(workspacePath)) {
      return workspaces;
    }

    workspaces.unshift(workspacePath);
    this.store.set('workspaces.lastOpenedWorkspaces', workspaces);
    return workspaces;
  }

  remove(workspacePath) {
    const workspaces = this.getAll();
    const filteredWorkspaces = workspaces.filter((w) => w !== workspacePath);
    this.store.set('workspaces.lastOpenedWorkspaces', filteredWorkspaces);
    return filteredWorkspaces;
  }
}

module.exports = LastOpenedWorkspaces;
