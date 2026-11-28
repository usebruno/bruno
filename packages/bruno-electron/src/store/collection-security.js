const _ = require('lodash');
const Store = require('electron-store');

// Compare collection paths after posixifying + stripping trailing slashes so a
// path.resolve trip on Windows (which produces backslashes) or a seeded fixture
// still matches the entry a caller wrote earlier. Mirrors normalizePath in
// bruno-app/src/utils/common/path.js — collection paths are compared this way
// everywhere else in the app.
const normalizeCollectionPath = (p) => (p ? p.replace(/\\/g, '/').replace(/\/+$/, '') : p);

class CollectionSecurityStore {
  constructor() {
    this.store = new Store({
      name: 'collection-security',
      clearInvalidConfig: true
    });
  }

  setSecurityConfigForCollection(collectionPathname, securityConfig) {
    const normalizedPathname = normalizeCollectionPath(collectionPathname);
    const collections = this.store.get('collections') || [];
    const collection = _.find(collections, (c) => normalizeCollectionPath(c.path) === normalizedPathname);

    if (!collection) {
      collections.push({
        path: normalizedPathname,
        securityConfig: {
          jsSandboxMode: securityConfig.jsSandboxMode
        }
      });

      this.store.set('collections', collections);
      return;
    }

    collection.securityConfig = securityConfig || {};
    this.store.set('collections', collections);
  }

  getSecurityConfigForCollection(collectionPathname) {
    const normalizedPathname = normalizeCollectionPath(collectionPathname);
    const collections = this.store.get('collections') || [];
    const collection = _.find(collections, (c) => normalizeCollectionPath(c.path) === normalizedPathname);
    return collection?.securityConfig || {};
  }
}

module.exports = CollectionSecurityStore;
