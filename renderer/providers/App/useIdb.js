import { useEffect } from 'react';
import { openDB } from 'idb';
import { idbConnectionReady } from 'providers/ReduxStore/slices/app'
import { loadCollectionsFromIdb } from 'providers/ReduxStore/slices/collections'
import { useDispatch } from 'react-redux';

const useIdb = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    let dbName = `grafnode`;
    let connection = openDB(dbName, 1, {
      upgrade(db, oldVersion, newVersion, transaction) {
        switch(oldVersion) {
          case 0:
            const collectionStore = db.createObjectStore('collection', { keyPath: 'uid' });
            collectionStore.createIndex('transactionIdIndex', 'transaction_id');
        }
      }
    });

    connection
      .then(() => {
        window.__idb = connection;
        dispatch(idbConnectionReady());
        dispatch(loadCollectionsFromIdb());
      })
      .catch((err) => console.log(err));
  }, []);
};

export default useIdb;