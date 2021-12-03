import produce from 'immer';
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
        const collecton = find(draft.collections, (c) => c.id === action.id);

        if(collecton) {
          collecton.collapsed = !collecton.collapsed;
        }
      });
    }

    case actions.SIDEBAR_COLLECTION_ITEM_CLICK: {
      return produce(state, (draft) => {
        const collecton = find(draft.collections, (c) => c.id === action.collectionId);

        if(collecton) {
          let flattenedItems = flattenItems(collecton.items);
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
                  collectionId: collecton.id
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


    case actions.REQUEST_TAB_CLOSE: {
      return produce(state, (draft) => {
        draft.requestTabs = filter(draft.requestTabs, (rt) => rt.id !== action.requestTab.id);

        if(draft.requestTabs && draft.requestTabs.length) {
          draft.activeRequestTabId = draft.requestTabs[0].id;
          console.log(draft.activeRequestTabId);
        } else {
          draft.activeRequestTabId = null;
        }
      });
    }

    default: {
      return state;
    }
  }
}

export default reducer;