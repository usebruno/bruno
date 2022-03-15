import { useState, useEffect } from 'react';
import map from 'lodash/map';
import filter from 'lodash/filter';
import actions from './actions';
import { saveCollectionToIdb } from './idb';

// This hook listens to changes in 'collectionsToSyncToIdb' and syncs them to idb
// The app uses this when collections are created as well as when collections get updated
const useSyncCollectionsToIdb = (collectionsToSyncToIdb, collections, idbConnection, dispatch) => {
	const [collectionsSyncingToIdb, setCollectionsSyncingToIdb] = useState(false);

  useEffect(() => {
		if(collectionsSyncingToIdb) {
			return;
		}
		if(collectionsToSyncToIdb && collectionsToSyncToIdb.length) {
			setCollectionsSyncingToIdb(true);
			const _collections = filter(collections, (c) => {
				return collectionsToSyncToIdb.indexOf(c.uid) > -1;
			});
			dispatch({
				type: actions.IDB_COLLECTIONS_SYNC_STARTED
			});
			saveCollectionToIdb(idbConnection, _collections)
				.then(() => {
					setCollectionsSyncingToIdb(false);
				})
				.catch((err) => {
					setCollectionsSyncingToIdb(false);
					dispatch({
						type: actions.IDB_COLLECTIONS_SYNC_ERROR,
						collectionUids: map(collections, (c) => c.uid)
					});
					console.log(err);
				});
			
		}
	}, [collectionsToSyncToIdb]);
};

export default useSyncCollectionsToIdb;