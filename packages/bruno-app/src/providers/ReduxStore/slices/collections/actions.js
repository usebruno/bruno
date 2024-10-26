import { collectionSchema, environmentSchema, itemSchema } from '@usebruno/schema';
import cloneDeep from 'lodash/cloneDeep';
import filter from 'lodash/filter';
import find from 'lodash/find';
import get from 'lodash/get';
import trim from 'lodash/trim';
import path from 'path';
import { insertTaskIntoQueue } from 'providers/ReduxStore/slices/app';
import toast from 'react-hot-toast';
import {
  findCollectionByUid,
  findEnvironmentInCollection,
  findItemInCollection,
  findParentItemInCollection,
  getItemsToResequence,
  isItemAFolder,
  refreshUidsInItem,
  isItemARequest,
  moveCollectionItem,
  moveCollectionItemToRootOfCollection,
  transformRequestToSaveToFilesystem
} from 'utils/collections';
import { uuid, waitForNextTick } from 'utils/common';
import { PATH_SEPARATOR, getDirectoryName } from 'utils/common/platform';
import { cancelNetworkRequest, sendNetworkRequest } from 'utils/network';

import {
  collectionAddEnvFileEvent as _collectionAddEnvFileEvent,
  createCollection as _createCollection,
  removeCollection as _removeCollection,
  selectEnvironment as _selectEnvironment,
  sortCollections as _sortCollections,
  requestCancelled,
  resetRunResults,
  responseReceived,
  updateLastAction,
  setCollectionSecurityConfig
} from './index';

import { each } from 'lodash';
import { closeAllCollectionTabs } from 'providers/ReduxStore/slices/tabs';
import { resolveRequestFilename } from 'utils/common/platform';
import { parsePathParams, parseQueryParams, splitOnFirst } from 'utils/url/index';
import { sendCollectionOauth2Request as _sendCollectionOauth2Request } from 'utils/network/index';
import { name } from 'file-loader';
import slash from 'utils/common/slash';
import { getGlobalEnvironmentVariables } from 'utils/collections/index';
import { findCollectionByPathname, findEnvironmentInCollectionByName } from 'utils/collections/index';

export const renameCollection = (newName, collectionUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  return new Promise((resolve, reject) => {
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    ipcRenderer.invoke('renderer:rename-collection', newName, collection.pathname).then(resolve).catch(reject);
  });
};

export const saveRequest = (itemUid, collectionUid, saveSilently) => (dispatch, getState) => {
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
      .then(() => {
        if (!saveSilently) {
          toast.success('Request saved successfully');
        }
      })
      .then(resolve)
      .catch((err) => {
        toast.error('Failed to save request!');
        reject(err);
      });
  });
};

export const saveMultipleRequests = (items) => (dispatch, getState) => {
  const state = getState();
  const { collections } = state.collections;

  return new Promise((resolve, reject) => {
    const itemsToSave = [];
    each(items, (item) => {
      const collection = findCollectionByUid(collections, item.collectionUid);
      if (collection) {
        const itemToSave = transformRequestToSaveToFilesystem(item);
        const itemIsValid = itemSchema.validateSync(itemToSave);
        if (itemIsValid) {
          itemsToSave.push({
            item: itemToSave,
            pathname: item.pathname
          });
        }
      }
    });

    const { ipcRenderer } = window;

    ipcRenderer
      .invoke('renderer:save-multiple-requests', itemsToSave)
      .then(resolve)
      .catch((err) => {
        toast.error('Failed to save requests!');
        reject(err);
      });
  });
};

export const saveCollectionRoot = (collectionUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  return new Promise((resolve, reject) => {
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    const { ipcRenderer } = window;

    ipcRenderer
      .invoke('renderer:save-collection-root', collection.pathname, collection.root)
      .then(() => toast.success('Collection Settings saved successfully'))
      .then(resolve)
      .catch((err) => {
        toast.error('Failed to save collection settings!');
        reject(err);
      });
  });
};

export const saveFolderRoot = (collectionUid, folderUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);
  const folder = findItemInCollection(collection, folderUid);

  return new Promise((resolve, reject) => {
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    if (!folder) {
      return reject(new Error('Folder not found'));
    }
    console.log(collection);

    const { ipcRenderer } = window;

    const folderData = {
      name: folder.name,
      pathname: folder.pathname,
      root: folder.root
    };
    console.log(folderData);

    ipcRenderer
      .invoke('renderer:save-folder-root', folderData)
      .then(() => toast.success('Folder Settings saved successfully'))
      .then(resolve)
      .catch((err) => {
        toast.error('Failed to save folder settings!');
        reject(err);
      });
  });
};

export const sendCollectionOauth2Request = (collectionUid, itemUid) => (dispatch, getState) => {
  const state = getState();
  const { globalEnvironments, activeGlobalEnvironmentUid } = state.globalEnvironments;  
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  return new Promise((resolve, reject) => {
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    let collectionCopy = cloneDeep(collection);

    // add selected global env variables to the collection object
    const globalEnvironmentVariables = getGlobalEnvironmentVariables({ globalEnvironments, activeGlobalEnvironmentUid });
    collectionCopy.globalEnvironmentVariables = globalEnvironmentVariables;

    const environment = findEnvironmentInCollection(collectionCopy, collection.activeEnvironmentUid);

    _sendCollectionOauth2Request(collection, environment, collectionCopy.runtimeVariables)
      .then((response) => {
        if (response?.data?.error) {
          toast.error(response?.data?.error);
        } else {
          toast.success('Request made successfully');
        }
        return response;
      })
      .then(resolve)
      .catch((err) => {
        toast.error(err.message);
      });
  });
};

export const sendRequest = (item, collectionUid) => (dispatch, getState) => {
  const state = getState();
  const { globalEnvironments, activeGlobalEnvironmentUid } = state.globalEnvironments;  
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  return new Promise((resolve, reject) => {
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    const itemCopy = cloneDeep(item || {});
    let collectionCopy = cloneDeep(collection);

    // add selected global env variables to the collection object
    const globalEnvironmentVariables = getGlobalEnvironmentVariables({ globalEnvironments, activeGlobalEnvironmentUid });
    collectionCopy.globalEnvironmentVariables = globalEnvironmentVariables;

    const environment = findEnvironmentInCollection(collectionCopy, collectionCopy.activeEnvironmentUid);
    sendNetworkRequest(itemCopy, collectionCopy, environment, collectionCopy.runtimeVariables)
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
        if (err && err.message === "Error invoking remote method 'send-http-request': Error: Request cancelled") {
          console.log('>> request cancelled');
          dispatch(
            responseReceived({
              itemUid: item.uid,
              collectionUid: collectionUid,
              response: null
            })
          );
          return;
        }

        const errorResponse = {
          status: 'Error',
          isError: true,
          error: err.message ?? 'Something went wrong',
          size: 0,
          duration: 0
        };

        dispatch(
          responseReceived({
            itemUid: item.uid,
            collectionUid: collectionUid,
            response: errorResponse
          })
        );
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

export const cancelRunnerExecution = (cancelTokenUid) => (dispatch) => {
  cancelNetworkRequest(cancelTokenUid).catch((err) => console.log(err));
};

export const runCollectionFolder = (collectionUid, folderUid, recursive, delay) => (dispatch, getState) => {
  const state = getState();
  const { globalEnvironments, activeGlobalEnvironmentUid } = state.globalEnvironments;  
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  return new Promise((resolve, reject) => {
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    let collectionCopy = cloneDeep(collection);

    // add selected global env variables to the collection object
    const globalEnvironmentVariables = getGlobalEnvironmentVariables({ globalEnvironments, activeGlobalEnvironmentUid });
    collectionCopy.globalEnvironmentVariables = globalEnvironmentVariables;

    const folder = findItemInCollection(collectionCopy, folderUid);

    if (folderUid && !folder) {
      return reject(new Error('Folder not found'));
    }

    const environment = findEnvironmentInCollection(collectionCopy, collection.activeEnvironmentUid);

    dispatch(
      resetRunResults({
        collectionUid: collection.uid
      })
    );

    ipcRenderer
      .invoke(
        'renderer:run-collection-folder',
        folder,
        collectionCopy,
        environment,
        collectionCopy.runtimeVariables,
        recursive,
        delay
      )
      .then(resolve)
      .catch((err) => {
        toast.error(get(err, 'error.message') || 'Something went wrong!');
        reject(err);
      });
  });
};

export const newFolder = (folderName, collectionUid, itemUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  return new Promise((resolve, reject) => {
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    if (!itemUid) {
      const folderWithSameNameExists = find(
        collection.items,
        (i) => i.type === 'folder' && trim(i.name) === trim(folderName)
      );
      if (!folderWithSameNameExists) {
        const fullName = `${collection.pathname}${PATH_SEPARATOR}${folderName}`;
        const { ipcRenderer } = window;

        ipcRenderer
          .invoke('renderer:new-folder', fullName)
          .then(() => resolve())
          .catch((error) => reject(error));
      } else {
        return reject(new Error('Duplicate folder names under same parent folder are not allowed'));
      }
    } else {
      const currentItem = findItemInCollection(collection, itemUid);
      if (currentItem) {
        const folderWithSameNameExists = find(
          currentItem.items,
          (i) => i.type === 'folder' && trim(i.name) === trim(folderName)
        );
        if (!folderWithSameNameExists) {
          const fullName = `${currentItem.pathname}${PATH_SEPARATOR}${folderName}`;
          const { ipcRenderer } = window;

          ipcRenderer
            .invoke('renderer:new-folder', fullName)
            .then(() => resolve())
            .catch((error) => reject(error));
        } else {
          return reject(new Error('Duplicate folder names under same parent folder are not allowed'));
        }
      } else {
        return reject(new Error('unable to find parent folder'));
      }
    }
  });
};

// rename item
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

    const dirname = getDirectoryName(item.pathname);

    let newPathname = '';
    if (item.type === 'folder') {
      newPathname = path.join(dirname, trim(newName));
    } else {
      const filename = resolveRequestFilename(newName);
      newPathname = path.join(dirname, filename);
    }
    const { ipcRenderer } = window;

    ipcRenderer.invoke('renderer:rename-item', slash(item.pathname), newPathname, newName).then(resolve).catch(reject);
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
      const parentFolder = findParentItemInCollection(collection, item.uid) || collection;

      const folderWithSameNameExists = find(
        parentFolder.items,
        (i) => i.type === 'folder' && trim(i.name) === trim(newName)
      );

      if (folderWithSameNameExists) {
        return reject(new Error('Duplicate folder names under same parent folder are not allowed'));
      }

      const collectionPath = `${parentFolder.pathname}${PATH_SEPARATOR}${newName}`;
      ipcRenderer.invoke('renderer:clone-folder', item, collectionPath).then(resolve).catch(reject);
      return;
    }

    const parentItem = findParentItemInCollection(collectionCopy, itemUid);
    const filename = resolveRequestFilename(newName);
    const itemToSave = refreshUidsInItem(transformRequestToSaveToFilesystem(item));
    itemToSave.name = trim(newName);
    if (!parentItem) {
      const reqWithSameNameExists = find(
        collection.items,
        (i) => i.type !== 'folder' && trim(i.filename) === trim(filename)
      );
      if (!reqWithSameNameExists) {
        const fullName = `${collection.pathname}${PATH_SEPARATOR}${filename}`;
        const { ipcRenderer } = window;
        const requestItems = filter(collection.items, (i) => i.type !== 'folder');
        itemToSave.seq = requestItems ? requestItems.length + 1 : 1;

        itemSchema
          .validate(itemToSave)
          .then(() => ipcRenderer.invoke('renderer:new-request', fullName, itemToSave))
          .then(resolve)
          .catch(reject);

        dispatch(
          insertTaskIntoQueue({
            uid: uuid(),
            type: 'OPEN_REQUEST',
            collectionUid,
            itemPathname: fullName
          })
        );
      } else {
        return reject(new Error('Duplicate request names are not allowed under the same folder'));
      }
    } else {
      const reqWithSameNameExists = find(
        parentItem.items,
        (i) => i.type !== 'folder' && trim(i.filename) === trim(filename)
      );
      if (!reqWithSameNameExists) {
        const dirname = getDirectoryName(item.pathname);
        const fullName = path.join(dirname, filename);
        const { ipcRenderer } = window;
        const requestItems = filter(parentItem.items, (i) => i.type !== 'folder');
        itemToSave.seq = requestItems ? requestItems.length + 1 : 1;

        itemSchema
          .validate(itemToSave)
          .then(() => ipcRenderer.invoke('renderer:new-request', fullName, itemToSave))
          .then(resolve)
          .catch(reject);

        dispatch(
          insertTaskIntoQueue({
            uid: uuid(),
            type: 'OPEN_REQUEST',
            collectionUid,
            itemPathname: fullName
          })
        );
      } else {
        return reject(new Error('Duplicate request names are not allowed under the same folder'));
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
        .then(() => {
          resolve();
        })
        .catch((error) => reject(error));
    }
    return;
  });
};

export const sortCollections = (payload) => (dispatch) => {
  dispatch(_sortCollections(payload));
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

    if (isItemAFolder(draggedItem)) {
      return ipcRenderer
        .invoke('renderer:move-folder-item', draggedItemPathname, collectionCopy.pathname)
        .then(resolve)
        .catch((error) => reject(error));
    } else {
      const itemsToResequence = getItemsToResequence(draggedItemParent, collectionCopy);
      const itemsToResequence2 = getItemsToResequence(collectionCopy, collectionCopy);

      return ipcRenderer
        .invoke('renderer:move-file-item', draggedItemPathname, collectionCopy.pathname)
        .then(() => ipcRenderer.invoke('renderer:resequence-items', itemsToResequence))
        .then(() => ipcRenderer.invoke('renderer:resequence-items', itemsToResequence2))
        .then(resolve)
        .catch((error) => reject(error));
    }
  });
};

export const newHttpRequest = (params) => (dispatch, getState) => {
  const { requestName, requestType, requestUrl, requestMethod, collectionUid, itemUid, headers, body, auth } = params;

  return new Promise((resolve, reject) => {
    const state = getState();
    const collection = findCollectionByUid(state.collections.collections, collectionUid);
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    const parts = splitOnFirst(requestUrl, '?');
    const queryParams = parseQueryParams(parts[1]);
    each(queryParams, (urlParam) => {
      urlParam.enabled = true;
      urlParam.type = 'query';
    });

    const pathParams = parsePathParams(requestUrl);
    each(pathParams, (pathParm) => {
      pathParams.enabled = true;
      pathParm.type = 'path';
    });

    const params = [...queryParams, ...pathParams];

    const item = {
      uid: uuid(),
      type: requestType,
      name: requestName,
      request: {
        method: requestMethod,
        url: requestUrl,
        headers: headers ?? [],
        params,
        body: body ?? {
          mode: 'none',
          json: null,
          text: null,
          xml: null,
          sparql: null,
          multipartForm: null,
          formUrlEncoded: null,
          rawFile: null
        },
        auth: auth ?? {
          mode: 'none'
        }
      }
    };

    // itemUid is null when we are creating a new request at the root level
    const filename = resolveRequestFilename(requestName);
    if (!itemUid) {
      const reqWithSameNameExists = find(
        collection.items,
        (i) => i.type !== 'folder' && trim(i.filename) === trim(filename)
      );
      const requestItems = filter(collection.items, (i) => i.type !== 'folder');
      item.seq = requestItems.length + 1;

      if (!reqWithSameNameExists) {
        const fullName = `${collection.pathname}${PATH_SEPARATOR}${filename}`;
        const { ipcRenderer } = window;

        ipcRenderer.invoke('renderer:new-request', fullName, item).then(resolve).catch(reject);
        // task middleware will track this and open the new request in a new tab once request is created
        dispatch(
          insertTaskIntoQueue({
            uid: uuid(),
            type: 'OPEN_REQUEST',
            collectionUid,
            itemPathname: fullName
          })
        );
      } else {
        return reject(new Error('Duplicate request names are not allowed under the same folder'));
      }
    } else {
      const currentItem = findItemInCollection(collection, itemUid);
      if (currentItem) {
        const reqWithSameNameExists = find(
          currentItem.items,
          (i) => i.type !== 'folder' && trim(i.filename) === trim(filename)
        );
        const requestItems = filter(currentItem.items, (i) => i.type !== 'folder');
        item.seq = requestItems.length + 1;
        if (!reqWithSameNameExists) {
          const fullName = `${currentItem.pathname}${PATH_SEPARATOR}${filename}`;
          const { ipcRenderer } = window;

          ipcRenderer.invoke('renderer:new-request', fullName, item).then(resolve).catch(reject);
          // task middleware will track this and open the new request in a new tab once request is created
          dispatch(
            insertTaskIntoQueue({
              uid: uuid(),
              type: 'OPEN_REQUEST',
              collectionUid,
              itemPathname: fullName
            })
          );
        } else {
          return reject(new Error('Duplicate request names are not allowed under the same folder'));
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
      .then(
        dispatch(
          updateLastAction({
            collectionUid,
            lastAction: {
              type: 'ADD_ENVIRONMENT',
              payload: name
            }
          })
        )
      )
      .then(resolve)
      .catch(reject);
  });
};

export const importEnvironment = (name, variables, collectionUid) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const state = getState();
    const collection = findCollectionByUid(state.collections.collections, collectionUid);
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    ipcRenderer
      .invoke('renderer:create-environment', collection.pathname, name, variables)
      .then(
        dispatch(
          updateLastAction({
            collectionUid,
            lastAction: {
              type: 'ADD_ENVIRONMENT',
              payload: name
            }
          })
        )
      )
      .then(resolve)
      .catch(reject);
  });
};

export const copyEnvironment = (name, baseEnvUid, collectionUid) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const state = getState();
    const collection = findCollectionByUid(state.collections.collections, collectionUid);
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    const baseEnv = findEnvironmentInCollection(collection, baseEnvUid);
    if (!collection) {
      return reject(new Error('Environmnent not found'));
    }

    ipcRenderer
      .invoke('renderer:create-environment', collection.pathname, name, baseEnv.variables)
      .then(
        dispatch(
          updateLastAction({
            collectionUid,
            lastAction: {
              type: 'ADD_ENVIRONMENT',
              payload: name
            }
          })
        )
      )
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

    const environmentName = environmentUid 
      ? findEnvironmentInCollection(collectionCopy, environmentUid)?.name 
      : null;

    if (environmentUid && !environmentName) {
      return reject(new Error('Environment not found'));
    }  
    
    ipcRenderer.invoke('renderer:update-ui-state-snapshot', { type: 'COLLECTION_ENVIRONMENT', data: { collectionPath: collection?.pathname, environmentName }});

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
        dispatch(closeAllCollectionTabs({ collectionUid }));
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

export const browseFiles =
  (filters = []) =>
  (dispatch, getState) => {
    const { ipcRenderer } = window;

    return new Promise((resolve, reject) => {
      ipcRenderer.invoke('renderer:browse-files', filters).then(resolve).catch(reject);
    });
  };

  export const browseFile =
  (filters = []) =>
  (dispatch, getState) => {
    const { ipcRenderer } = window;

    return new Promise((resolve, reject) => {
      ipcRenderer.invoke('renderer:browse-file', filters).then(resolve).catch(reject);
    });
  };

export const updateBrunoConfig = (brunoConfig, collectionUid) => (dispatch, getState) => {
  const state = getState();

  const collection = findCollectionByUid(state.collections.collections, collectionUid);
  if (!collection) {
    return reject(new Error('Collection not found'));
  }

  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('renderer:update-bruno-config', brunoConfig, collection.pathname, collectionUid)
      .then(resolve)
      .catch(reject);
  });
};

export const openCollectionEvent = (uid, pathname, brunoConfig) => (dispatch, getState) => {
  const collection = {
    version: '1',
    uid: uid,
    name: brunoConfig.name,
    pathname: pathname,
    items: [],
    runtimeVariables: {},
    brunoConfig: brunoConfig
  };

  return new Promise((resolve, reject) => {
    ipcRenderer.invoke('renderer:get-collection-security-config', pathname).then((securityConfig) => {
      collectionSchema
        .validate(collection)
        .then(() => dispatch(_createCollection({ ...collection, securityConfig })))
        .then(resolve)
        .catch(reject);
    });
  });
};

export const createCollection = (collectionName, collectionFolderName, collectionLocation) => () => {
  const { ipcRenderer } = window;

  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('renderer:create-collection', collectionName, collectionFolderName, collectionLocation)
      .then(resolve)
      .catch(reject);
  });
};
export const cloneCollection = (collectionName, collectionFolderName, collectionLocation, perviousPath) => () => {
  const { ipcRenderer } = window;

  return ipcRenderer.invoke(
    'renderer:clone-collection',
    collectionName,
    collectionFolderName,
    collectionLocation,
    perviousPath
  );
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

    ipcRenderer.invoke('renderer:import-collection', collection, collectionLocation).then(resolve).catch(reject);
  });
};

export const saveCollectionSecurityConfig = (collectionUid, securityConfig) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    const state = getState();
    const collection = findCollectionByUid(state.collections.collections, collectionUid);

    ipcRenderer
      .invoke('renderer:save-collection-security-config', collection?.pathname, securityConfig)
      .then(async () => {
        await dispatch(setCollectionSecurityConfig({ collectionUid, securityConfig }));
        resolve();
      })
      .catch(reject);
  });
};


export const hydrateCollectionWithUiStateSnapshot = (payload) => (dispatch, getState) => {
    const collectionSnapshotData = payload;
    return new Promise((resolve, reject) => {
      const state = getState();
      try {
        if(!collectionSnapshotData) resolve();
        const { pathname, selectedEnvironment } = collectionSnapshotData;
        const collection = findCollectionByPathname(state.collections.collections, pathname);
        const collectionCopy = cloneDeep(collection);
        const collectionUid = collectionCopy?.uid;

        // update selected environment
        if (selectedEnvironment) {
          const environment = findEnvironmentInCollectionByName(collectionCopy, selectedEnvironment);
          if (environment) {
            dispatch(_selectEnvironment({ environmentUid: environment?.uid, collectionUid }));
          }
        }

        // todo: add any other redux state that you want to save
        
        resolve();
      }
      catch(error) {
        reject(error);
      }
    });
  };