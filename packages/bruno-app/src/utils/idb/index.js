export const saveCollectionToIdb = (connection, collection) => {
  return new Promise((resolve, reject) => {
    connection
      .then((db) => {
        let tx = db.transaction(`collection`, 'readwrite');
        let collectionStore = tx.objectStore('collection');

        collectionStore.put(collection);

        resolve(collection);
      })
      .catch((err) => reject(err));
  });
};

export const getCollectionsFromIdb = (connection) => {
  return new Promise((resolve, reject) => {
    connection
      .then((db) => {
        let tx = db.transaction('collection');
        let collectionStore = tx.objectStore('collection');
        return collectionStore.getAll();
      })
      .then((collections) => {
        if (!Array.isArray(collections)) {
          return new Error('IDB Corrupted');
        }

        return resolve(collections);
      })
      .catch((err) => reject(err));
  });
};
