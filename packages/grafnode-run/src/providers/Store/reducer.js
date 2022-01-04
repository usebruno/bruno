import produce from 'immer';
import {nanoid} from 'nanoid';
import find from 'lodash/find';
import filter from 'lodash/filter';
import actions from './actions';
import {
  flattenItems,
  findItem,
  isItemARequest,
  itemIsOpenedInTabs
} from './utils';

const reducer = (state, action) => {
  switch (action.type) {
    case actions.SIDEBAR_COLLECTION_CLICK: {
      return produce(state, (draft) => {
        const collection = find(draft.collections, (c) => c.id === action.id);

        if(collection) {
          collection.collapsed = !collection.collapsed;
        }
      });
    }

    case actions.SIDEBAR_COLLECTION_ITEM_CLICK: {
      return produce(state, (draft) => {
        const collection = find(draft.collections, (c) => c.id === action.collectionId);

        if(collection) {
          let flattenedItems = flattenItems(collection.items);
          let item = findItem(flattenedItems, action.itemId);
          
          if(item) {
            item.collapsed = !item.collapsed;

            if(isItemARequest(item)) {
              if(itemIsOpenedInTabs(item, draft.requestTabs)) {
                draft.activeRequestTabId = item.id;
              } else {
                draft.requestTabs.push({
                  id: item.id,
                  name: item.name,
                  method: item.request.method,
                  collectionId: collection.id
                });
                draft.activeRequestTabId = item.id;
              }
            }
          }
        }
      });
    }

    case actions.REQUEST_TAB_CLICK: {
      return produce(state, (draft) => {
        draft.activeRequestTabId = action.requestTab.id;
      });
    }

    case actions.ADD_NEW_HTTP_REQUEST: {
      return produce(state, (draft) => {
        const uid = nanoid();
        draft.requestTabs.push({
          id: uid,
          name: 'Untitled Request',
          method: 'GET',
          request: {
            url: 'https://api.spacex.land/graphql/',
            body: {
              graphql: {
                query: '{}'
              }
            }
          },
          collectionId: null
        });
        draft.activeRequestTabId = uid;
      });
    }

    case actions.RESPONSE_RECEIVED: {
      return produce(state, (draft) => {
        const collection = find(draft.collections, (c) => c.id === action.collectionId);

        if(collection) {
          let flattenedItems = flattenItems(collection.items);
          let item = findItem(flattenedItems, action.requestTab.id);
          
          if(item) {
            item.response = action.response;
          }
        }
      });
    }


    case actions.REQUEST_TAB_CLOSE: {
      return produce(state, (draft) => {
        draft.requestTabs = filter(draft.requestTabs, (rt) => rt.id !== action.requestTab.id);

        if(draft.requestTabs && draft.requestTabs.length) {
          draft.activeRequestTabId = draft.requestTabs[0].id;
        } else {
          draft.activeRequestTabId = null;
        }
      });
    }

    case actions.ADD_REQUEST: {
      return produce(state, (draft) => {
        const collection = find(draft.collections, (c) => c.id === action.collectionId);

        if(collection) {
          let flattenedItems = flattenItems(collection.items);
          let item = findItem(flattenedItems, action.itemId);
          
          if(item) {
            if(!isItemARequest(item)) {
              let newRequest =  {
                "id": nanoid(),
                "depth": 2,
                "name": "Capsules 2",
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
              };
              draft.activeRequestTabId = newRequest.id;
              item.items.push(newRequest);
              draft.requestTabs.push({
                id: newRequest.id,
                name: newRequest.name,
                method: newRequest.request.method,
                collectionId: collection.id
              });
            }
          }
        }
      });
    }

    default: {
      return state;
    }
  }
}

export default reducer;