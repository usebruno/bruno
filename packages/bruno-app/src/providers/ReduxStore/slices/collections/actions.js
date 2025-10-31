import { collectionSchema, environmentSchema, itemSchema } from '@usebruno/schema';
import { parseQueryParams } from '@usebruno/common/utils';
import cloneDeep from 'lodash/cloneDeep';
import filter from 'lodash/filter';
import find from 'lodash/find';
import get from 'lodash/get';
import set from 'lodash/set';
import trim from 'lodash/trim';
import path from 'utils/common/path';
import { insertTaskIntoQueue, toggleSidebarCollapse } from 'providers/ReduxStore/slices/app';
import toast from 'react-hot-toast';
import {
  findCollectionByUid,
  findEnvironmentInCollection,
  findItemInCollection,
  findParentItemInCollection,
  isItemAFolder,
  refreshUidsInItem,
  isItemARequest,
  transformRequestToSaveToFilesystem,
  transformCollectionRootToSave
} from 'utils/collections';
import { uuid, waitForNextTick } from 'utils/common';
import { cancelNetworkRequest, connectWS, sendGrpcRequest, sendNetworkRequest, sendWsRequest } from 'utils/network/index';
import { callIpc } from 'utils/common/ipc';
import brunoClipboard from 'utils/bruno-clipboard';

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
  collectionAddOauth2CredentialsByUrl,
  collectionClearOauth2CredentialsByUrl,
  initRunRequestEvent,
  updateRunnerConfiguration as _updateRunnerConfiguration,
  updateActiveConnections,
  saveRequest as _saveRequest,
  saveEnvironment as _saveEnvironment,
  saveCollectionDraft as _saveCollectionDraft,
  saveFolderDraft
} from './index';

import { each } from 'lodash';
import { closeAllCollectionTabs, updateResponsePaneScrollPosition } from 'providers/ReduxStore/slices/tabs';
import { resolveRequestFilename } from 'utils/common/platform';
import { parsePathParams, splitOnFirst } from 'utils/url/index';
import { sendCollectionOauth2Request as _sendCollectionOauth2Request } from 'utils/network/index';
import {
  getGlobalEnvironmentVariables,
  findCollectionByPathname,
  findEnvironmentInCollectionByName,
  getReorderedItemsInTargetDirectory,
  resetSequencesInFolder,
  getReorderedItemsInSourceDirectory,
  calculateDraggedItemNewPathname,
  transformFolderRootToSave
} from 'utils/collections/index';
import { sanitizeName } from 'utils/common/regex';
import { buildPersistedEnvVariables } from 'utils/environments';
import { safeParseJSON, safeStringifyJSON } from 'utils/common/index';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { updateSettingsSelectedTab } from './index';

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
        dispatch(
          _saveRequest({
            itemUid,
            collectionUid
          })
        );
      })
      .then(resolve)
      .catch((err) => {
        toast.error(err.message || 'Failed to save request!');
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

    const collectionCopy = cloneDeep(collection);

    // Transform collection root (uses draft if exists)
    const collectionRootToSave = transformCollectionRootToSave(collectionCopy);
    const { ipcRenderer } = window;

    // Note: We don't have a specific schema for collection root, but we can validate the structure
    // The structure should match what's expected in bruno.json (collection.bru)
    ipcRenderer
      .invoke('renderer:save-collection-root', collectionCopy.pathname, collectionRootToSave)
      .then(() => {
        toast.success('Collection Settings saved successfully');
        dispatch(_saveCollectionDraft({ collectionUid }));
      })
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

    // Use draft if it exists, otherwise use root
    const folderRootToSave = transformFolderRootToSave(folder);

    const folderData = {
      name: folder.name,
      pathname: folder.pathname,
      root: folderRootToSave
    };

    ipcRenderer
      .invoke('renderer:save-folder-root', folderData)
      .then(() => {
        toast.success('Folder Settings saved successfully');
        // If there was a draft, save it to root and clear the draft
        if (folder.draft) {
          dispatch(saveFolderDraft({ collectionUid, folderUid }));
        }
      })
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
    const globalEnvironmentVariables = getGlobalEnvironmentVariables({
      globalEnvironments,
      activeGlobalEnvironmentUid
    });
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

export const wsConnectOnly = (item, collectionUid) => (dispatch, getState) => {
  const state = getState();
  const { globalEnvironments, activeGlobalEnvironmentUid } = state.globalEnvironments;
  const collection = findCollectionByUid(state.collections.collections, collectionUid);

  return new Promise(async (resolve, reject) => {
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    let collectionCopy = cloneDeep(collection);

    const itemCopy = cloneDeep(item);

    const requestUid = uuid();
    itemCopy.requestUid = requestUid;

    const globalEnvironmentVariables = getGlobalEnvironmentVariables({
      globalEnvironments,
      activeGlobalEnvironmentUid
    });
    collectionCopy.globalEnvironmentVariables = globalEnvironmentVariables;

    const environment = findEnvironmentInCollection(collectionCopy, collectionCopy.activeEnvironmentUid);

    connectWS(itemCopy, collectionCopy, environment, collectionCopy.runtimeVariables, { connectOnly: true })
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
  const itemUid = item?.uid;

  return new Promise(async (resolve, reject) => {
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    let collectionCopy = cloneDeep(collection);

    const itemCopy = cloneDeep(item);

    const requestUid = uuid();
    itemCopy.requestUid = requestUid;

    await dispatch(
      updateResponsePaneScrollPosition({
        uid: state.tabs.activeTabUid,
        scrollY: 0
      })
    );

    await dispatch(
      initRunRequestEvent({
        requestUid,
        itemUid,
        collectionUid
      })
    );

    // add selected global env variables to the collection object
    const globalEnvironmentVariables = getGlobalEnvironmentVariables({
      globalEnvironments,
      activeGlobalEnvironmentUid
    });
    collectionCopy.globalEnvironmentVariables = globalEnvironmentVariables;

    const environment = findEnvironmentInCollection(collectionCopy, collectionCopy.activeEnvironmentUid);
    const isGrpcRequest = itemCopy.type === 'grpc-request';
    const isWsRequest = itemCopy.type === 'ws-request';
    if (isGrpcRequest) {
      sendGrpcRequest(itemCopy, collectionCopy, environment, collectionCopy.runtimeVariables)
        .then(resolve)
        .catch((err) => {
          toast.error(err.message);
        });
    } else if (isWsRequest) {
      sendWsRequest(itemCopy, collectionCopy, environment, collectionCopy.runtimeVariables)
        .then(resolve)
        .catch((err) => {
          toast.error(err.message);
        });
    } else {
      sendNetworkRequest(itemCopy, collectionCopy, environment, collectionCopy.runtimeVariables)
        .then((response) => {
          // Ensure any timestamps in the response are converted to numbers
          const serializedResponse = {
            ...response,
            timeline: response.timeline?.map((entry) => ({
              ...entry,
              timestamp: entry.timestamp instanceof Date ? entry.timestamp.getTime() : entry.timestamp
            }))
          };

          return dispatch(
            responseReceived({
              itemUid,
              collectionUid,
              response: serializedResponse
            })
          );
        })
        .then(resolve)
        .catch((err) => {
          if (err && err.message === "Error invoking remote method 'send-http-request': Error: Request cancelled") {
            dispatch(
              responseReceived({
                itemUid,
                collectionUid,
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
              itemUid,
              collectionUid,
              response: errorResponse
            })
          );
        });
    }
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

export const runCollectionFolder =
  (collectionUid, folderUid, recursive, delay, tags, selectedRequestUids) => (dispatch, getState) => {
    const state = getState();
    const { globalEnvironments, activeGlobalEnvironmentUid } = state.globalEnvironments;
    const collection = findCollectionByUid(state.collections.collections, collectionUid);

    return new Promise((resolve, reject) => {
      if (!collection) {
        return reject(new Error('Collection not found'));
      }

      let collectionCopy = cloneDeep(collection);

      // add selected global env variables to the collection object
      const globalEnvironmentVariables = getGlobalEnvironmentVariables({
        globalEnvironments,
        activeGlobalEnvironmentUid
      });
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

      // to only include those requests in the specified order while preserving folder data
      if (selectedRequestUids && selectedRequestUids.length > 0) {
        const newItems = [];

        selectedRequestUids.forEach((uid, index) => {
          const requestItem = findItemInCollection(collectionCopy, uid);
          if (requestItem) {
            const clonedRequest = cloneDeep(requestItem);
            clonedRequest.seq = index + 1;
            newItems.push(clonedRequest);
          }
        });

        if (folder) {
          folder.items = newItems;
        } else {
          collectionCopy.items = newItems;
        }
      }

      const { ipcRenderer } = window;
      ipcRenderer
        .invoke(
          'renderer:run-collection-folder',
          folder,
          collectionCopy,
          environment,
          collectionCopy.runtimeVariables,
          recursive,
          delay,
          tags
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

        const folderBruJsonData = {
          meta: {
            name: folderName,
            seq: items?.length + 1
          },
          request: {
            auth: {
              mode: 'inherit'
            }
          }
        };

        ipcRenderer
          .invoke('renderer:new-folder', { pathname: fullName, folderBruJsonData })
          .then(resolve)
          .catch((error) => {
            toast.error('Failed to create a new folder!');
            reject(error);
          });
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

          const folderBruJsonData = {
            meta: {
              name: folderName,
              seq: items?.length + 1
            },
            request: {
              auth: {
                mode: 'inherit'
              }
            }
          };

          ipcRenderer
            .invoke('renderer:new-folder', { pathname: fullName, folderBruJsonData })
            .then(resolve)
            .catch((error) => {
              toast.error('Failed to create a new folder!');
              reject(error);
            });
        } else {
          return reject(new Error('Duplicate folder names under same parent folder are not allowed'));
        }
      } else {
        return reject(new Error('unable to find parent folder'));
      }
    }
  });
};

export const renameItem =
  ({ newName, newFilename, itemUid, collectionUid }) =>
  (dispatch, getState) => {
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
        return ipcRenderer.invoke('renderer:rename-item-name', { itemPath: item.pathname, newName }).catch((err) => {
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

        return ipcRenderer
          .invoke('renderer:rename-item-filename', { oldPath: item.pathname, newPath, newName, newFilename })
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

export const pasteItem = (targetCollectionUid, targetItemUid = null) => (dispatch, getState) => {
  const state = getState();

  const clipboardResult = brunoClipboard.read();

  if (!clipboardResult.hasData) {
    return Promise.reject(new Error('No item in clipboard'));
  }

  const targetCollection = findCollectionByUid(state.collections.collections, targetCollectionUid);

  if (!targetCollection) {
    return Promise.reject(new Error('Target collection not found'));
  }

  return new Promise(async (resolve, reject) => {
    try {
      for (const clipboardItem of clipboardResult.items) {
        const copiedItem = cloneDeep(clipboardItem);

        // Only allow pasting requests (not folders)
        if (isItemAFolder(copiedItem)) {
          return reject(new Error('Pasting folders is not supported'));
        }

        const targetCollectionCopy = cloneDeep(targetCollection);
        let targetItem = null;
        let targetParentPathname = targetCollection.pathname;

        // If targetItemUid is provided, we're pasting into a folder
        if (targetItemUid) {
          targetItem = findItemInCollection(targetCollectionCopy, targetItemUid);
          if (!targetItem) {
            return reject(new Error('Target folder not found'));
          }
          if (!isItemAFolder(targetItem)) {
            return reject(new Error('Target must be a folder or collection'));
          }
          targetParentPathname = targetItem.pathname;
        }

        // Generate a unique filename for the pasted item
        let newName = copiedItem.name;
        let newFilename = sanitizeName(copiedItem.name);
        let counter = 1;

        const existingItems = targetItem ? targetItem.items : targetCollection.items;

        // Check for duplicate names and append counter if needed
        while (find(existingItems, (i) => i.type !== 'folder' && trim(i.filename) === trim(resolveRequestFilename(newFilename)))) {
          newName = `${copiedItem.name} (${counter})`;
          newFilename = `${sanitizeName(copiedItem.name)} (${counter})`;
          counter++;
        }

        const filename = resolveRequestFilename(newFilename);
        const itemToSave = refreshUidsInItem(transformRequestToSaveToFilesystem(copiedItem));
        set(itemToSave, 'name', trim(newName));
        set(itemToSave, 'filename', trim(filename));

        const fullPathname = path.join(targetParentPathname, filename);
        const { ipcRenderer } = window;
        const requestItems = filter(existingItems, (i) => i.type !== 'folder');
        itemToSave.seq = requestItems ? requestItems.length + 1 : 1;

        await itemSchema.validate(itemToSave);
        await ipcRenderer.invoke('renderer:new-request', fullPathname, itemToSave);

        dispatch(insertTaskIntoQueue({
          uid: uuid(),
          type: 'OPEN_REQUEST',
          collectionUid: targetCollectionUid,
          itemPathname: fullPathname
        }));
      }

      resolve();
    } catch (error) {
      reject(error);
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

export const moveItem =
  ({ targetDirname, sourcePathname }) =>
  (dispatch, getState) => {
    return new Promise((resolve, reject) => {
      const { ipcRenderer } = window;

      ipcRenderer.invoke('renderer:move-item', { targetDirname, sourcePathname }).then(resolve).catch(reject);
    });
  };

export const handleCollectionItemDrop =
  ({ targetItem, draggedItem, dropType, collectionUid }) =>
  (dispatch, getState) => {
    const state = getState();
    const collection = findCollectionByUid(state.collections.collections, collectionUid);
    // if its withincollection set the source to current collection,
    // if its cross collection set the source to the source collection
    const sourceCollectionUid = draggedItem.sourceCollectionUid
    const isCrossCollectionMove = sourceCollectionUid && collectionUid !== sourceCollectionUid;
    const sourceCollection = isCrossCollectionMove ? findCollectionByUid(state.collections.collections, sourceCollectionUid) : collection;
    const { uid: draggedItemUid, pathname: draggedItemPathname } = draggedItem;
    const { uid: targetItemUid, pathname: targetItemPathname } = targetItem;
    const targetItemDirectory = findParentItemInCollection(collection, targetItemUid) || collection;
    const targetItemDirectoryItems = cloneDeep(targetItemDirectory.items);
    const draggedItemDirectory = findParentItemInCollection(sourceCollection, draggedItemUid) || sourceCollection;
    const draggedItemDirectoryItems = cloneDeep(draggedItemDirectory.items);

    const handleMoveToNewLocation = async ({
      draggedItem,
      draggedItemDirectoryItems,
      targetItem,
      targetItemDirectoryItems,
      newPathname,
      dropType
    }) => {
      const { uid: targetItemUid } = targetItem;
      const { pathname: draggedItemPathname, uid: draggedItemUid } = draggedItem;

      const newDirname = path.dirname(newPathname);
      await dispatch(
        moveItem({
          targetDirname: newDirname,
          sourcePathname: draggedItemPathname
        })
      );

      // Update sequences in the source directory
      if (draggedItemDirectoryItems?.length) {
        // reorder items in the source directory
        const draggedItemDirectoryItemsWithoutDraggedItem = draggedItemDirectoryItems.filter(
          (i) => i.uid !== draggedItemUid
        );
        const reorderedSourceItems = getReorderedItemsInSourceDirectory({
          items: draggedItemDirectoryItemsWithoutDraggedItem
        });
        if (reorderedSourceItems?.length) {
          await dispatch(updateItemsSequences({ itemsToResequence: reorderedSourceItems }));
        }
      }

      // Update sequences in the target directory (if dropping adjacent)
      if (dropType === 'adjacent') {
        const targetItemSequence = targetItemDirectoryItems.findIndex((i) => i.uid === targetItemUid)?.seq;

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
        const newPathname = calculateDraggedItemNewPathname({
          draggedItem,
          targetItem,
          dropType,
          collectionPathname: collection.pathname
        });
        if (!newPathname) return;
        if (targetItemPathname?.startsWith(draggedItemPathname)) return;
        if (newPathname !== draggedItemPathname) {
          await handleMoveToNewLocation({
            targetItem,
            targetItemDirectoryItems,
            draggedItem,
            draggedItemDirectoryItems,
            newPathname,
            dropType
          });
        } else {
          await handleReorderInSameLocation({ draggedItem, targetItemDirectoryItems, targetItem });
        }
        resolve();
      } catch (error) {
        console.error(error);
        toast.error(error?.message);
        reject(error);
      }
    });
  };

export const updateItemsSequences =
  ({ itemsToResequence }) =>
  (dispatch, getState) => {
    return new Promise((resolve, reject) => {
      const { ipcRenderer } = window;

      ipcRenderer.invoke('renderer:resequence-items', itemsToResequence).then(resolve).catch(reject);
    });
  };

export const newHttpRequest = (params) => (dispatch, getState) => {
  const {
    requestName,
    filename,
    requestType,
    requestUrl,
    requestMethod,
    collectionUid,
    itemUid,
    headers,
    body,
    auth,
    settings
  } = params;

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
      },
      settings: settings ?? {
        encodeUrl: true
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

        ipcRenderer
          .invoke('renderer:new-request', fullName, item)
          .then(() => {
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
          })
          .catch(reject);
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
          ipcRenderer
            .invoke('renderer:new-request', fullName, item)
            .then(() => {
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
            })
            .catch(reject);
        } else {
          return reject(new Error('Duplicate request names are not allowed under the same folder'));
        }
      }
    }
  });
};

export const newGrpcRequest = (params) => (dispatch, getState) => {
  const { requestName, filename, requestUrl, collectionUid, body, auth, headers, itemUid } = params;

  return new Promise((resolve, reject) => {
    const state = getState();
    const collection = findCollectionByUid(state.collections.collections, collectionUid);
    if (!collection) {
      return reject(new Error('Collection not found'));
    }
    // do we need to handle query, path params for grpc requests?
    // skipping for now

    const item = {
      uid: uuid(),
      name: requestName,
      filename,
      type: 'grpc-request',
      headers: headers ?? [],
      request: {
        url: requestUrl,
        body: body ?? {
          mode: 'grpc',
          grpc: [
            {
              name: 'message 1',
              content: '{}'
            }
          ]
        },
        auth: auth ?? {
          mode: 'inherit'
        }
      }
    };

    // itemUid is null when we are creating a new request at the root level
    const parentItem = itemUid ? findItemInCollection(collection, itemUid) : collection;
    const resolvedFilename = resolveRequestFilename(filename);

    if (!parentItem) {
      return reject(new Error('Parent item not found'));
    }

    const reqWithSameNameExists = find(parentItem.items,
      (i) => i.type !== 'folder' && trim(i.filename) === trim(resolvedFilename));

    if (reqWithSameNameExists) {
      return reject(new Error('Duplicate request names are not allowed under the same folder'));
    }

    const items = filter(parentItem.items, (i) => isItemAFolder(i) || isItemARequest(i));
    item.seq = items.length + 1;
    const fullName = path.join(parentItem.pathname, resolvedFilename);
    const { ipcRenderer } = window;
    ipcRenderer
      .invoke('renderer:new-request', fullName, item)
      .then(() => {
        // task middleware will track this and open the new request in a new tab once request is created
        dispatch(insertTaskIntoQueue({
          uid: uuid(),
          type: 'OPEN_REQUEST',
          collectionUid,
          itemPathname: fullName
        }));
        resolve();
      })
      .catch(reject);
  });
};

export const newWsRequest = (params) => (dispatch, getState) => {
  const { requestName, requestMethod, filename, requestUrl, collectionUid, body, auth, headers, itemUid } = params;

  return new Promise((resolve, reject) => {
    const state = getState();
    const collection = findCollectionByUid(state.collections.collections, collectionUid);
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    const item = {
      uid: uuid(),
      name: requestName,
      filename,
      type: 'ws-request',
      headers: headers ?? [],
      request: {
        url: requestUrl,
        method: requestMethod,
        body: body ?? {
          mode: 'ws',
          ws: [
            {
              name: 'message 1',
              type: 'json',
              content: '{}'
            }
          ]
        },
        auth: auth ?? {
          mode: 'inherit'
        }
      }
    };

    // itemUid is null when we are creating a new request at the root level
    const parentItem = itemUid ? findItemInCollection(collection, itemUid) : collection;
    const resolvedFilename = resolveRequestFilename(filename);

    if (!parentItem) {
      return reject(new Error('Parent item not found'));
    }

    const reqWithSameNameExists = find(parentItem.items,
      (i) => i.type !== 'folder' && trim(i.filename) === trim(resolvedFilename));

    if (reqWithSameNameExists) {
      return reject(new Error('Duplicate request names are not allowed under the same folder'));
    }

    const items = filter(parentItem.items, (i) => isItemAFolder(i) || isItemARequest(i));
    item.seq = items.length + 1;
    const fullName = path.join(parentItem.pathname, resolvedFilename);
    const { ipcRenderer } = window;
    ipcRenderer
      .invoke('renderer:new-request', fullName, item)
      .then(() => {
        // task middleware will track this and open the new request in a new tab once request is created
        dispatch(insertTaskIntoQueue({
          uid: uuid(),
          type: 'OPEN_REQUEST',
          collectionUid,
          itemPathname: fullName
        }));
        resolve();
      })
      .catch(reject);
  });
};

export const loadGrpcMethodsFromReflection = (item, collectionUid, url) => async (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);
  const { globalEnvironments, activeGlobalEnvironmentUid } = state.globalEnvironments;

  return new Promise((resolve, reject) => {
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    const itemCopy = cloneDeep(item);
    const requestItem = itemCopy.draft ? itemCopy.draft : itemCopy;
    requestItem.request.url = url;
    const collectionCopy = cloneDeep(collection);
    const globalEnvironmentVariables = getGlobalEnvironmentVariables({
      globalEnvironments,
      activeGlobalEnvironmentUid
    });
    collectionCopy.globalEnvironmentVariables = globalEnvironmentVariables;
    const environment = findEnvironmentInCollection(collectionCopy, collectionCopy.activeEnvironmentUid);
    const runtimeVariables = collectionCopy.runtimeVariables;

    const { ipcRenderer } = window;
    ipcRenderer
      .invoke('grpc:load-methods-reflection', {
        request: requestItem,
        collection: collectionCopy,
        environment,
        runtimeVariables
      })
      .then(resolve)
      .catch(reject);
  });
};

export const generateGrpcurlCommand = (item, collectionUid) => async (dispatch, getState) => {
  const state = getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);
  const { globalEnvironments, activeGlobalEnvironmentUid } = state.globalEnvironments;

  return new Promise((resolve, reject) => {
    if (!collection) {
      return reject(new Error('Collection not found'));
    }

    const itemCopy = cloneDeep(item);
    const collectionCopy = cloneDeep(collection);

    const globalEnvironmentVariables = getGlobalEnvironmentVariables({
      globalEnvironments,
      activeGlobalEnvironmentUid
    });
    collectionCopy.globalEnvironmentVariables = globalEnvironmentVariables;
    const environment = findEnvironmentInCollection(collectionCopy, collectionCopy.activeEnvironmentUid);
    const runtimeVariables = collectionCopy.runtimeVariables;

    const { ipcRenderer } = window;
    ipcRenderer
      .invoke('grpc:generate-grpcurl', { request: itemCopy, collection: collectionCopy, environment, runtimeVariables })
      .then(resolve)
      .catch(reject);
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

    // strip "ephemeral" metadata
    const variablesToCopy = (baseEnv.variables || [])
      .filter((v) => !v.ephemeral)
      .map(({ ephemeral, ...rest }) => {
        return rest;
      });

    ipcRenderer
      .invoke('renderer:create-environment', collection.pathname, sanitizedName, variablesToCopy)
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

    /*
     Modal Save writes what the user sees:
     - Non-ephemeral vars are saved as-is (without metadata)
     - Ephemeral vars:
       - if persistedValue exists, save that (explicit persisted case)
       - otherwise save the current UI value (treat as user-authored)
     */
    const persisted = buildPersistedEnvVariables(variables, { mode: 'save' });
    environment.variables = persisted;

    const { ipcRenderer } = window;
    const envForValidation = cloneDeep(environment);

    environmentSchema
      .validate(environment)
      .then(() => ipcRenderer.invoke('renderer:save-environment', collection.pathname, envForValidation))
      .then(() => {
        // Immediately sync Redux to the saved (persisted) set so old ephemerals
        // aren’t around when the watcher event arrives.
        dispatch(_saveEnvironment({ variables: persisted, environmentUid, collectionUid }));
      })
      .then(resolve)
      .catch(reject);
  });
};

export const mergeAndPersistEnvironment =
  ({ persistentEnvVariables, collectionUid }) =>
  (_dispatch, getState) => {
    return new Promise((resolve, reject) => {
      const state = getState();
      const collection = findCollectionByUid(state.collections.collections, collectionUid);

      if (!collection) {
        return reject(new Error('Collection not found'));
      }

      const environmentUid = collection.activeEnvironmentUid;
      if (!environmentUid) {
        return reject(new Error('No active environment found'));
      }

      const collectionCopy = cloneDeep(collection);
      const environment = findEnvironmentInCollection(collectionCopy, environmentUid);
      if (!environment) {
        return reject(new Error('Environment not found'));
      }

      // Only proceed if there are persistent variables to save
      if (!persistentEnvVariables || Object.keys(persistentEnvVariables).length === 0) {
        return resolve();
      }

      let existingVars = environment.variables || [];

      let normalizedNewVars = Object.entries(persistentEnvVariables).map(([name, value]) => ({
        uid: uuid(),
        name,
        value,
        type: 'text',
        enabled: true,
        secret: false
      }));

      const merged = existingVars.map((v) => {
        const found = normalizedNewVars.find((nv) => nv.name === v.name);
        if (found) {
          return { ...v, value: found.value };
        }
        return v;
      });
      normalizedNewVars.forEach((nv) => {
        if (!merged.some((v) => v.name === nv.name)) {
          merged.push(nv);
        }
      });

        // Save all non-ephemeral vars and all variables that were previously persisted
      const persistedNames = new Set(Object.keys(persistentEnvVariables));

        // Add all existing non-ephemeral variables to persistedNames so they are preserved
        existingVars.forEach((v) => {
          if (!v.ephemeral) {
            persistedNames.add(v.name);
          }
        });

      const environmentToSave = cloneDeep(environment);
      environmentToSave.variables = buildPersistedEnvVariables(merged, { mode: 'merge', persistedNames });

      const { ipcRenderer } = window;
      environmentSchema
        .validate(environmentToSave)
        .then(() => ipcRenderer.invoke('renderer:save-environment', collection.pathname, environmentToSave))
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

    const environmentName = environmentUid ? findEnvironmentInCollection(collectionCopy, environmentUid)?.name : null;

    if (environmentUid && !environmentName) {
      return reject(new Error('Environment not found'));
    }

    const { ipcRenderer } = window;
    ipcRenderer.invoke('renderer:update-ui-state-snapshot', {
      type: 'COLLECTION_ENVIRONMENT',
      data: { collectionPath: collection?.pathname, environmentName }
    });

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
      .invoke('renderer:remove-collection', collection.pathname, collectionUid)
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

export const browseFiles = (filters, properties) => (_dispatch, _getState) => {
  const { ipcRenderer } = window;

  return new Promise((resolve, reject) => {
    ipcRenderer.invoke('renderer:browse-files', filters, properties).then(resolve).catch(reject);
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
        .then(() => {
          // Expand sidebar if it's collapsed after collection is successfully opened
          const state = getState();
          if (state.app.sidebarCollapsed) {
            dispatch(toggleSidebarCollapse());
          }
          resolve();
        })
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

export const moveCollectionAndPersist =
  ({ draggedItem, targetItem }) =>
  (dispatch, getState) => {
    dispatch(moveCollection({ draggedItem, targetItem }));

    return new Promise((resolve, reject) => {
      const { ipcRenderer } = window;
      const state = getState();

      const collectionPaths = state.collections.collections.map((collection) => collection.pathname);

      ipcRenderer.invoke('renderer:update-collection-paths', collectionPaths).then(resolve).catch(reject);
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
    } catch (error) {
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
      .invoke('renderer:refresh-oauth2-credentials', { itemUid, request, collection })
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
            collectionUid
          })
        );
        resolve();
      })
      .catch(reject);
  });
};

// todo: could be removed
export const loadRequestViaWorker =
  ({ collectionUid, pathname }) =>
  (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      const { ipcRenderer } = window;
      ipcRenderer.invoke('renderer:load-request-via-worker', { collectionUid, pathname }).then(resolve).catch(reject);
    });
  };

// todo: could be removed
export const loadRequest =
  ({ collectionUid, pathname }) =>
  (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      const { ipcRenderer } = window;
      ipcRenderer.invoke('renderer:load-request', { collectionUid, pathname }).then(resolve).catch(reject);
    });
  };

export const loadLargeRequest =
  ({ collectionUid, pathname }) =>
  (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      const { ipcRenderer } = window;
      ipcRenderer.invoke('renderer:load-large-request', { collectionUid, pathname }).then(resolve).catch(reject);
    });
  };

export const mountCollection =
  ({ collectionUid, collectionPathname, brunoConfig }) =>
  (dispatch, getState) => {
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

export const updateRunnerConfiguration =
  (collectionUid, selectedRequestItems, requestItemsOrder, delay) => (dispatch) => {
    dispatch(
      _updateRunnerConfiguration({
        collectionUid,
        selectedRequestItems,
        requestItemsOrder,
        delay
      })
    );
  };

export const updateActiveConnectionsInStore = (activeConnectionIds) => (dispatch, getState) => {
  dispatch(updateActiveConnections(activeConnectionIds));
};

export const openCollectionSettings =
  (collectionUid, tabName = 'overview') =>
  (dispatch, getState) => {
    const state = getState();
    const collection = findCollectionByUid(state.collections.collections, collectionUid);

    return new Promise((resolve, reject) => {
      if (!collection) {
        return reject(new Error('Collection not found'));
      }

      dispatch(
        updateSettingsSelectedTab({
          collectionUid: collection.uid,
          tab: tabName
        })
      );

      dispatch(
        addTab({
          uid: collection.uid,
          collectionUid: collection.uid,
          type: 'collection-settings'
        })
      );

      resolve();
    });
  };
