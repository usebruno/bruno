import { useEffect } from 'react';
import { openDB } from 'idb';
import actions from './actions';

const useIdb = (dispatch) => {
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

    connection.then(() => {
      dispatch({
        type: actions.IDB_CONNECTION_READY,
        connection: connection
      });
    });
  }, []);
};

export default useIdb;