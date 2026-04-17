const snapshotManager = require('../services/snapshot');

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

class UiStateSnapshotStore {
  getCollections() {
    const snapshot = snapshotManager.getSnapshot() || {};
    const collectionsMap = isObject(snapshot.collections) ? snapshot.collections : {};

    return Object.entries(collectionsMap).map(([pathname, entry]) => {
      const collectionEntry = isObject(entry) ? entry : {};
      const environment = isObject(collectionEntry.environment) ? collectionEntry.environment : {};

      return {
        pathname,
        environmentPath: typeof environment.collection === 'string' ? environment.collection : ''
      };
    });
  }

  saveCollections(collections) {
    if (!Array.isArray(collections)) {
      return;
    }

    collections.forEach((collection) => {
      if (!collection || typeof collection.pathname !== 'string') {
        return;
      }

      const environmentRef = collection.environmentPath ?? collection.selectedEnvironment;
      snapshotManager.updateCollectionEnvironment({
        collectionPath: collection.pathname,
        environmentPath: environmentRef
      });
    });
  }

  getCollectionByPathname({ pathname }) {
    const collectionEntry = snapshotManager.getCollection(pathname);

    if (!collectionEntry) {
      const collection = {
        pathname,
        environmentPath: ''
      };

      this.setCollectionByPathname({ collection });
      return collection;
    }

    const environment = isObject(collectionEntry.environment) ? collectionEntry.environment : {};

    return {
      pathname,
      environmentPath: typeof environment.collection === 'string' ? environment.collection : ''
    };
  }

  setCollectionByPathname({ collection }) {
    if (!collection || typeof collection.pathname !== 'string') {
      return collection;
    }

    const environmentRef = collection.environmentPath ?? collection.selectedEnvironment;
    snapshotManager.updateCollectionEnvironment({
      collectionPath: collection.pathname,
      environmentPath: environmentRef
    });

    return collection;
  }

  updateCollectionEnvironment({ collectionPath, environmentPath, environmentName }) {
    snapshotManager.updateCollectionEnvironment({
      collectionPath,
      environmentPath: environmentPath === undefined ? environmentName : environmentPath
    });
  }

  update({ type, data }) {
    switch (type) {
      case 'COLLECTION_ENVIRONMENT': {
        const collectionPath = data?.collectionPath;
        const environmentRef = data?.environmentPath ?? data?.environmentName;
        this.updateCollectionEnvironment({ collectionPath, environmentPath: environmentRef });
        break;
      }
      default:
        snapshotManager.update({ type, data });
        break;
    }
  }
}

module.exports = UiStateSnapshotStore;
