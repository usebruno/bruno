import { nanoid } from 'nanoid';
import find from 'lodash/find';
import filter from 'lodash/filter';
import each from 'lodash/each';
import cloneDeep from 'lodash/cloneDeep';
import { createSlice } from '@reduxjs/toolkit'
import { getCollectionsFromIdb, saveCollectionToIdb } from 'utils/idb';
import { sendNetworkRequest } from 'utils/network';
import {
  findCollectionByUid,
  findItemInCollection,
  cloneItem,
  transformCollectionToSaveToIdb,
  addDepth,
  deleteItemInCollection,
  isItemARequest
} from 'utils/collections';

// todo: errors should be tracked in each slice and displayed as toasts

const initialState = {
  collections: []
};

export const collectionsSlice = createSlice({
  name: 'collections',
  initialState,
  reducers: {
    _loadCollections: (state, action) => {
      each(action.payload.collections, (c) => addDepth(c.items));
      state.collections = action.payload.collections;
    },
    _createCollection: (state, action) => {
      state.collections.push(action.payload);
    },
    _requestSent: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if(collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);
        if(item) {
          item.response = item.response || {};
          item.response.state = 'sending';
        }
      }
    },
    _responseReceived: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if(collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);
        if(item) {
          item.response = action.payload.response;
        }
      }
    },
    _saveRequest: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if(collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);
        
        if(item && item.draft) {
          item.request = item.draft.request;
          item.draft = null;
        }
      }
    },
    _newItem: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if(collection) {
        if(!action.payload.currentItemUid) {
          collection.items.push(action.payload.item);
        } else {
          const item = findItemInCollection(collection, action.payload.currentItemUid);

          if(item) {
            item.items = item.items || [];
            item.items.push(action.payload.item);
          }
        }
        addDepth(collection.items);
      }
    },
    _deleteItem: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if(collection) {
        deleteItemInCollection(action.payload.itemUid, collection);
      }
    },
    _renameItem: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if(collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);
        
        if(item) {
          item.name = action.payload.newName;
        }
      }
    },
    collectionClicked: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload);

      if(collection) {
        collection.collapsed = !collection.collapsed;
      }
    },
    collectionFolderClicked: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if(collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if(item && item.type === 'folder') {
          item.collapsed = !item.collapsed;
        }
      }
    },
    requestUrlChanged: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if(collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);
        
        if(item && isItemARequest(item)) {
          if(!item.draft) {
            item.draft = cloneItem(item);
          }
          item.draft.request.url = action.payload.url;
        }
      }
    },
    addRequestHeader: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if(collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);
        
        if(item && isItemARequest(item)) {
          if(!item.draft) {
            item.draft = cloneItem(item);
          }
          item.draft.request.headers = item.draft.request.headers || [];
          item.draft.request.headers.push({
            uid: nanoid(),
            name: '',
            value: '',
            description: '',
            enabled: true
          });
        }
      }
    },
    updateRequestHeader: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if(collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);
        
        if(item && isItemARequest(item)) {
          if(!item.draft) {
            item.draft = cloneItem(item);
          }
          const header = find(item.draft.request.headers, (h) => h.uid === action.payload.header.uid);
          if(header) {
            header.name = action.payload.header.name;
            header.value = action.payload.header.value;
            header.description = action.payload.header.description;
            header.enabled = action.payload.header.enabled;
          }
        }
      }
    },
    deleteRequestHeader: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if(collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);
        
        if(item && isItemARequest(item)) {
          if(!item.draft) {
            item.draft = cloneItem(item);
          }
          item.draft.request.headers = filter(item.draft.request.headers, (h) => h.uid !== action.payload.headerUid);
        }
      }
    }
  }
});

export const {
  _loadCollections,
  _createCollection,
  _requestSent,
  _responseReceived,
  _saveRequest,
  _newItem,
  _deleteItem,
  _renameItem,
  collectionClicked,
  collectionFolderClicked,
  requestUrlChanged,
  addRequestHeader,
  updateRequestHeader,
  deleteRequestHeader
} = collectionsSlice.actions;

export const loadCollectionsFromIdb = () => (dispatch) => {
  getCollectionsFromIdb(window.__idb)
    .then((collections) => dispatch(_loadCollections({
      collections: collections
    })))
    .catch((err) => console.log(err));
};

export const createCollection = (collectionName) => (dispatch) => {
  const newCollection = {
    uid: nanoid(),
    name: collectionName,
    items: [],
    environments: [],
    userId: null
  };

  saveCollectionToIdb(window.__idb, newCollection)
    .then(() => dispatch(_createCollection(newCollection)))
    .catch((err) => console.log(err));
};

export const sendRequest = (item, collectionUid) => (dispatch) => {
  dispatch(_requestSent({
    itemUid: item.uid,
    collectionUid: collectionUid
  }));
  sendNetworkRequest(item)
    .then((response) => dispatch(_responseReceived({
      itemUid: item.uid,
      collectionUid: collectionUid,
      response: response
    })))
    .catch((err) => console.log(err));
};

export const saveRequest = (itemUid, collectionUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  if(collection) {
    const collectionCopy = cloneDeep(collection);
    const collectionToSave = transformCollectionToSaveToIdb(collectionCopy);

    saveCollectionToIdb(window.__idb, collectionToSave)
      .then(() => {
        dispatch(_saveRequest({
          itemUid: itemUid,
          collectionUid: collectionUid
        }));
      })
      .catch((err) => console.log(err));
  }
};

export const newFolder = (folderName, collectionUid, itemUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  if(collection) {
    const collectionCopy = cloneDeep(collection);
    const item = {
      uid: nanoid(),
      name: folderName,
      type: 'folder',
      items: []
    };
    if(!itemUid) {
      collectionCopy.items.push(item);
    } else {
      const currentItem = findItemInCollection(collectionCopy, itemUid);
      if(currentItem && currentItem.type === 'folder') {
        currentItem.items = currentItem.items || [];
        currentItem.items.push(item);
      }
    }
    const collectionToSave = transformCollectionToSaveToIdb(collectionCopy);

    saveCollectionToIdb(window.__idb, collectionToSave)
      .then(() => {
        dispatch(_newItem({
          item: item,
          currentItemUid: itemUid,
          collectionUid: collectionUid
        }));
      })
      .catch((err) => console.log(err));
  }
};

export const newHttpRequest = (requestName, collectionUid, itemUid) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const state = getState();
    const collection = findCollectionByUid(state.collections.collections, collectionUid);
  
    if(collection) {
      const collectionCopy = cloneDeep(collection);
      const uid = nanoid();
      const item = {
        uid: uid,
        name: requestName,
        type: 'http-request',
        request: {
          method: 'GET',
          url: 'https://reqbin.com/echo/get/json',
          headers: [],
          body: null
        }
      };
      if(!itemUid) {
        collectionCopy.items.push(item);
      } else {
        const currentItem = findItemInCollection(collectionCopy, itemUid);
        if(currentItem && currentItem.type === 'folder') {
          currentItem.items = currentItem.items || [];
          currentItem.items.push(item);
        }
      }
      const collectionToSave = transformCollectionToSaveToIdb(collectionCopy);
  
      saveCollectionToIdb(window.__idb, collectionToSave)
        .then(() => {
          Promise.resolve(dispatch(_newItem({
            item: item,
            currentItemUid: itemUid,
            collectionUid: collectionUid
          })))
            .then((val) => resolve(val))
            .catch((err) => reject(err));
        })
        .catch((err) => {
          reject(err);
          console.log(err)
        });
    }
  });
};

export const deleteItem = (itemUid, collectionUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  if(collection) {
    const collectionCopy = cloneDeep(collection);
    deleteItemInCollection(itemUid, collectionCopy);
    const collectionToSave = transformCollectionToSaveToIdb(collectionCopy);

    saveCollectionToIdb(window.__idb, collectionToSave)
      .then(() => {
        dispatch(_deleteItem({
          itemUid: itemUid,
          collectionUid: collectionUid
        }));
      })
      .catch((err) => console.log(err));
  }
};

export const renameItem = (newName, itemUid, collectionUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  if(collection) {
    const collectionCopy = cloneDeep(collection);
    const item = findItemInCollection(collectionCopy, itemUid);
    if(item) {
      item.name = newName;
    }
    const collectionToSave = transformCollectionToSaveToIdb(collectionCopy, {
      ignoreDraft: true
    });

    saveCollectionToIdb(window.__idb, collectionToSave)
      .then(() => {
        dispatch(_renameItem({
          newName: newName,
          itemUid: itemUid,
          collectionUid: collectionUid
        }));
      })
      .catch((err) => console.log(err));
  }
};

export default collectionsSlice.reducer;
