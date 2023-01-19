import path from 'path';
import filter from 'lodash/filter';
import trim from 'lodash/trim';
import { uuid } from 'utils/common';
import cloneDeep from 'lodash/cloneDeep';
import {
  findItemInCollection,
  moveCollectionItem,
  getItemsToResequence,
  moveCollectionItemToRootOfCollection,
  findCollectionByUid,
  recursivelyGetAllItemUids,
  transformCollectionToSaveToIdb,
  transformRequestToSaveToFilesystem,
  findParentItemInCollection,
  findEnvironmentInCollection,
  isItemARequest,
  isItemAFolder,
  refreshUidsInItem,
  interpolateEnvironmentVars
} from 'utils/collections';
import { collectionSchema, itemSchema, environmentSchema, environmentsSchema } from '@usebruno/schema';
import { waitForNextTick } from 'utils/common';
import { saveCollectionToIdb } from 'utils/idb';
import { sendNetworkRequest, cancelNetworkRequest } from 'utils/network';

import {
  requestSent,
  requestCancelled,
  responseReceived,
  newItem as _newItem,
  renameItem as _renameItem,
  cloneItem as _cloneItem,
  deleteItem as _deleteItem,
  saveRequest as _saveRequest,
  selectEnvironment as _selectEnvironment,
  createCollection as _createCollection,
  renameCollection as _renameCollection,
  removeCollection as _removeCollection,
  collectionAddEnvFileEvent as _collectionAddEnvFileEvent
} from './index';

import { closeTabs } from 'providers/ReduxStore/slices/tabs';
import { isLocalCollection, resolveRequestFilename } from 'utils/common/platform';

const PATH_SEPARATOR = path.sep;

export const renameCollection = (newName, collectionUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  if (collection) {
    const collectionCopy = cloneDeep(collection);
    collectionCopy.name = newName;
    const collectionToSave = transformCollectionToSaveToIdb(collectionCopy, {
      ignoreDraft: true
    });

    collectionSchema
      .validate(collectionToSave)
      .then(() => saveCollectionToIdb(window.__idb, collectionToSave))
      .then(() => {
        dispatch(
          _renameCollection({
            newName: newName,
            collectionUid: collectionUid
          })
        );
      })
      .catch((err) => console.log(err));
  }
};

export const saveRequest = (itemUid, collectionUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  return new Promise((resolve, reject) => {
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    const collectionCopy = cloneDeep(collection);
    const item = findItemInCollection(collectionCopy, itemUid);
    if (!item) {
      return reject(new Error('Not able to locate item'));
    }

    const itemToSave = transformRequestToSaveToFilesystem(item);
    const { ipcRenderer } = window;

    itemSchema
      .validate(itemToSave)
      .then(() => ipcRenderer.invoke('renderer:save-request', item.pathname, itemToSave))
      .then(resolve)
      .catch(reject);
  });
};

export const sendRequest = (item, collectionUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);
  const cancelTokenUid = uuid();

  return new Promise((resolve, reject) => {
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    const onRequestSent = (req) => {
      dispatch(
        requestSent({
          requestSent: req,
          itemUid: item.uid,
          collectionUid: collectionUid,
          cancelTokenUid: cancelTokenUid
        })
      );
    };

    const itemCopy = cloneDeep(item);
    const collectionCopy = cloneDeep(collection);

    if (collection.activeEnvironmentUid) {
      const environment = findEnvironmentInCollection(collectionCopy, collection.activeEnvironmentUid);
      if (environment) {
        interpolateEnvironmentVars(itemCopy, environment.variables);
      }
    }

    sendNetworkRequest(itemCopy, { cancelTokenUid: cancelTokenUid }, onRequestSent)
      .then((response) => {
        return dispatch(
          responseReceived({
            itemUid: item.uid,
            collectionUid: collectionUid,
            response: response
          })
        );
      })
      .then(resolve)
      .catch((err) => {
        dispatch(
          responseReceived({
            itemUid: item.uid,
            collectionUid: collectionUid,
            response: null
          })
        );
        console.log('>> sending request failed');
        console.log(err);
        reject(err);
      });
  });
};

export const cancelRequest = (cancelTokenUid, item, collection) => (dispatch) => {
  cancelNetworkRequest(cancelTokenUid)
    .then(() => {
      dispatch(
        requestCancelled({
          itemUid: item.uid,
          collectionUid: collection.uid
        })
      );
    })
    .catch((err) => console.log(err));
};

export const newFolder = (folderName, collectionUid, itemUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  return new Promise((resolve, reject) => {
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    if (!itemUid) {
      const folderWithSameNameExists = find(collection.items, (i) => i.type === 'folder' && trim(i.name) === trim(folderName));
      if (!folderWithSameNameExists) {
        const fullName = `${collection.pathname}${PATH_SEPARATOR}${folderName}`;
        const { ipcRenderer } = window;

        ipcRenderer
          .invoke('renderer:new-folder', fullName)
          .then(() => resolve())
          .catch((error) => reject(error));
      } else {
        return reject(new Error('folder with same name already exists'));
      }
    } else {
      const currentItem = findItemInCollection(collection, itemUid);
      if (currentItem) {
        const folderWithSameNameExists = find(currentItem.items, (i) => i.type === 'folder' && trim(i.name) === trim(folderName));
        if (!folderWithSameNameExists) {
          const fullName = `${currentItem.pathname}${PATH_SEPARATOR}${folderName}`;
          const { ipcRenderer } = window;

          ipcRenderer
            .invoke('renderer:new-folder', fullName)
            .then(() => resolve())
            .catch((error) => reject(error));
        } else {
          return reject(new Error('folder with same name already exists'));
        }
      } else {
        return reject(new Error('unable to find parent folder'));
      }
    }
  });
};

export const renameItem = (newName, itemUid, collectionUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  return new Promise((resolve, reject) => {
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    const collectionCopy = cloneDeep(collection);
    const item = findItemInCollection(collectionCopy, itemUid);
    if (!item) {
      return reject(new Error('Unable to locate item'));
    }

    const dirname = path.dirname(item.pathname);

    let newPathname = '';
    if (item.type === 'folder') {
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
  });
};

export const cloneItem = (newName, itemUid, collectionUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  return new Promise((resolve, reject) => {
    if (!collection) {
      throw new Error('Collection not found');
    }
    const collectionCopy = cloneDeep(collection);
    const item = findItemInCollection(collectionCopy, itemUid);
    if (!item) {
      throw new Error('Unable to locate item');
    }

    if (isItemAFolder(item)) {
      throw new Error('Cloning folders is not supported yet');
    }

    const parentItem = findParentItemInCollection(collectionCopy, itemUid);
    const filename = resolveRequestFilename(newName);
    const itemToSave = refreshUidsInItem(transformRequestToSaveToFilesystem(item));
    itemToSave.name = trim(newName);
    if (!parentItem) {
      const reqWithSameNameExists = find(collection.items, (i) => i.type !== 'folder' && trim(i.filename) === trim(filename));
      if (!reqWithSameNameExists) {
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
      if (!reqWithSameNameExists) {
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
  });
};

export const deleteItem = (itemUid, collectionUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  return new Promise((resolve, reject) => {
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    const item = findItemInCollection(collection, itemUid);
    if (item) {
      const { ipcRenderer } = window;

      ipcRenderer
        .invoke('renderer:delete-item', item.pathname, item.type)
        .then(() => resolve())
        .catch((error) => reject(error));
    }
    return;
  });
};

export const moveItem = (collectionUid, draggedItemUid, targetItemUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  return new Promise((resolve, reject) => {
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    const collectionCopy = cloneDeep(collection);
    const draggedItem = findItemInCollection(collectionCopy, draggedItemUid);
    const targetItem = findItemInCollection(collectionCopy, targetItemUid);

    if (!draggedItem) {
      return reject(new Error('Dragged item not found'));
    }

    if (!targetItem) {
      return reject(new Error('Target item not found'));
    }

    const draggedItemParent = findParentItemInCollection(collectionCopy, draggedItemUid);
    const targetItemParent = findParentItemInCollection(collectionCopy, targetItemUid);
    const sameParent = draggedItemParent === targetItemParent;

    // file item dragged onto another file item and both are in the same folder
    // this is also true when both items are at the root level
    if (isItemARequest(draggedItem) && isItemARequest(targetItem) && sameParent) {
      moveCollectionItem(collectionCopy, draggedItem, targetItem);
      const itemsToResequence = getItemsToResequence(draggedItemParent, collectionCopy);

      return ipcRenderer
        .invoke('renderer:resequence-items', itemsToResequence)
        .then(resolve)
        .catch((error) => reject(error));
    }

    // file item dragged onto another file item which is at the root level
    if (isItemARequest(draggedItem) && isItemARequest(targetItem) && !targetItemParent) {
      const draggedItemPathname = draggedItem.pathname;
      moveCollectionItem(collectionCopy, draggedItem, targetItem);
      const itemsToResequence = getItemsToResequence(draggedItemParent, collectionCopy);
      const itemsToResequence2 = getItemsToResequence(targetItemParent, collectionCopy);

      return ipcRenderer
        .invoke('renderer:move-file-item', draggedItemPathname, collectionCopy.pathname)
        .then(() => ipcRenderer.invoke('renderer:resequence-items', itemsToResequence))
        .then(() => ipcRenderer.invoke('renderer:resequence-items', itemsToResequence2))
        .then(resolve)
        .catch((error) => reject(error));
    }

    // file item dragged onto another file item and both are in different folders
    if (isItemARequest(draggedItem) && isItemARequest(targetItem) && !sameParent) {
      const draggedItemPathname = draggedItem.pathname;
      moveCollectionItem(collectionCopy, draggedItem, targetItem);
      const itemsToResequence = getItemsToResequence(draggedItemParent, collectionCopy);
      const itemsToResequence2 = getItemsToResequence(targetItemParent, collectionCopy);
      console.log('itemsToResequence', itemsToResequence);
      console.log('itemsToResequence2', itemsToResequence2);

      return ipcRenderer
        .invoke('renderer:move-file-item', draggedItemPathname, targetItemParent.pathname)
        .then(() => ipcRenderer.invoke('renderer:resequence-items', itemsToResequence))
        .then(() => ipcRenderer.invoke('renderer:resequence-items', itemsToResequence2))
        .then(resolve)
        .catch((error) => reject(error));
    }

    // file item dragged into its own folder
    if (isItemARequest(draggedItem) && isItemAFolder(targetItem) && draggedItemParent === targetItem) {
      return resolve();
    }

    // file item dragged into another folder
    if (isItemARequest(draggedItem) && isItemAFolder(targetItem) && draggedItemParent !== targetItem) {
      const draggedItemPathname = draggedItem.pathname;
      moveCollectionItem(collectionCopy, draggedItem, targetItem);
      const itemsToResequence = getItemsToResequence(draggedItemParent, collectionCopy);
      const itemsToResequence2 = getItemsToResequence(targetItem, collectionCopy);

      return ipcRenderer
        .invoke('renderer:move-file-item', draggedItemPathname, targetItem.pathname)
        .then(() => ipcRenderer.invoke('renderer:resequence-items', itemsToResequence))
        .then(() => ipcRenderer.invoke('renderer:resequence-items', itemsToResequence2))
        .then(resolve)
        .catch((error) => reject(error));
    }

    // end of the file drags, now let's handle folder drags
    // folder drags are simpler since we don't allow ordering of folders

    // folder dragged into its own folder
    if (isItemAFolder(draggedItem) && isItemAFolder(targetItem) && draggedItemParent === targetItem) {
      return resolve();
    }

    // folder dragged into a file which is at the same level
    // this is also true when both items are at the root level
    if (isItemAFolder(draggedItem) && isItemARequest(targetItem) && sameParent) {
      return resolve();
    }

    // folder dragged into a file which is a child of the folder
    if (isItemAFolder(draggedItem) && isItemARequest(targetItem) && draggedItem === targetItemParent) {
      return resolve();
    }

    // folder dragged into a file which is at the root level
    if (isItemAFolder(draggedItem) && isItemARequest(targetItem) && !targetItemParent) {
      const draggedItemPathname = draggedItem.pathname;

      return ipcRenderer
        .invoke('renderer:move-folder-item', draggedItemPathname, collectionCopy.pathname)
        .then(resolve)
        .catch((error) => reject(error));
    }

    // folder dragged into another folder
    if (isItemAFolder(draggedItem) && isItemAFolder(targetItem) && draggedItemParent !== targetItem) {
      const draggedItemPathname = draggedItem.pathname;

      return ipcRenderer
        .invoke('renderer:move-folder-item', draggedItemPathname, targetItem.pathname)
        .then(resolve)
        .catch((error) => reject(error));
    }
  });
};

export const moveItemToRootOfCollection = (collectionUid, draggedItemUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  return new Promise((resolve, reject) => {
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    const collectionCopy = cloneDeep(collection);
    const draggedItem = findItemInCollection(collectionCopy, draggedItemUid);
    if (!draggedItem) {
      return reject(new Error('Dragged item not found'));
    }

    const draggedItemParent = findParentItemInCollection(collectionCopy, draggedItemUid);
    // file item is already at the root level
    if (!draggedItemParent) {
      return resolve();
    }

    const draggedItemPathname = draggedItem.pathname;
    moveCollectionItemToRootOfCollection(collectionCopy, draggedItem);
    const itemsToResequence = getItemsToResequence(draggedItemParent, collectionCopy);
    const itemsToResequence2 = getItemsToResequence(collectionCopy, collectionCopy);

    return ipcRenderer
      .invoke('renderer:move-file-item', draggedItemPathname, collectionCopy.pathname)
      .then(() => ipcRenderer.invoke('renderer:resequence-items', itemsToResequence))
      .then(() => ipcRenderer.invoke('renderer:resequence-items', itemsToResequence2))
      .then(resolve)
      .catch((error) => reject(error));
  });
};

export const newHttpRequest = (params) => (dispatch, getState) => {
  const { requestName, requestType, requestUrl, requestMethod, collectionUid, itemUid } = params;

  return new Promise((resolve, reject) => {
    const state = getState();
    const collection = findCollectionByUid(state.collections.collections, collectionUid);
    if (!collection) {
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

    const filename = resolveRequestFilename(requestName);
    if (!itemUid) {
      const reqWithSameNameExists = find(collection.items, (i) => i.type !== 'folder' && trim(i.filename) === trim(filename));
      if (!reqWithSameNameExists) {
        const fullName = `${collection.pathname}${PATH_SEPARATOR}${filename}`;
        const { ipcRenderer } = window;

        ipcRenderer.invoke('renderer:new-request', fullName, item).then(resolve).catch(reject);
      } else {
        return reject(new Error(`${requestName} already exists in collection`));
      }
    } else {
      const currentItem = findItemInCollection(collection, itemUid);
      if (currentItem) {
        const reqWithSameNameExists = find(currentItem.items, (i) => i.type !== 'folder' && trim(i.filename) === trim(filename));
        if (!reqWithSameNameExists) {
          const fullName = `${currentItem.pathname}${PATH_SEPARATOR}${filename}`;
          const { ipcRenderer } = window;

          ipcRenderer.invoke('renderer:new-request', fullName, item).then(resolve).catch(reject);
        } else {
          return reject(new Error(`${requestName} already exists in the folder`));
        }
      }
    }
  });
};

export const addEnvironment = (name, collectionUid) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const state = getState();
    const collection = findCollectionByUid(state.collections.collections, collectionUid);
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    ipcRenderer
      .invoke('renderer:create-environment', collection.pathname, name)
      .then(resolve)
      .catch(reject);
  });
};

export const renameEnvironment = (newName, environmentUid, collectionUid) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const state = getState();
    const collection = findCollectionByUid(state.collections.collections, collectionUid);
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    const collectionCopy = cloneDeep(collection);
    const environment = findEnvironmentInCollection(collectionCopy, environmentUid);
    if (!environment) {
      return reject(new Error('Environment not found'));
    }

    const oldName = environment.name;
    environment.name = newName;

    environmentSchema
      .validate(environment)
      .then(() => ipcRenderer.invoke('renderer:rename-environment', collection.pathname, oldName, newName))
      .then(resolve)
      .catch(reject);
  });
};

export const deleteEnvironment = (environmentUid, collectionUid) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const state = getState();
    const collection = findCollectionByUid(state.collections.collections, collectionUid);
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    const collectionCopy = cloneDeep(collection);

    const environment = findEnvironmentInCollection(collectionCopy, environmentUid);
    if (!environment) {
      return reject(new Error('Environment not found'));
    }

    ipcRenderer
      .invoke('renderer:delete-environment', collection.pathname, environment.name)
      .then(resolve)
      .catch(reject);
  });
};

export const saveEnvironment = (variables, environmentUid, collectionUid) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const state = getState();
    const collection = findCollectionByUid(state.collections.collections, collectionUid);
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    const collectionCopy = cloneDeep(collection);
    const environment = findEnvironmentInCollection(collectionCopy, environmentUid);
    if (!environment) {
      return reject(new Error('Environment not found'));
    }

    environment.variables = variables;

    environmentSchema
      .validate(environment)
      .then(() => ipcRenderer.invoke('renderer:save-environment', collection.pathname, environment))
      .then(resolve)
      .catch(reject);
  });
};

export const selectEnvironment = (environmentUid, collectionUid) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const state = getState();
    const collection = findCollectionByUid(state.collections.collections, collectionUid);
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    const collectionCopy = cloneDeep(collection);
    if (environmentUid) {
      const environment = findEnvironmentInCollection(collectionCopy, environmentUid);
      if (!environment) {
        return reject(new Error('Environment not found'));
      }
    }

    dispatch(_selectEnvironment({ environmentUid, collectionUid }));
    resolve();
  });
};

export const removeCollection = (collectionUid) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const state = getState();
    const collection = findCollectionByUid(state.collections.collections, collectionUid);
    if (!collection) {
      return reject(new Error('Collection not found'));
    }
    const { ipcRenderer } = window;
    ipcRenderer
      .invoke('renderer:remove-collection', collection.pathname)
      .then(() => {
        dispatch(
          closeTabs({
            tabUids: recursivelyGetAllItemUids(collection.items)
          })
        );
      })
      .then(waitForNextTick)
      .then(() => {
        dispatch(
          _removeCollection({
            collectionUid: collectionUid
          })
        );
      })
      .then(resolve)
      .catch(reject);
  });
};

export const browseDirectory = () => (dispatch, getState) => {
  const { ipcRenderer } = window;

  return new Promise((resolve, reject) => {
    ipcRenderer.invoke('renderer:browse-directory').then(resolve).catch(reject);
  });
};

export const openCollectionEvent = (uid, pathname, name) => (dispatch, getState) => {
  const collection = {
    version: '1',
    uid: uid,
    name: name,
    pathname: pathname,
    items: []
  };

  return new Promise((resolve, reject) => {
    collectionSchema
      .validate(collection)
      .then(() => dispatch(_createCollection(collection)))
      .then(resolve)
      .catch(reject);
  });
};

export const createCollection = (collectionName, collectionLocation) => () => {
  const { ipcRenderer } = window;

  return new Promise((resolve, reject) => {
    ipcRenderer.invoke('renderer:create-collection', collectionName, collectionLocation).then(resolve).catch(reject);
  });
};

export const openCollection = () => () => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    ipcRenderer.invoke('renderer:open-collection').then(resolve).catch(reject);
  });
};

export const collectionAddEnvFileEvent = (payload) => (dispatch, getState) => {
  const { data: environment, meta } = payload;

  return new Promise((resolve, reject) => {
    const state = getState();
    const collection = findCollectionByUid(state.collections.collections, meta.collectionUid);
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    environmentSchema
      .validate(environment)
      .then(() =>
        dispatch(
          _collectionAddEnvFileEvent({
            environment,
            collectionUid: meta.collectionUid
          })
        )
      )
      .then(resolve)
      .catch(reject);
  });
};

export const importCollection = (collection, collectionLocation) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    ipcRenderer
      .invoke('renderer:import-collection', collection, collectionLocation)
      .then(resolve)
      .catch(reject);
  });
};
