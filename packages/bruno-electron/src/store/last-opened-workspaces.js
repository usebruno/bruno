const _ = require('lodash');
const Store = require('electron-store');

/**
* Older/experimental builds persisted some entries as a workspace object (`{ pathname, ... }`)
* instead of a plain path string. Recover the path from `pathname`, drop anything unusable, and
* de-duplicate so callers only ever see a string-only list.
*/

const normalizeWorkspaceEntry = (entry) => {
  if (typeof entry === 'string') {
    return entry;
  }

  if (entry && typeof entry === 'object' && typeof entry.pathname === 'string') {
    return entry.pathname;
  }

  return null;
};

const normalizeWorkspaceEntries = (entries) => {
  if (!Array.isArray(entries)) {
    return [];
  }

  return _.uniq(entries.map(normalizeWorkspaceEntry).filter(Boolean));
};

class LastOpenedWorkspaces {
  constructor() {
    this.store = new Store({
      name: 'preferences',
      defaults: {}
    });
    this.migrate();
  }

  /**
  * migrate()
  * One-shot heal on load: recover the path from any legacy object entries and scrub the objects
  * from preferences.json so only string paths persist. Runs once at construction, before any read.
  */

  migrate() {
    const rawWorkspaces = this.store.get('workspaces.lastOpenedWorkspaces', []);
    const normalized = normalizeWorkspaceEntries(rawWorkspaces);

    if (!_.isEqual(rawWorkspaces, normalized)) {
      this.store.set('workspaces.lastOpenedWorkspaces', normalized);
    }
  }

  getAll() {
    return normalizeWorkspaceEntries(this.store.get('workspaces.lastOpenedWorkspaces', []));
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
