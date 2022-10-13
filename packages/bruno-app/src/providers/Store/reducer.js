import produce from 'immer';
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
        const uid = uuid();
        draft.requestTabs.push({
          uid: uid,
          name: 'New Tab',
          type: 'graphql',
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