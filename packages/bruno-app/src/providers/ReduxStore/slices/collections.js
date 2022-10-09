import path from 'path';
import { uuid } from 'utils/common';
import find from 'lodash/find';
import concat from 'lodash/concat';
import filter from 'lodash/filter';
import each from 'lodash/each';
import cloneDeep from 'lodash/cloneDeep';
import { createSlice } from '@reduxjs/toolkit'
import splitOnFirst from 'split-on-first';
import { sendNetworkRequest } from 'utils/network';
import {
  findCollectionByUid,
  findItemInCollection,
  findParentItemInCollection,
  transformCollectionToSaveToIdb,
  addDepth,
  collapseCollection,
  deleteItemInCollection,
  isItemARequest,
  isItemAFolder
} from 'utils/collections';
import { parseQueryParams, stringifyQueryParams } from 'utils/url';
import { getCollectionsFromIdb, saveCollectionToIdb } from 'utils/idb';

// todo: errors should be tracked in each slice and displayed as toasts

const initialState = {
  collections: []
};

const PATH_SEPARATOR = path.sep;

export const collectionsSlice = createSlice({
  name: 'collections',
  initialState,
  reducers: {
    _loadCollections: (state, action) => {
      each(action.payload.collections, (c) => collapseCollection(c));
      each(action.payload.collections, (c) => addDepth(c.items));
      state.collections = action.payload.collections;
    },
    _createCollection: (state, action) => {
      state.collections.push(action.payload);
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
    _cloneItem: (state, action) => {
      const collectionUid = action.payload.collectionUid;
      const clonedItem = action.payload.clonedItem;
      const parentItemUid = action.payload.parentItemUid;
      const collection = findCollectionByUid(state.collections, collectionUid);

      if(collection) {
        if(parentItemUid) {
          const parentItem = findItemInCollection(collection, parentItemUid);
          parentItem.items.push(clonedItem);
        } else {
          collection.items.push(clonedItem);
        }
      }
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
    newEphermalHttpRequest: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if(collection && collection.items && collection.items.length) {
        const item = {
          uid: action.payload.uid,
          name: action.payload.requestName,
          type: action.payload.requestType,
          request: {
            url: action.payload.requestUrl,
            method: action.payload.requestMethod,
            params: [],
            headers: [],
            body: {
              mode: null,
              content: null
            }
          },
          draft: null
        };
        item.draft = cloneDeep(item);
        collection.items.push(item);
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
            item.draft = cloneDeep(item);
          }
          item.draft.request.url = action.payload.url;

          const parts = splitOnFirst(item.draft.request.url, '?');
          const urlParams = parseQueryParams(parts[1]);
          const disabledParams = filter(item.draft.request.params, (p) => !p.enabled);
          let enabledParams = filter(item.draft.request.params, (p) => p.enabled);

          // try and connect as much as old params uid's as possible
          each(urlParams, (urlParam) => {
            const existingParam = find(enabledParams, (p) => p.name === urlParam.name || p.value === urlParam.value);
            urlParam.uid = existingParam ? existingParam.uid : uuid();
            urlParam.enabled = true;

            // once found, remove it - trying our best here to accomodate duplicate query params
            if(existingParam) {
              enabledParams = filter(enabledParams, (p) => p.uid !== existingParam.uid);
            }
          });

          // ultimately params get replaced with params in url + the disabled ones that existed prior
          // the query params are the source of truth, the url in the queryurl input gets constructed using these params
          // we however are also storing the full url (with params) in the url itself
          item.draft.request.params = concat(urlParams, disabledParams);
        }
      }
    },
    addQueryParam: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if(collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);
        
        if(item && isItemARequest(item)) {
          if(!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.request.params = item.draft.request.params || [];
          item.draft.request.params.push({
            uid: uuid(),
            name: '',
            value: '',
            description: '',
            enabled: true
          });
        }
      }
    },
    updateQueryParam: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if(collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);
        
        if(item && isItemARequest(item)) {
          if(!item.draft) {
            item.draft = cloneDeep(item);
          }
          const param = find(item.draft.request.params, (h) => h.uid === action.payload.param.uid);
          if(param) {
            param.name = action.payload.param.name;
            param.value = action.payload.param.value;
            param.description = action.payload.param.description;
            param.enabled = action.payload.param.enabled;

            // update request url
            const parts = splitOnFirst(item.draft.request.url, '?');
            const query = stringifyQueryParams(filter(item.draft.request.params, p => p.enabled));

            // if no query is found, then strip the query params in url
            if(!query || !query.length) {
              if(parts.length) {
                item.draft.request.url = parts[0];
              }
              return;
            }

            // if no parts were found, then append the query
            if(!parts.length) {
              item.draft.request.url += '?' + query;
              return;
            }

            // control reaching here means the request has parts and query is present
            item.draft.request.url = parts[0] + '?' + query;
          }
        }
      }
    },
    deleteQueryParam: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if(collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);
        
        if(item && isItemARequest(item)) {
          if(!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.request.params = filter(item.draft.request.params, (p) => p.uid !== action.payload.paramUid);

          // update request url
          const parts = splitOnFirst(item.draft.request.url, '?');
          const query = stringifyQueryParams(filter(item.draft.request.params, p => p.enabled));
          if(query && query.length) {
            item.draft.request.url = parts[0] + '?' + query;
          } else {
            item.draft.request.url = parts[0];
          }
        }
      }
    },
    addRequestHeader: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if(collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);
        
        if(item && isItemARequest(item)) {
          if(!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.request.headers = item.draft.request.headers || [];
          item.draft.request.headers.push({
            uid: uuid(),
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
            item.draft = cloneDeep(item);
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
            item.draft = cloneDeep(item);
          }
          item.draft.request.headers = filter(item.draft.request.headers, (h) => h.uid !== action.payload.headerUid);
        }
      }
    },
    addFormUrlEncodedParam: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if(collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);
        
        if(item && isItemARequest(item)) {
          if(!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.request.body.formUrlEncoded = item.draft.request.body.formUrlEncoded || [];
          item.draft.request.body.formUrlEncoded.push({
            uid: uuid(),
            name: '',
            value: '',
            description: '',
            enabled: true
          });
        }
      }
    },
    updateFormUrlEncodedParam: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if(collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);
        
        if(item && isItemARequest(item)) {
          if(!item.draft) {
            item.draft = cloneDeep(item);
          }
          const param = find(item.draft.request.body.formUrlEncoded, (p) => p.uid === action.payload.param.uid);
          if(param) {
            param.name = action.payload.param.name;
            param.value = action.payload.param.value;
            param.description = action.payload.param.description;
            param.enabled = action.payload.param.enabled;
          }
        }
      }
    },
    deleteFormUrlEncodedParam: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if(collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);
        
        if(item && isItemARequest(item)) {
          if(!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.request.body.formUrlEncoded = filter(item.draft.request.body.formUrlEncoded, (p) => p.uid !== action.payload.paramUid);
        }
      }
    },
    addMultipartFormParam: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if(collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);
        
        if(item && isItemARequest(item)) {
          if(!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.request.body.multipartForm = item.draft.request.body.multipartForm || [];
          item.draft.request.body.multipartForm.push({
            uid: uuid(),
            name: '',
            value: '',
            description: '',
            enabled: true
          });
        }
      }
    },
    updateMultipartFormParam: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if(collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);
        
        if(item && isItemARequest(item)) {
          if(!item.draft) {
            item.draft = cloneDeep(item);
          }
          const param = find(item.draft.request.body.multipartForm, (p) => p.uid === action.payload.param.uid);
          if(param) {
            param.name = action.payload.param.name;
            param.value = action.payload.param.value;
            param.description = action.payload.param.description;
            param.enabled = action.payload.param.enabled;
          }
        }
      }
    },
    deleteMultipartFormParam: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if(collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);
        
        if(item && isItemARequest(item)) {
          if(!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.request.body.multipartForm = filter(item.draft.request.body.multipartForm, (p) => p.uid !== action.payload.paramUid);
        }
      }
    },
    updateRequestBodyMode: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if(collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);
        
        if(item && isItemARequest(item)) {
          if(!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.request.body.mode = action.payload.mode;
        }
      }
    },
    updateRequestBody: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if(collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);
        
        if(item && isItemARequest(item)) {
          if(!item.draft) {
            item.draft = cloneDeep(item);
          }
          switch(item.draft.request.body.mode) {
            case 'json': {
              item.draft.request.body.json = action.payload.content;
              break;
            }
            case 'text': {
              item.draft.request.body.text = action.payload.content;
              break;
            }
            case 'xml': {
              item.draft.request.body.xml = action.payload.content;
              break;
            }
            case 'formUrlEncoded': {
              item.draft.request.body.formUrlEncoded = action.payload.content;
              break;
            }
            case 'multipartForm': {
              item.draft.request.body.multipartForm = action.payload.content;
              break;
            }
          }
        }
      }
    },
    updateRequestMethod: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if(collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);
        
        if(item && isItemARequest(item)) {
          if(!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.request.method = action.payload.method;
        }
      }
    }
  }
});

export const {
  _createCollection,
  _loadCollections,
  _newItem,
  _deleteItem,
  _renameItem,
  _cloneItem,
  _requestSent,
  _responseReceived,
  _saveRequest,
  newEphermalHttpRequest,
  collectionClicked,
  collectionFolderClicked,
  requestUrlChanged,
  addQueryParam,
  updateQueryParam,
  deleteQueryParam,
  addRequestHeader,
  updateRequestHeader,
  deleteRequestHeader,
  addFormUrlEncodedParam,
  updateFormUrlEncodedParam,
  deleteFormUrlEncodedParam,
  addMultipartFormParam,
  updateMultipartFormParam,
  deleteMultipartFormParam,
  updateRequestBodyMode,
  updateRequestBody,
  updateRequestMethod
} = collectionsSlice.actions;

export const loadCollectionsFromIdb = () => (dispatch) => {
  console.log('here');
  getCollectionsFromIdb(window.__idb)
    .then((collections) => dispatch(_loadCollections({
      collections: collections
    })))
    .catch((err) => console.log(err));
};

export const createCollection = (collectionName) => (dispatch) => {
  const newCollection = {
    uid: uuid(),
    name: collectionName,
    items: [],
    environments: [],
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

  
  return new Promise((resolve, reject) => {
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
        .then(() => resolve())
        .catch((error) => reject(error));
    }
  });
};

export const newFolder = (folderName, collectionUid, itemUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  if(collection) {
    const collectionCopy = cloneDeep(collection);
    const item = {
      uid: uuid(),
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

export const newHttpRequest = (params) => (dispatch, getState) => {
  const {
    requestName,
    requestType,
    requestUrl,
    requestMethod,
    collectionUid,
    itemUid
  } = params;
  return new Promise((resolve, reject) => {
    const state = getState();
    const collection = findCollectionByUid(state.collections.collections, collectionUid);

    if(collection) {
      const collectionCopy = cloneDeep(collection);
      const item = {
        uid: uuid(),
        type: requestType,
        name: requestName,
        request: {
          method: requestMethod,
          url: requestUrl,
          headers: [],
          body: {
            mode: 'none',
            json: null,
            text: null,
            xml: null,
            multipartForm: null,
            formUrlEncoded: null
          }
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

  return new Promise((resolve, reject) => {
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
        .then(() => resolve())
        .catch((error) => reject(error));
    }
  });
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

export const cloneItem = (newName, itemUid, collectionUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  if(collection) {
    const collectionCopy = cloneDeep(collection);
    const item = findItemInCollection(collectionCopy, itemUid);
    if(!item) {
      return;
    }

    if(isItemAFolder(item)) {
      throw new Error('Cloning folders is not supported yet');
    }

    // todo: clone query params
    const clonedItem = cloneDeep(item);
    clonedItem.name = newName;
    clonedItem.uid = uuid();
    each(clonedItem.headers, h => h.uid = uuid());

    const parentItem = findParentItemInCollection(collectionCopy, itemUid);

    if(!parentItem) {
      collectionCopy.items.push(clonedItem);
    } else {
      parentItem.items.push(clonedItem);
    }

    const collectionToSave = transformCollectionToSaveToIdb(collectionCopy);

    saveCollectionToIdb(window.__idb, collectionToSave)
      .then(() => {
        dispatch(_cloneItem({
          parentItemUid: parentItem ? parentItem.uid : null,
          clonedItem: clonedItem,
          collectionUid: collectionUid
        }));
      })
      .catch((err) => console.log(err));
  }
};

export const removeCollection = (collectionPath) => () => {
  console.log('removeCollection');
};

export default collectionsSlice.reducer;
