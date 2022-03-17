import produce from 'immer';
import {nanoid} from 'nanoid';
import union from 'lodash/union';
import find from 'lodash/find';
import actions from './actions';
import {
  flattenItems,
  findItem,
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
            type: 'folder',
            items: [],
            // todo: this will be autoassigned
            depth: 1
          });
          draft.collectionsToSyncToIdb.push(collection.uid);
        }
      });
    }

    case actions.REQUEST_URL_CHANGED: {
      return produce(state, (draft) => {
        const collection = findCollectionByUid(draft.collections, action.collectionUid);

        if(collection) {
          let flattenedItems = flattenItems(collection.items);
          let item = findItem(flattenedItems, action.itemUid);
          
          if(item) {
            if(!item.draft) {
              item.draft = cloneItem(item);
            }
            item.draft.request.url = action.url;
            updateRequestTabAsChanged(draft.requestTabs, item.uid);
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

    case actions.HOTKEY_SAVE: {
      return produce(state, (draft) => {
        if(!draft.activeRequestTabUid) {
          return;
        }

        // find request tab
        const activeRequestTab = find(draft.requestTabs, (t) => t.uid === draft.activeRequestTabUid);

        // resolve item, save and delete draft
        if(activeRequestTab) {
          const collection = findCollectionByUid(draft.collections, activeRequestTab.collectionUid);

          if(collection) {
            let flattenedItems = flattenItems(collection.items);
            let item = findItem(flattenedItems, activeRequestTab.uid);
            
            if(item && item.draft) {
              item.name = item.draft.name;
              item.request = item.draft.request;
              item.draft = null;
              activeRequestTab.hasChanges = false;
              draft.collectionsToSyncToIdb.push(collection.uid);
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