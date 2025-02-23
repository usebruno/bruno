const _ = require('lodash');
const Store = require('electron-store');

class CollectionSecurityStore {
  constructor() {
    this.store = new Store({
      name: 'collection-security',
      clearInvalidConfig: true
    });
  }

  setSecurityConfigForCollection(collectionPathname, securityConfig) {
    const collections = this.store.get('collections') || [];
    const collection = _.find(collections, (c) => c.path === collectionPathname);

    if (!collection) {
      collections.push({
        path: collectionPathname,
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
    const collections = this.store.get('collections') || [];
    const collection = _.find(collections, (c) => c.path === collectionPathname);
    return collection?.securityConfig || {};
  }
}

module.exports = CollectionSecurityStore;
