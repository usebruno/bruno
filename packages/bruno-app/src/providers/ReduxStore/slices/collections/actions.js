import path from 'path';
import filter from 'lodash/filter';
import each from 'lodash/each';
import trim from 'lodash/trim';
import toast from 'react-hot-toast';
import { uuid } from 'utils/common';
import cloneDeep from 'lodash/cloneDeep';
import {
  findItemInCollection,
  findCollectionByUid,
  recursivelyGetAllItemUids,
  transformCollectionToSaveToIdb,
  transformRequestToSaveToFilesystem,
  deleteItemInCollection,
  findParentItemInCollection,
  findEnvironmentInCollection,
  isItemAFolder,
  refreshUidsInItem
} from 'utils/collections';
import { collectionSchema, itemSchema } from '@usebruno/schema';
import { waitForNextTick } from 'utils/common';
import { getCollectionsFromIdb, saveCollectionToIdb, deleteCollectionInIdb } from 'utils/idb';
import { sendNetworkRequest, cancelNetworkRequest } from 'utils/network';

import {
  loadCollections,
  requestSent,
  requestCancelled,
  responseReceived,
  newItem as _newItem,
  renameItem as _renameItem,
  cloneItem as _cloneItem,
  deleteItem as _deleteItem,
  saveRequest as _saveRequest,
  addEnvironment as _addEnvironment,
  renameEnvironment as _renameEnvironment,
  deleteEnvironment as _deleteEnvironment,
  saveEnvironment as _saveEnvironment,
  selectEnvironment as _selectEnvironment,
  createCollection as _createCollection,
  renameCollection as _renameCollection,
  deleteCollection as _deleteCollection,
} from './index';

import { closeTabs, addTab } from 'providers/ReduxStore/slices/tabs';
import { addCollectionToWorkspace } from 'providers/ReduxStore/slices/workspaces/actions';
import { isLocalCollection, resolveRequestFilename } from 'utils/common/platform';

const PATH_SEPARATOR = path.sep;

export const loadCollectionsFromIdb = () => (dispatch) => {
  getCollectionsFromIdb(window.__idb)
    .then((collections) => dispatch(loadCollections({
      collections: collections
    })))
    .catch(() => toast.error("Error occured while loading collections from IndexedDB"));
};

export const openLocalCollectionEvent = (uid, pathname) => (dispatch, getState) => {
  const localCollection = {
    uid: uid,
    name: path.basename(pathname),
    pathname: pathname,
    items: []
  };

  return new Promise((resolve, reject) => {
    collectionSchema
      .validate(localCollection)
      .then(() => dispatch(_createCollection(localCollection)))
      .then(resolve)
      .catch(reject);
  });
};

export const createCollection = (collectionName) => (dispatch, getState) => {
  const newCollection = {
    uid: uuid(),
    name: collectionName,
    items: [],
    environments: []
  };

  const requestItem = {
    uid: uuid(),
    type: 'http-request',
    name: 'Untitled',
    request: {
      method: 'GET',
      url: '',
      headers: [],
      params: [],
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

  newCollection.items.push(requestItem)

  const state = getState();
  const { activeWorkspaceUid } = state.workspaces;

  return new Promise((resolve, reject) => {
    collectionSchema
      .validate(newCollection)
      .then(() => saveCollectionToIdb(window.__idb, newCollection))
      .then(() => dispatch(_createCollection(newCollection)))
      .then(waitForNextTick)
      .then(() => dispatch(addCollectionToWorkspace(activeWorkspaceUid, newCollection.uid)))
      .then(waitForNextTick)
      .then(() => dispatch(addTab({
        uid: requestItem.uid,
        collectionUid: newCollection.uid
      })))
      .then(resolve)
      .catch(reject);
  });
};

export const renameCollection = (newName, collectionUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  if(collection) {
    const collectionCopy = cloneDeep(collection);
    collectionCopy.name = newName;
    const collectionToSave = transformCollectionToSaveToIdb(collectionCopy, {
      ignoreDraft: true
    });

    collectionSchema
      .validate(collectionToSave)
      .then(() => saveCollectionToIdb(window.__idb, collectionToSave))
      .then(() => {
        dispatch(_renameCollection({
          newName: newName,
          collectionUid: collectionUid
        }));
      })
      .catch((err) => console.log(err));
  }
};

export const deleteCollection = (collectionUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  return new Promise((resolve, reject) => {
    if(!collection) {
      return reject('collection not found');
    }

    deleteCollectionInIdb(window.__idb, collection.uid)
      .then(() => {
        dispatch(closeTabs({
          tabUids: recursivelyGetAllItemUids(collection.items)
        }));
        dispatch(_deleteCollection({
          collectionUid: collectionUid
        }));
      })
      .then(resolve)
      .catch(reject);
  });
};

export const saveRequest = (itemUid, collectionUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  return new Promise((resolve, reject) => {
    if(!collection) {
      return reject(new Error('Collection not found'));
    }

    if(isLocalCollection(collection)) {
      const item = findItemInCollection(collection, itemUid);
      if(item) {
        const itemToSave = transformRequestToSaveToFilesystem(item);
        const { ipcRenderer } = window;

        itemSchema
          .validate(itemToSave)
          .then(() => ipcRenderer.invoke('renderer:save-request', item.pathname, itemToSave))
          .then(resolve)
          .catch(reject);
      } else {
        reject(new Error("Not able to locate item"));
      }
      return;
    }

    const collectionCopy = cloneDeep(collection);
    const collectionToSave = transformCollectionToSaveToIdb(collectionCopy);

    collectionSchema
      .validate(collectionToSave)
      .then(() => saveCollectionToIdb(window.__idb, collectionToSave))
      .then(() => {
        dispatch(_saveRequest({
          itemUid: itemUid,
          collectionUid: collectionUid
        }));
      })
      .then(() => resolve())
      .catch((error) => reject(error));
  });
};

export const sendRequest = (item, collectionUid) => (dispatch) => {
  const cancelTokenUid = uuid();

  dispatch(requestSent({
    itemUid: item.uid,
    collectionUid: collectionUid,
    cancelTokenUid: cancelTokenUid
  }));

  sendNetworkRequest(item, {cancelTokenUid: cancelTokenUid})
    .then((response) => {
      if(response && response.status !== -1) {
        return dispatch(responseReceived({
          itemUid: item.uid,
          collectionUid: collectionUid,
          response: response
        }));
      }
    })
    .catch((err) => console.log(err));
};

export const cancelRequest = (cancelTokenUid, item, collection) => (dispatch) => {
  cancelNetworkRequest(cancelTokenUid)
    .then(() => {
      dispatch(requestCancelled({
        itemUid: item.uid,
        collectionUid: collection.uid
      }))
    })
    .catch((err) => console.log(err));
};

export const newFolder = (folderName, collectionUid, itemUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  return new Promise((resolve, reject) => {
    if(!collection) {
      return reject(new Error('Collection not found'));
    }

    if(isLocalCollection(collection)) {
      if(!itemUid) {
        const folderWithSameNameExists = find(collection.items, (i) => i.type === 'folder' && trim(i.name) === trim(folderName));
        if(!folderWithSameNameExists) {
          const fullName = `${collection.pathname}${PATH_SEPARATOR}${folderName}`;
          const { ipcRenderer } = window;
  
          ipcRenderer
            .invoke('renderer:new-folder', fullName)
            .then(() => resolve())
            .catch((error) => reject(error));
        } else {
          return reject(new Error("folder with same name already exists"));
        }
      } else {
        const currentItem = findItemInCollection(collection, itemUid);
        if(currentItem) {
          const folderWithSameNameExists = find(currentItem.items, (i) => i.type === 'folder' && trim(i.name) === trim(folderName));
          if(!folderWithSameNameExists) {
            const fullName = `${currentItem.pathname}${PATH_SEPARATOR}${folderName}`;
            const { ipcRenderer } = window;
  
            ipcRenderer
              .invoke('renderer:new-folder', fullName)
              .then(() => resolve())
              .catch((error) => reject(error));
          } else {
            return reject(new Error("folder with same name already exists"));
          }
        } else {
          return reject(new Error("unable to find parent folder"));
        }
      }
      return;
    }

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

    collectionSchema
      .validate(collectionToSave)
      .then(() => saveCollectionToIdb(window.__idb, collectionToSave))
      .then(() => {
        dispatch(_newItem({
          item: item,
          currentItemUid: itemUid,
          collectionUid: collectionUid
        }));
      })
      .then(() => resolve())
      .catch((error) => reject(error));
  });
};

export const renameItem = (newName, itemUid, collectionUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  return new Promise((resolve, reject) => {
    if(!collection) {
      return reject(new Error('Collection not found'));
    }

    const collectionCopy = cloneDeep(collection);
    const item = findItemInCollection(collectionCopy, itemUid);
    if(!item) {
      return reject(new Error("Unable to locate item"));
    }

    if(isLocalCollection(collection)) {
      const dirname = path.dirname(item.pathname);

      let newPathname = '';
      if(item.type === 'folder') {
        newPathname = `${dirname}${PATH_SEPARATOR}${trim(newName)}`;
      } else {
        const filename = resolveRequestFilename(newName);
        newPathname = `${dirname}${PATH_SEPARATOR}${filename}`;
      }
      const { ipcRenderer } = window;
  
      ipcRenderer
        .invoke('renderer:rename-item', item.pathname, newPathname, newName)
        .then(resolve)
        .catch(reject);

      return;
    }

    item.name = newName;
    const collectionToSave = transformCollectionToSaveToIdb(collectionCopy, {
      ignoreDraft: true
    });

    collectionSchema
      .validate(collectionToSave)
      .then(() => saveCollectionToIdb(window.__idb, collectionToSave))
      .then(() => {
        dispatch(_renameItem({
          newName: newName,
          itemUid: itemUid,
          collectionUid: collectionUid
        }));
      })
      .then(() => resolve())
      .catch((error) => reject(error));
  });
};

export const cloneItem = (newName, itemUid, collectionUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  return new Promise((resolve, reject) => {
    if(!collection) {
      throw new Error('Collection not found');
    }
    const collectionCopy = cloneDeep(collection);
    const item = findItemInCollection(collectionCopy, itemUid);
    if(!item) {
      throw new Error('Unable to locate item');
    }

    if(isItemAFolder(item)) {
      throw new Error('Cloning folders is not supported yet');
    }

    if(isLocalCollection(collection)) {
      const parentItem = findParentItemInCollection(collectionCopy, itemUid);
      const filename = resolveRequestFilename(newName);
      const itemToSave = refreshUidsInItem(transformRequestToSaveToFilesystem(item));
      itemToSave.name = trim(newName);
      if(!parentItem) {
        const reqWithSameNameExists = find(collection.items, (i) => i.type !== 'folder' && trim(i.filename) === trim(filename));
        if(!reqWithSameNameExists) {
          const fullName = `${collection.pathname}${PATH_SEPARATOR}${filename}`;
          const { ipcRenderer } = window;
  
          itemSchema
            .validate(itemToSave)
            .then(() => ipcRenderer.invoke('renderer:new-request', fullName, itemToSave))
            .then(resolve)
            .catch(reject);
        } else {
          return reject(new Error(`${requestName} already exists in collection`));
        }
      } else {
        const reqWithSameNameExists = find(parentItem.items, (i) => i.type !== 'folder' && trim(i.filename) === trim(filename));
        if(!reqWithSameNameExists) {
          const dirname = path.dirname(item.pathname);
          const fullName = `${dirname}${PATH_SEPARATOR}${filename}`;
          const { ipcRenderer } = window;

          itemSchema
            .validate(itemToSave)
            .then(() => ipcRenderer.invoke('renderer:new-request', fullName, itemToSave))
            .then(resolve)
            .catch(reject);
        } else {
          return reject(new Error(`${requestName} already exists in the folder`));
        }
      }
      return;
    };

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

    collectionSchema
      .validate(collectionToSave)
      .then(() => saveCollectionToIdb(window.__idb, collectionToSave))
      .then(() => {
        dispatch(_cloneItem({
          parentItemUid: parentItem ? parentItem.uid : null,
          clonedItem: clonedItem,
          collectionUid: collectionUid
        }));
      })
      .then(() => resolve())
      .catch((error) => reject(error));
  });
};

export const deleteItem = (itemUid, collectionUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  return new Promise((resolve, reject) => {
    if(!collection) {
      return reject(new Error('Collection not found'));
    }

    if(isLocalCollection(collection)) {
      const item = findItemInCollection(collection, itemUid);
      if(item) {
        const { ipcRenderer } = window;
  
        ipcRenderer
          .invoke('renderer:delete-item', item.pathname, item.type)
          .then(() => resolve())
          .catch((error) => reject(error));
      }
      return;
    }

    const collectionCopy = cloneDeep(collection);
    deleteItemInCollection(itemUid, collectionCopy);
    const collectionToSave = transformCollectionToSaveToIdb(collectionCopy);

    collectionSchema
      .validate(collectionToSave)
      .then(() => saveCollectionToIdb(window.__idb, collectionToSave))
      .then(() => {
        dispatch(_deleteItem({
          itemUid: itemUid,
          collectionUid: collectionUid
        }));
      })
      .then(() => resolve())
      .catch((error) => reject(error));
  });
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
    if(!collection) {
      return reject(new Error('Collection not found'));
    }

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

    if(isLocalCollection(collection)) {
      const filename = resolveRequestFilename(requestName);
      if(!itemUid) {
        const reqWithSameNameExists = find(collection.items, (i) => i.type !== 'folder' && trim(i.filename) === trim(filename));
        if(!reqWithSameNameExists) {
          const fullName = `${collection.pathname}${PATH_SEPARATOR}${filename}`;
          const { ipcRenderer } = window;
  
          ipcRenderer
            .invoke('renderer:new-request', fullName, item)
            .then(resolve)
            .catch(reject);
        } else {
          return reject(new Error(`${requestName} already exists in collection`));
        }
      } else {
        const currentItem = findItemInCollection(collection, itemUid);
        if(currentItem) {
          const reqWithSameNameExists = find(currentItem.items, (i) => i.type !== 'folder' && trim(i.filename) === trim(filename));
          if(!reqWithSameNameExists) {
            const fullName = `${currentItem.pathname}${PATH_SEPARATOR}${filename}`;
            const { ipcRenderer } = window;
  
            ipcRenderer
              .invoke('renderer:new-request', fullName, item)
              .then(resolve)
              .catch(reject);
          } else {
            return reject(new Error(`${requestName} already exists in the folder`));
          }
        }
      }
      return;
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

    collectionSchema
      .validate(collectionToSave)
      .then(() => saveCollectionToIdb(window.__idb, collectionToSave))
      .then(() => {
        dispatch(_newItem({
          item: item,
          currentItemUid: itemUid,
          collectionUid: collectionUid
        }));
      })
      .then(waitForNextTick)
      .then(() => {
        dispatch(addTab({
          uid: item.uid,
          collectionUid: collection.uid
        }));
      })
      .then(() => resolve())
      .catch(reject);
  });
};

export const addEnvironment =  (name, collectionUid) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const state = getState();
    const collection = findCollectionByUid(state.collections.collections, collectionUid);
    if(!collection) {
      return reject(new Error('Collection not found'));
    }

    const environment = {
      uid: uuid(),
      name: name,
      variables: []
    };

    const collectionCopy = cloneDeep(collection);
    const collectionToSave = transformCollectionToSaveToIdb(collectionCopy);
    collectionToSave.environments = collectionToSave.environments || [];
    collectionToSave.environments.push(environment);

    collectionSchema
      .validate(collectionToSave)
      .then(() => saveCollectionToIdb(window.__idb, collectionToSave))
      .then(() => dispatch(_addEnvironment({environment, collectionUid})))
      .then(resolve)
      .catch(reject);
  });
};

export const renameEnvironment =  (newName, environmentUid, collectionUid) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const state = getState();
    const collection = findCollectionByUid(state.collections.collections, collectionUid);
    if(!collection) {
      return reject(new Error('Collection not found'));
    }

    const collectionCopy = cloneDeep(collection);
    const environment = findEnvironmentInCollection(collectionCopy, environmentUid);
    if(!environment) {
      return reject(new Error('Environment not found'));
    }

    environment.name = newName;

    const collectionToSave = transformCollectionToSaveToIdb(collectionCopy);

    collectionSchema
      .validate(collectionToSave)
      .then(() => saveCollectionToIdb(window.__idb, collectionToSave))
      .then(() => dispatch(_renameEnvironment({newName, environmentUid, collectionUid})))
      .then(resolve)
      .catch(reject);
  });
};

export const deleteEnvironment =  (environmentUid, collectionUid) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const state = getState();
    const collection = findCollectionByUid(state.collections.collections, collectionUid);
    if(!collection) {
      return reject(new Error('Collection not found'));
    }

    const collectionCopy = cloneDeep(collection);
    const environment = findEnvironmentInCollection(collectionCopy, environmentUid);
    if(!environment) {
      return reject(new Error('Environment not found'));
    }

    collectionCopy.environments = filter(collectionCopy.environments, (e) => e.uid !== environmentUid);

    const collectionToSave = transformCollectionToSaveToIdb(collectionCopy);

    collectionSchema
      .validate(collectionToSave)
      .then(() => saveCollectionToIdb(window.__idb, collectionToSave))
      .then(() => dispatch(_deleteEnvironment({environmentUid, collectionUid})))
      .then(resolve)
      .catch(reject);
  });
};

export const saveEnvironment = (variables, environmentUid, collectionUid) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const state = getState();
    const collection = findCollectionByUid(state.collections.collections, collectionUid);
    if(!collection) {
      return reject(new Error('Collection not found'));
    }

    const collectionCopy = cloneDeep(collection);
    const environment = findEnvironmentInCollection(collectionCopy, environmentUid);
    if(!environment) {
      return reject(new Error('Environment not found'));
    }

    environment.variables = variables;

    const collectionToSave = transformCollectionToSaveToIdb(collectionCopy);

    collectionSchema
      .validate(collectionToSave)
      .then(() => saveCollectionToIdb(window.__idb, collectionToSave))
      .then(() => dispatch(_saveEnvironment({variables, environmentUid, collectionUid})))
      .then(resolve)
      .catch(reject);
  });
};

export const selectEnvironment = (environmentUid, collectionUid) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const state = getState();
    const collection = findCollectionByUid(state.collections.collections, collectionUid);
    if(!collection) {
      return reject(new Error('Collection not found'));
    }

    const collectionCopy = cloneDeep(collection);
    if(environmentUid) {
      const environment = findEnvironmentInCollection(collectionCopy, environmentUid);
      if(!environment) {
        return reject(new Error('Environment not found'));
      }
    }

    collectionCopy.activeEnvironmentUid = environmentUid;
    const collectionToSave = transformCollectionToSaveToIdb(collectionCopy);

    collectionSchema
      .validate(collectionToSave)
      .then(() => saveCollectionToIdb(window.__idb, collectionToSave))
      .then(() => dispatch(_selectEnvironment({environmentUid, collectionUid})))
      .then(resolve)
      .catch(reject);
  });
};

export const removeLocalCollection = (collectionUid) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const state = getState();
    const collection = findCollectionByUid(state.collections.collections, collectionUid);
    if(!collection) {
      return reject(new Error('Collection not found'));
    }
    const { ipcRenderer } = window;
    ipcRenderer
      .invoke('renderer:remove-collection', collection.pathname)
      .then(() => {
        dispatch(closeTabs({
          tabUids: recursivelyGetAllItemUids(collection.items)
        }));
      })
      .then(waitForNextTick)
      .then(() => {
        dispatch(_deleteCollection({
          collectionUid: collectionUid
        }));
      })
      .then(resolve)
      .catch(reject);
  });
};