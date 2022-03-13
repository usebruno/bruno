import React, { useState, useEffect, useContext, useReducer, createContext } from 'react';
import map from 'lodash/map';
import filter from 'lodash/filter';
import reducer from './reducer';
import useIdb from './useIdb';
import { sendRequest } from '../../network';
import { nanoid } from 'nanoid';
import actions from './actions';
import {getCollectionsFromIdb, saveCollectionToIdb} from './idb';

export const StoreContext = createContext();

const collection = {
  "id": nanoid(),
	"name": "spacex",
	"items": [
		{
      "id": nanoid(),
      "name": "Launches",
      "depth": 1,
			"items": [
				{
          "id": nanoid(),
          "depth": 2,
					"name": "Capsules",
					"request": {
						"type": "graphql",
						"url": "https://api.spacex.land/graphql/",
						"method": "POST",
						"headers": [],
						"body": {
							"mimeType": "application/graphql",
							"graphql": {
								"query": "{\n  launchesPast(limit: 10) {\n    mission_name\n    launch_date_local\n    launch_site {\n      site_name_long\n    }\n    links {\n      article_link\n      video_link\n    }\n    rocket {\n      rocket_name\n      first_stage {\n        cores {\n          flight\n          core {\n            reuse_count\n            status\n          }\n        }\n      }\n      second_stage {\n        payloads {\n          payload_type\n          payload_mass_kg\n          payload_mass_lbs\n        }\n      }\n    }\n    ships {\n      name\n      home_port\n      image\n    }\n  }\n}",
								"variables": ""
							}
						}
					},
					"response": null
				},
				{
          "id": nanoid(),
          "depth": 2,
					"name": "Missions",
					"request": {
						"type": "graphql",
						"url": "https://api.spacex.land/graphql/",
						"method": "POST",
						"headers": [],
						"body": {
							"mimeType": "application/graphql",
							"graphql": {
								"query": "{\n  launches {\n    launch_site {\n      site_id\n      site_name\n    }\n    launch_success\n  }\n}",
								"variables": ""
							}
						}
					},
					"response": null
				}
			]
		}
	]
};

const collection2 = {
  "id": nanoid(),
	"name": "notebase",
	"items": [
		{
      "id": nanoid(),
      "name": "Notes",
      "depth": 1,
			"items": [
				{
          "id": nanoid(),
          "depth": 2,
					"name": "Create",
					"request": {
						"type": "graphql",
						"url": "https://api.spacex.land/graphql/",
						"method": "POST",
						"headers": [],
						"body": {
							"mimeType": "application/graphql",
							"graphql": {
								"query": "{\n  launchesPast(limit: 10) {\n    mission_name\n    launch_date_local\n    launch_site {\n      site_name_long\n    }\n    links {\n      article_link\n      video_link\n    }\n    rocket {\n      rocket_name\n      first_stage {\n        cores {\n          flight\n          core {\n            reuse_count\n            status\n          }\n        }\n      }\n      second_stage {\n        payloads {\n          payload_type\n          payload_mass_kg\n          payload_mass_lbs\n        }\n      }\n    }\n    ships {\n      name\n      home_port\n      image\n    }\n  }\n}",
								"variables": ""
							}
						}
					},
					"response": null
				},
				{
          "id": nanoid(),
          "depth": 2,
					"name": "Update",
					"request": {
						"type": "graphql",
						"url": "https://api.spacex.land/graphql/",
						"method": "POST",
						"headers": [],
						"body": {
							"mimeType": "application/graphql",
							"graphql": {
								"query": "{\n  launches {\n    launch_site {\n      site_id\n      site_name\n    }\n    launch_success\n  }\n}",
								"variables": ""
							}
						}
					},
					"response": null
				}
			]
		}
	]
};

const initialState = {
	idbConnection: null,
  collections: [],
	activeRequestTabId: null,
	requestQueuedToSend: null,
	requestTabs: [],
	collectionsToSyncToIdb: []
};

export const StoreProvider = props => {
	const [state, dispatch] = useReducer(reducer, initialState);
	const [collectionsSyncingToIdb, setCollectionsSyncingToIdb] = useState(false);

	const {
		collections,
		idbConnection,
		collectionsToSyncToIdb
	} = state;
	
	useEffect(() => {
		if(state.requestQueuedToSend) {
			const {
				request,
				collectionId
			} = state.requestQueuedToSend;
	
			sendRequest(request, collectionId, dispatch)
		}
	}, [state.requestQueuedToSend]);

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
	}, [idbConnection]);

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

	useIdb(dispatch);

  return <StoreContext.Provider value={[state, dispatch]} {...props} />;
};

export const useStore = () => {
  const context = useContext(StoreContext);

  if (context === undefined) {
    throw new Error(`useStore must be used within a StoreProvider`);
  }

  return context;
};

export default StoreProvider;
