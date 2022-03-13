import { useEffect } from 'react';
import { getCollectionsFromIdb } from './idb';
import actions from './actions';

const useLoadCollectionsFromIdb = (idbConnection, dispatch) => {
  useEffect(() => {
		if(idbConnection) {
			getCollectionsFromIdb(idbConnection)
				.then((collections) => {
					dispatch({
						type: actions.LOAD_COLLECTIONS_FROM_IDB,
						collections: collections
					});
				})
				.catch((err) => console.log(err));
		}
	}, [idbConnection, dispatch]);
};

export default useLoadCollectionsFromIdb;