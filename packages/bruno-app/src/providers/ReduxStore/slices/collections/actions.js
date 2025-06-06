import { collectionSchema, environmentSchema, itemSchema } from '@usebruno/schema';
import cloneDeep from 'lodash/cloneDeep';
import filter from 'lodash/filter';
import find from 'lodash/find';
import get from 'lodash/get';
import set from 'lodash/set';
import trim from 'lodash/trim';
import path from 'utils/common/path';
import { insertTaskIntoQueue } from 'providers/ReduxStore/slices/app';
import toast from 'react-hot-toast';
import {
  findCollectionByUid,
  findEnvironmentInCollection,
  findItemInCollection,
  findParentItemInCollection,
  isItemAFolder,
  refreshUidsInItem,
  isItemARequest,
  transformRequestToSaveToFilesystem
} from 'utils/collections';
import { uuid, waitForNextTick } from 'utils/common';
import { cancelNetworkRequest, sendNetworkRequest } from 'utils/network';
import { callIpc } from 'utils/common/ipc';

import {
  collectionAddEnvFileEvent as _collectionAddEnvFileEvent,
  createCollection as _createCollection,
  removeCollection as _removeCollection,
  selectEnvironment as _selectEnvironment,
  sortCollections as _sortCollections,
  updateCollectionMountStatus,
  moveCollection,
  requestCancelled,
  resetRunResults,
  responseReceived,
  updateLastAction,
  setCollectionSecurityConfig,
  setRequestStartTime,
  collectionAddOauth2CredentialsByUrl,
  collectionClearOauth2CredentialsByUrl
} from './index';

import { each } from 'lodash';
import { closeAllCollectionTabs } from 'providers/ReduxStore/slices/tabs';
import { resolveRequestFilename } from 'utils/common/platform';
import { parsePathParams, parseQueryParams, splitOnFirst } from 'utils/url/index';
import { sendCollectionOauth2Request as _sendCollectionOauth2Request } from 'utils/network/index';
import { getGlobalEnvironmentVariables, findCollectionByPathname, findEnvironmentInCollectionByName, getReorderedItemsInTargetDirectory, resetSequencesInFolder, getReorderedItemsInSourceDirectory, calculateDraggedItemNewPathname } from 'utils/collections/index';
import { sanitizeName } from 'utils/common/regex';
import { safeParseJSON, safeStringifyJSON } from 'utils/common/index';

export const renameCollection = (newName, collectionUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  return new Promise((resolve, reject) => {
    if (!collection) {
      return reject(new Error('Collection not found'));
    }
    const { ipcRenderer } = window;
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
  console.log("state collection value", state.collections.collections)
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

    const { ipcRenderer } = window;

    const folderData = {
      name: folder.name,
      pathname: folder.pathname,
      root: folder.root
    };

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

    _sendCollectionOauth2Request(collectionCopy, environment, collectionCopy.runtimeVariables)
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

  dispatch(setRequestStartTime({
    itemUid: item.uid,
    collectionUid: collectionUid,
    timestamp: Date.now()
  }));

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
        // Ensure any timestamps in the response are converted to numbers
        const serializedResponse = {
          ...response,
          timeline: response.timeline?.map(entry => ({
            ...entry,
            timestamp: entry.timestamp instanceof Date ? entry.timestamp.getTime() : entry.timestamp
          }))
        };

        return dispatch(
          responseReceived({
            itemUid: item.uid,
            collectionUid: collectionUid,
            response: serializedResponse
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

    const { ipcRenderer } = window;
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

export const newFolder = (folderName, directoryName, collectionUid, itemUid) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);
  const parentItem = itemUid ? findItemInCollection(collection, itemUid) : collection;
  const items = filter(parentItem.items, (i) => isItemAFolder(i) || isItemARequest(i));

  return new Promise((resolve, reject) => {
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    if (!itemUid) {
      const folderWithSameNameExists = find(
        collection.items,
        (i) => i.type === 'folder' && trim(i.filename) === trim(directoryName)
      );
      if (!folderWithSameNameExists) {
        const fullName = path.join(collection.pathname, directoryName);
        const { ipcRenderer } = window;
        ipcRenderer
          .invoke('renderer:new-folder', fullName)
          .then(async () => {
            const folderData = {
              name: folderName,
              pathname: fullName,
              root: {
                meta: {
                  name: folderName,
                  seq: items?.length + 1 
                },
                request: {
                  auth: {
                    mode: 'inherit'
                  }
                }
              }
            };
            ipcRenderer
              .invoke('renderer:save-folder-root', folderData)
              .then(resolve)
              .catch((err) => {
                toast.error('Failed to save folder settings!');
                reject(err);
              });
          })
          .catch((error) => reject(error));
      } else {
        return reject(new Error('Duplicate folder names under same parent folder are not allowed'));
      }
    } else {
      const currentItem = findItemInCollection(collection, itemUid);
      if (currentItem) {
        const folderWithSameNameExists = find(
          currentItem.items,
          (i) => i.type === 'folder' && trim(i.filename) === trim(directoryName)
        );
        if (!folderWithSameNameExists) {
          const fullName = path.join(currentItem.pathname, directoryName);
          const { ipcRenderer } = window;

          ipcRenderer
            .invoke('renderer:new-folder', fullName)
            .then(async () => {
              const folderData = {
                name: folderName,
                pathname: fullName,
                root: {
                  meta: {
                    name: folderName,
                    seq: items?.length + 1 
                  },
                  request: {
                    auth: {
                      mode: 'inherit'
                    }
                  }
                }
              };
              ipcRenderer
                .invoke('renderer:save-folder-root', folderData)
                .then(resolve)
                .catch((err) => {
                  toast.error('Failed to save folder settings!');
                  reject(err);
                });
            })
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

export const renameItem = ({ newName, newFilename, itemUid, collectionUid }) => (dispatch, getState) => {
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

    const { ipcRenderer } = window;

    const renameName = async () => {
      return ipcRenderer.invoke('renderer:rename-item-name', { itemPath: item.pathname, newName })
        .catch((err) => {
          toast.error('Failed to rename the item name');
          console.error(err);
          throw new Error('Failed to rename the item name');
        });
    };

    const renameFile = async () => {
      const dirname = path.dirname(item.pathname);
      let newPath = '';
      if (item.type === 'folder') {
        newPath = path.join(dirname, trim(newFilename));
      } else {
        const filename = resolveRequestFilename(newFilename);
        newPath = path.join(dirname, filename);
      }

      return ipcRenderer.invoke('renderer:rename-item-filename', { oldPath: item.pathname, newPath, newName, newFilename })
        .catch((err) => {
          toast.error('Failed to rename the file');
          console.error(err);
          throw new Error('Failed to rename the file');
        });
    };

    let renameOperation = null;
    if (newName) renameOperation = renameName;
    if (newFilename) renameOperation = renameFile;

    if (!renameOperation) {
      resolve();
    }

    renameOperation()
      .then(() => {
        toast.success('Item renamed successfully');
        resolve();
      })
      .catch((err) => reject(err));
  });
};

export const cloneItem = (newName, newFilename, itemUid, collectionUid) => (dispatch, getState) => {
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
        (i) => i.type === 'folder' && trim(i?.filename) === trim(newFilename)
      );

      if (folderWithSameNameExists) {
        return reject(new Error('Duplicate folder names under same parent folder are not allowed'));
      }

      set(item, 'name', newName);
      set(item, 'filename', newFilename);
      set(item, 'root.meta.name', newName);
      set(item, 'root.meta.seq', parentFolder?.items?.length + 1);

      const collectionPath = path.join(parentFolder.pathname, newFilename);

      const { ipcRenderer } = window;
      ipcRenderer.invoke('renderer:clone-folder', item, collectionPath).then(resolve).catch(reject);
      return;
    }

    const parentItem = findParentItemInCollection(collectionCopy, itemUid);
    const filename = resolveRequestFilename(newFilename);
    const itemToSave = refreshUidsInItem(transformRequestToSaveToFilesystem(item));
    set(itemToSave, 'name', trim(newName));
    set(itemToSave, 'filename', trim(filename));
    if (!parentItem) {
      const reqWithSameNameExists = find(
        collection.items,
        (i) => i.type !== 'folder' && trim(i.filename) === trim(filename)
      );
      if (!reqWithSameNameExists) {
        const fullPathname = path.join(collection.pathname, filename);
        const { ipcRenderer } = window;
        const requestItems = filter(collection.items, (i) => i.type !== 'folder');
        itemToSave.seq = requestItems ? requestItems.length + 1 : 1;

        itemSchema
          .validate(itemToSave)
          .then(() => ipcRenderer.invoke('renderer:new-request', fullPathname, itemToSave))
          .then(resolve)
          .catch(reject);

        dispatch(
          insertTaskIntoQueue({
            uid: uuid(),
            type: 'OPEN_REQUEST',
            collectionUid,
            itemPathname: fullPathname
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
        const dirname = path.dirname(item.pathname);
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

export const moveItem = ({ targetDirname, sourcePathname }) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    ipcRenderer.invoke('renderer:move-item', { targetDirname, sourcePathname })
      .then(resolve)
      .catch(reject);
  });
}

export const handleCollectionItemDrop = ({ targetItem, draggedItem, dropType, collectionUid }) => (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);
  const { uid: draggedItemUid, pathname: draggedItemPathname } = draggedItem;
  const { uid: targetItemUid, pathname: targetItemPathname } = targetItem;
  const targetItemDirectory = findParentItemInCollection(collection, targetItemUid) || collection;
  const targetItemDirectoryItems = cloneDeep(targetItemDirectory.items);
  const draggedItemDirectory = findParentItemInCollection(collection, draggedItemUid) || collection;
  const draggedItemDirectoryItems = cloneDeep(draggedItemDirectory.items);

  const handleMoveToNewLocation = async ({ draggedItem, draggedItemDirectoryItems, targetItem, targetItemDirectoryItems, newPathname, dropType }) => {
    const { uid: targetItemUid } = targetItem;
    const { pathname: draggedItemPathname, uid: draggedItemUid } = draggedItem;

    const newDirname = path.dirname(newPathname);
    await dispatch(moveItem({
      targetDirname: newDirname,
      sourcePathname: draggedItemPathname
    }));

    // Update sequences in the source directory
    if (draggedItemDirectoryItems?.length) {
      // reorder items in the source directory
      const draggedItemDirectoryItemsWithoutDraggedItem = draggedItemDirectoryItems.filter(i => i.uid !== draggedItemUid);
      const reorderedSourceItems = getReorderedItemsInSourceDirectory({ items: draggedItemDirectoryItemsWithoutDraggedItem });
      if (reorderedSourceItems?.length) {
        await dispatch(updateItemsSequences({ itemsToResequence: reorderedSourceItems }));
      }
    }

    // Update sequences in the target directory (if dropping adjacent)
    if (dropType === 'adjacent') {
      const targetItemSequence = targetItemDirectoryItems.findIndex(i => i.uid === targetItemUid)?.seq;

      const draggedItemWithNewPathAndSequence = {
        ...draggedItem,
        pathname: newPathname,
        seq: targetItemSequence
      };

      // draggedItem is added to the targetItem's directory
      const reorderedTargetItems = getReorderedItemsInTargetDirectory({
        items: [...targetItemDirectoryItems, draggedItemWithNewPathAndSequence],
        targetItemUid,
        draggedItemUid
      });

      if (reorderedTargetItems?.length) {
        await dispatch(updateItemsSequences({ itemsToResequence: reorderedTargetItems }));
      }
    }
  };

  const handleReorderInSameLocation = async ({ draggedItem, targetItem, targetItemDirectoryItems }) => {
    const { uid: targetItemUid } = targetItem;
    const { uid: draggedItemUid } = draggedItem;

    // reorder items in the targetItem's directory
    const reorderedItems = getReorderedItemsInTargetDirectory({
      items: targetItemDirectoryItems,
      targetItemUid,
      draggedItemUid
    });

    if (reorderedItems?.length) {
      await dispatch(updateItemsSequences({ itemsToResequence: reorderedItems }));
    }
  };

  return new Promise(async (resolve, reject) => {
    try {
      const newPathname = calculateDraggedItemNewPathname({ draggedItem, targetItem, dropType, collectionPathname: collection.pathname });
      if (!newPathname) return;
      if (targetItemPathname?.startsWith(draggedItemPathname)) return;
      if (newPathname !== draggedItemPathname) {
        await handleMoveToNewLocation({ targetItem, targetItemDirectoryItems, draggedItem, draggedItemDirectoryItems, newPathname, dropType });
      } else {
        await handleReorderInSameLocation({ draggedItem, targetItemDirectoryItems, targetItem });
      }
      resolve();
    } catch (error) {
      console.error(error);
      toast.error(error?.message);
      reject(error);
    }
  })
}

export const updateItemsSequences = ({ itemsToResequence }) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    ipcRenderer.invoke('renderer:resequence-items', itemsToResequence)
      .then(resolve)
      .catch(reject);
  });
}

export const newHttpRequest = (params) => (dispatch, getState) => {
  const { requestName, filename, requestType, requestUrl, requestMethod, collectionUid, itemUid, headers, body, auth } = params;

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
      filename,
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
          file: null
        },
        auth: auth ?? {
          mode: 'inherit'
        }
      }
    };

    // itemUid is null when we are creating a new request at the root level
    const resolvedFilename = resolveRequestFilename(filename);
    if (!itemUid) {
      const reqWithSameNameExists = find(
        collection.items,
        (i) => i.type !== 'folder' && trim(i.filename) === trim(resolvedFilename)
      );
      const items = filter(collection.items, (i) => isItemAFolder(i) || isItemARequest(i));
      item.seq = items.length + 1;

      if (!reqWithSameNameExists) {
        const fullName = path.join(collection.pathname, resolvedFilename);
        const { ipcRenderer } = window;

        ipcRenderer.invoke('renderer:new-request', fullName, item).then(() => {
          // task middleware will track this and open the new request in a new tab once request is created
          dispatch(
            insertTaskIntoQueue({
              uid: uuid(),
              type: 'OPEN_REQUEST',
              collectionUid,
              itemPathname: fullName
            })
          );
          resolve();
        }).catch(reject);
      } else {
        return reject(new Error('Duplicate request names are not allowed under the same folder'));
      }
    } else {
      const currentItem = findItemInCollection(collection, itemUid);
      if (currentItem) {
        const reqWithSameNameExists = find(
          currentItem.items,
          (i) => i.type !== 'folder' && trim(i.filename) === trim(resolvedFilename)
        );
        const items = filter(currentItem.items, (i) => isItemAFolder(i) || isItemARequest(i));
        item.seq = items.length + 1;
        if (!reqWithSameNameExists) {
          const fullName = path.join(currentItem.pathname, resolvedFilename);
          const { ipcRenderer } = window;
          ipcRenderer.invoke('renderer:new-request', fullName, item).then(() => {
            // task middleware will track this and open the new request in a new tab once request is created
            dispatch(
              insertTaskIntoQueue({
                uid: uuid(),
                type: 'OPEN_REQUEST',
                collectionUid,
                itemPathname: fullName
              })
            );
            resolve();
          }).catch(reject);
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

    const { ipcRenderer } = window;
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

    const sanitizedName = sanitizeName(name);

    const { ipcRenderer } = window;
    ipcRenderer
      .invoke('renderer:create-environment', collection.pathname, sanitizedName, variables)
      .then(
        dispatch(
          updateLastAction({
            collectionUid,
            lastAction: {
              type: 'ADD_ENVIRONMENT',
              payload: sanitizedName
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
      return reject(new Error('Environment not found'));
    }

    const sanitizedName = sanitizeName(name);

    const { ipcRenderer } = window;
    ipcRenderer
      .invoke('renderer:create-environment', collection.pathname, sanitizedName, baseEnv.variables)
      .then(
        dispatch(
          updateLastAction({
            collectionUid,
            lastAction: {
              type: 'ADD_ENVIRONMENT',
              payload: sanitizedName
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

    const sanitizedName = sanitizeName(newName);
    const oldName = environment.name;
    environment.name = sanitizedName;

    const { ipcRenderer } = window;
    environmentSchema
      .validate(environment)
      .then(() => ipcRenderer.invoke('renderer:rename-environment', collection.pathname, oldName, sanitizedName))
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

    const { ipcRenderer } = window;
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

    const { ipcRenderer } = window;
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

    const { ipcRenderer } = window;
    ipcRenderer.invoke('renderer:update-ui-state-snapshot', { type: 'COLLECTION_ENVIRONMENT', data: { collectionPath: collection?.pathname, environmentName } });

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
  (filters, properties) =>
    (_dispatch, _getState) => {
      const { ipcRenderer } = window;

      return new Promise((resolve, reject) => {
        ipcRenderer
          .invoke('renderer:browse-files', filters, properties)
          .then(resolve)
          .catch(reject);
      });
    };

export const updateBrunoConfig = (brunoConfig, collectionUid) => (dispatch, getState) => {
  const state = getState();

  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  return new Promise((resolve, reject) => {
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    const { ipcRenderer } = window;
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

  const { ipcRenderer } = window;

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
export const cloneCollection = (collectionName, collectionFolderName, collectionLocation, previousPath) => () => {
  const { ipcRenderer } = window;

  return ipcRenderer.invoke(
    'renderer:clone-collection',
    collectionName,
    collectionFolderName,
    collectionLocation,
    previousPath
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

export const moveCollectionAndPersist = ({ draggedItem, targetItem }) => (dispatch, getState) => {
  dispatch(moveCollection({ draggedItem, targetItem }));

  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    const state = getState();

    const collectionPaths = state.collections.collections.map((collection) => collection.pathname);

    ipcRenderer
      .invoke('renderer:update-collection-paths', collectionPaths)
      .then(resolve)
      .catch(reject);
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
      if (!collectionSnapshotData) resolve();
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
    catch (error) {
      reject(error);
    }
  });
};

export const fetchOauth2Credentials = (payload) => async (dispatch, getState) => {
  const { request, collection, itemUid, folderUid } = payload;
  const state = getState();
  const { globalEnvironments, activeGlobalEnvironmentUid } = state.globalEnvironments;
  const globalEnvironmentVariables = getGlobalEnvironmentVariables({ globalEnvironments, activeGlobalEnvironmentUid });
  request.globalEnvironmentVariables = globalEnvironmentVariables;
  return new Promise((resolve, reject) => {
    window.ipcRenderer
      .invoke('renderer:fetch-oauth2-credentials', { itemUid, request, collection })
      .then(({ credentials, url, collectionUid, credentialsId, debugInfo }) => {
        dispatch(
          collectionAddOauth2CredentialsByUrl({
            credentials,
            url,
            collectionUid,
            credentialsId,
            debugInfo: safeParseJSON(safeStringifyJSON(debugInfo)),
            folderUid: folderUid || null,
            itemUid: !folderUid ? itemUid : null
          })
        );
        resolve(credentials);
      })
      .catch(reject);
  });
};

export const refreshOauth2Credentials = (payload) => async (dispatch, getState) => {
  const { request, collection, folderUid, itemUid } = payload;
  const state = getState();
  const { globalEnvironments, activeGlobalEnvironmentUid } = state.globalEnvironments;
  const globalEnvironmentVariables = getGlobalEnvironmentVariables({ globalEnvironments, activeGlobalEnvironmentUid });
  request.globalEnvironmentVariables = globalEnvironmentVariables;
  return new Promise((resolve, reject) => {
    window.ipcRenderer
      .invoke('renderer:refresh-oauth2-credentials', { request, collection })
      .then(({ credentials, url, collectionUid, debugInfo, credentialsId }) => {
        dispatch(
          collectionAddOauth2CredentialsByUrl({
            credentials,
            url,
            collectionUid,
            credentialsId,
            debugInfo: safeParseJSON(safeStringifyJSON(debugInfo)),
            folderUid: folderUid || null,
            itemUid: !folderUid ? itemUid : null
          })
        );
        resolve(credentials);
      })
      .catch(reject);
  });
};

export const clearOauth2Cache = (payload) => async (dispatch, getState) => {
  const { collectionUid, url, credentialsId } = payload;
  return new Promise((resolve, reject) => {
    window.ipcRenderer
      .invoke('clear-oauth2-cache', collectionUid, url, credentialsId)
      .then(() => {
        dispatch(
          collectionClearOauth2CredentialsByUrl({
            url,
            collectionUid,
          })
        );
        resolve();
      })
      .catch(reject);
  });
};

export const loadRequestViaWorker = ({ collectionUid, pathname }) => (dispatch, getState) => {
  return new Promise(async (resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('renderer:load-request-via-worker', { collectionUid, pathname }).then(resolve).catch(reject);
  });
};

export const loadRequest = ({ collectionUid, pathname }) => (dispatch, getState) => {
  return new Promise(async (resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('renderer:load-request', { collectionUid, pathname }).then(resolve).catch(reject);
  });
};

export const mountCollection = ({ collectionUid, collectionPathname, brunoConfig }) => (dispatch, getState) => {
  dispatch(updateCollectionMountStatus({ collectionUid, mountStatus: 'mounting' }));
  return new Promise(async (resolve, reject) => {
    callIpc('renderer:mount-collection', { collectionUid, collectionPathname, brunoConfig })
      .then(() => dispatch(updateCollectionMountStatus({ collectionUid, mountStatus: 'mounted' })))
      .then(resolve)
      .catch(() => {
        dispatch(updateCollectionMountStatus({ collectionUid, mountStatus: 'unmounted' }));
        reject();
      });
  });
};

export const showInFolder = (collectionPath) => () => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('renderer:show-in-folder', collectionPath).then(resolve).catch(reject);
  });
};
