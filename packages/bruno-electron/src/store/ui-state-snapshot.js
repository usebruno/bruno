const Store = require('electron-store');

class UiStateSnapshotStore {
  constructor() {
    this.store = new Store({
      name: 'ui-state-snapshot',
      clearInvalidConfig: true
    });
  }

  getCollections() {
    return this.store.get('collections') || [];
  }

  saveCollections(collections) {
    this.store.set('collections', collections);
  }

  getCollectionByPathname({ pathname }) {
    let collections = this.getCollections();

    let collection = collections.find(c => c?.pathname === pathname);
    if (!collection) {
      collection = { pathname };
      collections.push(collection);
      this.saveCollections(collections);
    }

    return collection;
  }

  setCollectionByPathname({ collection }) {
    let collections = this.getCollections();

    collections = collections.filter(c => c?.pathname !== collection.pathname);
    collections.push({ ...collection });
    this.saveCollections(collections);

    return collection;
  }

  updateCollectionEnvironment({ collectionPath, environmentName }) {
    const collection = this.getCollectionByPathname({ pathname: collectionPath });
    collection.selectedEnvironment = environmentName;
    this.setCollectionByPathname({ collection });
  }

  getSidebar() {
    return this.store.get('sidebar') || { width: 222 };
  }

  saveSidebar(sidebar) {
    this.store.set('sidebar', sidebar);
  }

  getSidebarWidth() {
    const sidebar = this.getSidebar();
    return sidebar && sidebar.width != null ? sidebar.width : 222;
  }

  updateSidebarWidth(width) {
    this.saveSidebar({ width });
  }

  update({ type, data }) {
    switch(type) {
      case 'COLLECTION_ENVIRONMENT':
        const { collectionPath, environmentName } = data;
        this.updateCollectionEnvironment({ collectionPath, environmentName });
        break;
      case 'SIDEBAR':
        const { width } = data;
        this.updateSidebarWidth(width);
        break;
      default:
        break;
    }
  }
}

module.exports = UiStateSnapshotStore;
