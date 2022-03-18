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

    default: {
      return state;
    }
  }
}

export default reducer;