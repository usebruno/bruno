import isArray from 'lodash/isArray';

export const saveCollectionToIdb = (connection, collection) => {
  return new Promise((resolve, reject) => {
    connection
      .then((db) => {
        let tx = db.transaction(`collection`, 'readwrite');
        let collectionStore = tx.objectStore('collection');

        if(isArray(collection)) {
          for(let c of collection) {
            collectionStore.put(c);
          }
        } else {
          collectionStore.put(collection);
        }

        resolve();
      })
      .catch((err) => reject(err));
  });
};

export const deleteCollectionInIdb = (connection, collectionUid) => {
  return new Promise((resolve, reject) => {
    connection
      .then((db) => {
        let tx = db.transaction(`collection`, 'readwrite');
        tx.objectStore('collection').delete(collectionUid);

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
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
        if(!Array.isArray(collections)) {
          return new Error('IDB Corrupted');
        }

        return resolve(collections);
      })
      .catch((err) => reject(err));
  });
};