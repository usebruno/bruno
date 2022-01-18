import React, { useEffect, useContext, useReducer, createContext } from 'react';
import reducer from './reducer';
import { sendRequest } from '../../network';
import { nanoid } from 'nanoid';

export const StoreContext = createContext();

const tabId1 = nanoid();

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
  collections: [collection, collection2],
	activeRequestTabId: null,
	requestQueuedToSend: null,
  requestTabs: []
};

export const StoreProvider = props => {
	const [state, dispatch] = useReducer(reducer, initialState);
	
	useEffect(() => {
		if(state.requestQueuedToSend) {
			const {
				request,
				collectionId
			} = state.requestQueuedToSend;
	
			sendRequest(request, collectionId, dispatch)
		}
	}, [state.requestQueuedToSend]);

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
