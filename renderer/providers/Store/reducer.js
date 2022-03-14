import produce from 'immer';
import {nanoid} from 'nanoid';
import union from 'lodash/union';
import filter from 'lodash/filter';
import last from 'lodash/last';
import actions from './actions';
import {
  flattenItems,
  findItem,
  isItemARequest,
  itemIsOpenedInTabs,
  cloneItem,
  updateRequestTabAsChanged,
  findCollectionByUid
} from './utils';

const reducer = (state, action) => {
  switch (action.type) {
    case actions.IDB_CONNECTION_READY: {
      return produce(state, (draft) => {
        draft.idbConnection = action.connection;
      });
    }

    case actions.IDB_COLLECTIONS_SYNC_STARTED: {
      return produce(state, (draft) => {
        draft.collectionsToSyncToIdb = [];
      });
    }

    case actions.IDB_COLLECTIONS_SYNC_ERROR: {
      return produce(state, (draft) => {
        draft.collectionsToSyncToIdb = union(draft.collectionsToSyncToIdb, action.collectionUids);
      });
    }

    case actions.LOAD_COLLECTIONS_FROM_IDB: {
      return produce(state, (draft) => {
        draft.collections = action.collections;
      });
    }

    case actions.SIDEBAR_COLLECTION_CLICK: {
      return produce(state, (draft) => {
        const collection = findCollectionByUid(draft.collections, action.collectionUid);

        if(collection) {
          collection.collapsed = !collection.collapsed;
        }
      });
    }

    case actions.SIDEBAR_COLLECTION_ITEM_CLICK: {
      return produce(state, (draft) => {
        const collection = findCollectionByUid(draft.collections, action.collectionUid);

        if(collection) {
          let flattenedItems = flattenItems(collection.items);
          let item = findItem(flattenedItems, action.itemUid);
          
          if(item) {
            item.collapsed = !item.collapsed;

            if(isItemARequest(item)) {
              if(itemIsOpenedInTabs(item, draft.requestTabs)) {
                draft.activeRequestTabUid = item.uid;
              } else {
                draft.requestTabs.push({
                  uid: item.uid,
                  name: item.name,
                  method: item.request.method,
                  collectionUid: collection.uid,
                  hasChanges: false
                });
                draft.activeRequestTabUid = item.uid;
              }
            }
          }
        }
      });
    }

    case actions.SIDEBAR_COLLECTION_NEW_REQUEST: {
      return produce(state, (draft) => {
        const collection = findCollectionByUid(draft.collections, action.collectionUid);

        if(collection) {
          const uid = nanoid();
          const item = {
            uid: uid,
            name: action.requestName,
            type: 'http-request',
            request: {
              method: 'GET',
              url: 'https://reqbin.com/echo/get/json',
              headers: [],
              body: null
            },
            depth: 1
          };
          collection.items.push(item);

          draft.requestTabs.push({
            uid: item.uid,
            name: item.name,
            method: item.request.method,
            collectionUid: collection.uid,
            hasChanges: false
          });
          draft.activeRequestTabUid = uid;
          draft.collectionsToSyncToIdb.push(collection.uid);
        }
      });
    }

    case actions.SIDEBAR_COLLECTION_NEW_FOLDER: {
      return produce(state, (draft) => {
        const collection = findCollectionByUid(draft.collections, action.collectionUid);

        if(collection) {
          collection.items.push({
            uid: nanoid(),
            name: action.folderName,
            items: [],
            // todo: this will be autoassigned
            depth: 1
          });
          draft.collectionsToSyncToIdb.push(collection.uid);
        }
      });
    }

    case actions.COLLECTION_CREATE: {
      return produce(state, (draft) => {
        // todo: collection names must be unique across a user account
        draft.collections = draft.collections || [];
        draft.collections.push({
          uid: nanoid(),
          name: action.name,
          items: []
        });
      });
    }

    case actions.REQUEST_TAB_CLICK: {
      return produce(state, (draft) => {
        draft.activeRequestTabUid = action.requestTab.uid;
      });
    }

    case actions.REQUEST_URL_CHANGED: {
      return produce(state, (draft) => {
        const collection = findCollectionByUid(draft.collections, action.collectionUid);

        if(collection) {
          let flattenedItems = flattenItems(collection.items);
          let item = findItem(flattenedItems, action.requestTab.id);
          
          if(item) {
            if(!item.draft) {
              item.draft = cloneItem(item);
            }
            item.draft.request.url = action.url;
            updateRequestTabAsChanged(draft.requestTabs, item.id);
          }
        }
      });
    }

    case actions.REQUEST_GQL_QUERY_CHANGED: {
      return produce(state, (draft) => {
        const collection = findCollectionByUid(draft.collections, action.collectionUid);

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
          uid: uid,
          name: 'New Tab',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://api.spacex.land/graphql/',
            body: {}
          },
          collectionUid: null
        });
        draft.activeRequestTabUid = uid;
      });
    }

    case actions.ADD_NEW_GQL_REQUEST: {
      return produce(state, (draft) => {
        const uid = nanoid();
        draft.requestTabs.push({
          uid: uid,
          name: 'New Tab',
          type: 'graphql-request',
          request: {
            method: 'GET',
            url: 'https://api.spacex.land/graphql/',
            body: {
              graphql: {
                query: '{}'
              }
            }
          },
          collectionUid: null
        });
        draft.activeRequestTabUid = uid;
      });
    }

    case actions.SEND_REQUEST: {
      return produce(state, (draft) => {
        const collection = findCollectionByUid(draft.collections, action.collectionUid);

        if(collection) {
          let flattenedItems = flattenItems(collection.items);
          let item = findItem(flattenedItems, action.requestTab.uid);
          
          if(item) {
            item.response = item.response || {};
            item.response.state = 'queued';
            draft.requestQueuedToSend = {
              collectionUid: action.collectionUid,
              request: item
            }
          }
        }
      });
    }

    case actions.SENDING_REQUEST: {
      return produce(state, (draft) => {
        const collection = findCollectionByUid(draft.collections, action.collectionUid);
        console.log('collection');
        console.log(collection);

        if(collection) {
          let flattenedItems = flattenItems(collection.items);
          let item = findItem(flattenedItems, action.itemUid);
          console.log('citemllection');
          console.log(item);
          
          if(item) {
            item.response = item.response || {};
            item.response.state = 'sending';
          }
        }
      });
    }

    case actions.RESPONSE_RECEIVED: {
      return produce(state, (draft) => {
        const collection = findCollectionByUid(draft.collections, action.collectionUid);

        if(collection) {
          let flattenedItems = flattenItems(collection.items);
          let item = findItem(flattenedItems, action.itemUid);
          
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
          draft.activeRequestTabUid = last(draft.requestTabs).uid;
        } else {
          draft.activeRequestTabUid = null;
        }
      });
    }

    case actions.ADD_REQUEST: {
      return produce(state, (draft) => {
        const collection = findCollectionByUid(draft.collections, action.collectionUid);

        if(collection) {
          let flattenedItems = flattenItems(collection.items);
          let item = findItem(flattenedItems, action.itemId);
          
          if(item) {
            if(!isItemARequest(item)) {
              let newRequest =  {
                "uid": nanoid(),
                "depth": 2,
                "name": "Capsules 2",
                "type": "graphql-request",
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
              draft.activeRequestTabUid = newRequest.uid;
              item.items.push(newRequest);
              draft.requestTabs.push({
                uid: newRequest.uid,
                name: newRequest.name,
                method: newRequest.request.method,
                collectionUid: collection.id
              });
            }
          }
        }
      });
    }

    case actions.TOGGLE_LEFT_MENUBAR: {
      return produce(state, (draft) => {
        draft.leftMenuBarOpen = !draft.leftMenuBarOpen;
        draft.asideWidth = draft.leftMenuBarOpen ? 270 : 222;
      });
    }

    default: {
      return state;
    }
  }
}

export default reducer;