import { useEffect } from 'react';
import { openDB } from 'idb';
import actions from './actions';

const useIdb = () => {
  useEffect(() => {
    let dbName = `grafnode`;
    let connection = openDB(dbName, 1, {
      upgrade(db, oldVersion, newVersion, transaction) {
        switch(oldVersion) {
          case 0:
            const collectionStore = db.createObjectStore('collections', { keyPath: 'id' });
            collectionStore.createIndex('transactionIdIndex', 'transaction_id');
        }
      }
    });

    connection.then(() => {
      dispatch({
        type: actions.IDB_CONNECTION_READY,
        connection: connection
      });
    });
  }, []);
};

export default useIdb;