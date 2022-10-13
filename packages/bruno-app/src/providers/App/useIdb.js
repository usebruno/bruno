import { useEffect } from 'react';
import { openDB } from 'idb';
import { idbConnectionReady } from 'providers/ReduxStore/slices/app'
import { loadCollectionsFromIdb } from 'providers/ReduxStore/slices/collections'
import { loadWorkspacesFromIdb } from 'providers/ReduxStore/slices/workspaces/actions'
import { useDispatch } from 'react-redux';

const useIdb = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    let dbName = `bruno`;
    let connection = openDB(dbName, 2, {
      upgrade(db, oldVersion, newVersion, transaction) {
        switch(oldVersion) {
          case 0:
            const collectionStore = db.createObjectStore('collection', { keyPath: 'uid' });
            collectionStore.createIndex('transactionIdIndex', 'transaction_id');
          case 1:
            const workspaceStore = db.createObjectStore('workspace', { keyPath: 'uid' });
        }
      }
    });

    connection
      .then(() => {
        window.__idb = connection;
        dispatch(idbConnectionReady());
        dispatch(loadCollectionsFromIdb());
        dispatch(loadWorkspacesFromIdb());
      })
      .catch((err) => console.log(err));
  }, []);
};

export default useIdb;