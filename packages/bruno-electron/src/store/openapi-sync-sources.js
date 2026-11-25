const Store = require('electron-store');

const AUTO_CHECK_INTERVALS = [5, 15, 30, 60];
const DEFAULT_AUTO_CHECK_INTERVAL = 5;

const toAutoCheckInterval = (value) => (AUTO_CHECK_INTERVALS.includes(value) ? value : DEFAULT_AUTO_CHECK_INTERVAL);

// Kept in app data so a collection file can never approve its own source or turn auto check on.
class OpenApiSyncSourcesStore {
  constructor() {
    this.store = new Store({
      name: 'openapi-sync-sources',
      clearInvalidConfig: true
    });
  }

  get(collectionPath) {
    return this.store.get('collections', {})[collectionPath] || null;
  }

  set(collectionPath, record) {
    const collections = this.store.get('collections', {});
    collections[collectionPath] = record;
    this.store.set('collections', collections);
  }

  remove(collectionPath) {
    const collections = this.store.get('collections', {});
    if (collectionPath in collections) {
      delete collections[collectionPath];
      this.store.set('collections', collections);
    }
  }
}

module.exports = {
  OpenApiSyncSourcesStore,
  toAutoCheckInterval
};
