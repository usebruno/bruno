const _ = require('lodash');
const Store = require('electron-store');
const { isDirectory } = require('../utils/filesystem');

class LastOpenedCollections {
  constructor() {
    this.store = new Store({
      name: 'preferences',
      clearInvalidConfig: true
    });
    console.log(`Preferences file is located at: ${this.store.path}`);
  }

  getAll() {
    return this.store.get('lastOpenedCollections') || [];
  }

  add(collectionPath) {
    const collections = this.getAll();

    if (isDirectory(collectionPath) && !collections.includes(collectionPath)) {
      collections.push(collectionPath);
      this.store.set('lastOpenedCollections', collections);
    }
  }

  update(collectionPaths) {
    this.store.set('lastOpenedCollections', collectionPaths);
  }

  remove(collectionPath) {
    let collections = this.getAll();

    if (collections.includes(collectionPath)) {
      collections = _.filter(collections, (c) => c !== collectionPath);
      this.store.set('lastOpenedCollections', collections);
    }
  }

  removeAll() {
    this.store.set('lastOpenedCollections', []);
  }
}

module.exports = LastOpenedCollections;
