class Cache {
  get(key) {
    return window.localStorage.getItem(key);
  }
  set(key, val) {
    window.localStorage.setItem(key, val);
  }

  getActiveWorkspaceUid() {
    return this.get('bruno.activeWorkspaceUid');
  }

  setActiveWorkspaceUid(workspaceUid) {
    this.set('bruno.activeWorkspaceUid', workspaceUid);
  }
}

module.exports = new Cache();
