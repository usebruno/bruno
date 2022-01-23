import produce from 'immer';
import {nanoid} from 'nanoid';
import find from 'lodash/find';
import filter from 'lodash/filter';
import last from 'lodash/last';
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

    case actions.COLLECTION_CREATE: {
      return produce(state, (draft) => {
        // todo: collection names must be unique across a user account
        draft.collections = draft.collections || [];
        draft.collections.push({
          id: nanoid(),
          name: action.name,
          items: []
        });
      });
    }

    case actions.REQUEST_TAB_CLICK: {
      return produce(state, (draft) => {
        draft.activeRequestTabId = action.requestTab.id;
      });
    }

    case actions.REQUEST_URL_CHANGED: {
      return produce(state, (draft) => {
        const collection = find(draft.collections, (c) => c.id === action.collectionId);

        if(collection) {
          let flattenedItems = flattenItems(collection.items);
          let item = findItem(flattenedItems, action.requestTab.id);
          
          if(item) {
            item.request.url = action.url;
          }
        }
      });
    }

    case actions.REQUEST_GQL_QUERY_CHANGED: {
      return produce(state, (draft) => {
        const collection = find(draft.collections, (c) => c.id === action.collectionId);

        if(collection) {
          let flattenedItems = flattenItems(collection.items);
          let item = findItem(flattenedItems, action.requestTab.id);
          
          if(item) {
            item.request.body.graphql.query = action.query;
          }
        }
      });
    }

    case actions.ADD_NEW_HTTP_REQUEST: {
      return produce(state, (draft) => {
        const uid = nanoid();
        draft.requestTabs.push({
          id: uid,
          name: 'New Tab',
          method: 'GET',
          request: {
            type: 'http',
            url: 'https://api.spacex.land/graphql/',
            body: {}
          },
          collectionId: null
        });
        draft.activeRequestTabId = uid;
      });
    }

    case actions.ADD_NEW_GQL_REQUEST: {
      return produce(state, (draft) => {
        const uid = nanoid();
        draft.requestTabs.push({
          id: uid,
          name: 'New Tab',
          method: 'GET',
          request: {
            type: 'graphql',
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

    case actions.SEND_REQUEST: {
      return produce(state, (draft) => {
        const collection = find(draft.collections, (c) => c.id === action.collectionId);

        if(collection) {
          let flattenedItems = flattenItems(collection.items);
          let item = findItem(flattenedItems, action.requestTab.id);
          
          if(item) {
            item.response = item.response || {};
            item.response.state = 'queued';
            draft.requestQueuedToSend = {
              collectionId: action.collectionId,
              request: item
            }
          }
        }
      });
    }

    case actions.SENDING_REQUEST: {
      return produce(state, (draft) => {
        const collection = find(draft.collections, (c) => c.id === action.collectionId);

        if(collection) {
          let flattenedItems = flattenItems(collection.items);
          let item = findItem(flattenedItems, action.request.id);
          
          if(item) {
            item.response.state = 'sending';
            draft.requestQueuedToSend = null;
          }
        }
      });
    }

    case actions.RESPONSE_RECEIVED: {
      return produce(state, (draft) => {
        const collection = find(draft.collections, (c) => c.id === action.collectionId);

        if(collection) {
          let flattenedItems = flattenItems(collection.items);
          let item = findItem(flattenedItems, action.request.id);
          
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
          // todo: closing tab needs to focus on the right adjacent tab
          draft.activeRequestTabId = last(draft.requestTabs).id;
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