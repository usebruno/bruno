import { parseQueryParams, buildQueryString as stringifyQueryParams } from '@usebruno/common/utils';
import { uuid } from 'utils/common';
import { find, map, forOwn, concat, filter, each, cloneDeep, get, set, findIndex } from 'lodash';
import { createSlice } from '@reduxjs/toolkit';
import { hexy as hexdump } from 'hexy';
import {
  addDepth,
  areItemsTheSameExceptSeqUpdate,
  collapseAllItemsInCollection,
  deleteItemInCollection,
  deleteItemInCollectionByPathname,
  findCollectionByPathname,
  findCollectionByUid,
  findEnvironmentInCollection,
  findItemInCollection,
  findItemInCollectionByPathname,
  isItemAFolder,
  isItemARequest
} from 'utils/collections';
import { parsePathParams, splitOnFirst } from 'utils/url';
import { getSubdirectoriesFromRoot } from 'utils/common/platform';
import toast from 'react-hot-toast';
import mime from 'mime-types';
import path from 'utils/common/path';
import { getUniqueTagsFromItems } from 'utils/collections/index';
import * as exampleReducers from './exampleReducers';

// gRPC status code meanings
const grpcStatusCodes = {
  0: 'OK',
  1: 'CANCELLED',
  2: 'UNKNOWN',
  3: 'INVALID_ARGUMENT',
  4: 'DEADLINE_EXCEEDED',
  5: 'NOT_FOUND',
  6: 'ALREADY_EXISTS',
  7: 'PERMISSION_DENIED',
  8: 'RESOURCE_EXHAUSTED',
  9: 'FAILED_PRECONDITION',
  10: 'ABORTED',
  11: 'OUT_OF_RANGE',
  12: 'UNIMPLEMENTED',
  13: 'INTERNAL',
  14: 'UNAVAILABLE',
  15: 'DATA_LOSS',
  16: 'UNAUTHENTICATED'
};

// WebSocket status code meanings
const wsStatusCodes = {
  1000: 'NORMAL_CLOSURE',
  1001: 'GOING_AWAY',
  1002: 'PROTOCOL_ERROR',
  1003: 'UNSUPPORTED_DATA',
  1004: 'RESERVED',
  1005: 'NO_STATUS_RECEIVED',
  1006: 'ABNORMAL_CLOSURE',
  1007: 'INVALID_FRAME_PAYLOAD_DATA',
  1008: 'POLICY_VIOLATION',
  1009: 'MESSAGE_TOO_BIG',
  1010: 'MANDATORY_EXTENSION',
  1011: 'INTERNAL_ERROR',
  1012: 'SERVICE_RESTART',
  1013: 'TRY_AGAIN_LATER',
  1014: 'BAD_GATEWAY',
  1015: 'TLS_HANDSHAKE'
};

const initialState = {
  collections: [],
  collectionSortOrder: 'default',
  activeConnections: [],
  tempDirectories: {},
  saveTransientRequestModals: []
};

const initiatedGrpcResponse = {
  statusCode: null,
  statusText: 'STREAMING',
  statusDescription: null,
  headers: [],
  metadata: null,
  trailers: null,
  statusDetails: null,
  error: null,
  isError: false,
  duration: 0,
  responses: [],
  timestamp: Date.now()
};

const initiatedWsResponse = {
  status: 'PENDING',
  statusText: 'PENDING',
  statusCode: 0,
  headers: [],
  body: '',
  size: 0,
  duration: 0,
  sortOrder: -1,
  responses: [],
  isError: false,
  error: null,
  errorDetails: null,
  metadata: [],
  trailers: []
};

export const collectionsSlice = createSlice({
  name: 'collections',
  initialState,
  reducers: {
    createCollection: (state, action) => {
      const collectionUids = map(state.collections, (c) => c.uid);
      const collection = action.payload;

      collection.settingsSelectedTab = 'overview';
      collection.folderLevelSettingsSelectedTab = {};
      collection.allTags = []; // Initialize collection-level tags

      // Collection mount status is used to track the mount status of the collection
      // values can be 'unmounted', 'mounting', 'mounted'
      collection.mountStatus = 'unmounted';

      // Add format property from brunoConfig for easy access
      // YAML collections have 'opencollection' field, BRU collections have 'version' field
      if (collection.brunoConfig?.opencollection) {
        collection.format = 'yml';
      } else {
        collection.format = collection.brunoConfig?.format || 'bru';
      }

      // TODO: move this to use the nextAction approach
      // last action is used to track the last action performed on the collection
      // this is optional
      // this is used in scenarios where we want to know the last action performed on the collection
      // and take some extra action based on that
      // for example, when a env is created, we want to auto select it the env modal
      collection.importedAt = new Date().getTime();
      collection.lastAction = null;

      collapseAllItemsInCollection(collection);
      addDepth(collection.items);
      if (!collectionUids.includes(collection.uid)) {
        state.collections.push(collection);
      }
    },
    collapseFullCollection: (state, action) => {
      const { collectionUid } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);
      if (collection) {
        collapseAllItemsInCollection(collection);
      }
    },
    updateCollectionMountStatus: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      if (collection) {
        if (action.payload.mountStatus) {
          collection.mountStatus = action.payload.mountStatus;
        }
      }
    },
    updateCollectionLoadingState: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      if (collection) {
        collection.isLoading = action.payload.isLoading;
      }
    },
    setCollectionSecurityConfig: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      if (collection) {
        collection.securityConfig = action.payload.securityConfig;
      }
    },
    brunoConfigUpdateEvent: (state, action) => {
      const { collectionUid, brunoConfig } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);

      if (collection) {
        collection.brunoConfig = brunoConfig;
      }
    },
    renameCollection: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        collection.name = action.payload.newName;
      }
    },
    removeCollection: (state, action) => {
      state.collections = filter(state.collections, (c) => c.uid !== action.payload.collectionUid);
    },
    sortCollections: (state, action) => {
      state.collectionSortOrder = action.payload.order;
      const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
      switch (action.payload.order) {
        case 'default':
          state.collections = state.collections.sort((a, b) => a.importedAt - b.importedAt);
          break;
        case 'alphabetical':
          state.collections = state.collections.sort((a, b) => collator.compare(a.name, b.name));
          break;
        case 'reverseAlphabetical':
          state.collections = state.collections.sort((a, b) => -collator.compare(a.name, b.name));
          break;
      }
    },
    moveCollection: (state, action) => {
      const { draggedItem, targetItem } = action.payload;
      state.collections = state.collections.filter((i) => i.uid !== draggedItem.uid); // Remove dragged item
      const targetItemIndex = state.collections.findIndex((i) => i.uid === targetItem.uid); // Find target item
      state.collections.splice(targetItemIndex, 0, draggedItem); // Insert dragged-item above target-item
    },
    updateLastAction: (state, action) => {
      const { collectionUid, lastAction } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);

      if (collection) {
        collection.lastAction = lastAction;
      }
    },
    updateSettingsSelectedTab: (state, action) => {
      const { collectionUid, folderUid, tab } = action.payload;

      const collection = findCollectionByUid(state.collections, collectionUid);

      if (collection) {
        collection.settingsSelectedTab = tab;
      }
    },
    updatedFolderSettingsSelectedTab: (state, action) => {
      const { collectionUid, folderUid, tab } = action.payload;

      const collection = findCollectionByUid(state.collections, collectionUid);

      if (collection) {
        const folder = findItemInCollection(collection, folderUid);

        if (folder) {
          collection.folderLevelSettingsSelectedTab[folderUid] = tab;
        }
      }
    },
    collectionUnlinkEnvFileEvent: (state, action) => {
      const { data: environment, meta } = action.payload;
      const collection = findCollectionByUid(state.collections, meta.collectionUid);

      if (collection) {
        collection.environments = filter(collection.environments, (e) => e.uid !== environment.uid);
      }
    },
    saveEnvironment: (state, action) => {
      const { variables, environmentUid, collectionUid } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);

      if (collection) {
        const environment = findEnvironmentInCollection(collection, environmentUid);

        if (environment) {
          environment.variables = variables;
        }
      }
    },
    selectEnvironment: (state, action) => {
      const { environmentUid, collectionUid } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);

      if (collection) {
        if (environmentUid) {
          const environment = findEnvironmentInCollection(collection, environmentUid);

          if (environment) {
            collection.activeEnvironmentUid = environmentUid;
          }
        } else {
          collection.activeEnvironmentUid = null;
        }
      }
    },
    newItem: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        if (!action.payload.currentItemUid) {
          collection.items.push(action.payload.item);
        } else {
          const item = findItemInCollection(collection, action.payload.currentItemUid);

          if (item) {
            item.items = item.items || [];
            item.items.push(action.payload.item);
          }
        }
        addDepth(collection.items);
      }
    },
    deleteItem: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        deleteItemInCollection(action.payload.itemUid, collection);
      }
    },
    renameItem: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item) {
          item.name = action.payload.newName;
        }
      }
    },
    cloneItem: (state, action) => {
      const collectionUid = action.payload.collectionUid;
      const clonedItem = action.payload.clonedItem;
      const parentItemUid = action.payload.parentItemUid;
      const collection = findCollectionByUid(state.collections, collectionUid);

      if (collection) {
        if (parentItemUid) {
          const parentItem = findItemInCollection(collection, parentItemUid);
          parentItem.items.push(clonedItem);
        } else {
          collection.items.push(clonedItem);
        }
      }
    },
    scriptEnvironmentUpdateEvent: (state, action) => {
      const { collectionUid, envVariables, runtimeVariables, persistentEnvVariables } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);

      if (collection) {
        const activeEnvironmentUid = collection.activeEnvironmentUid;
        const activeEnvironment = findEnvironmentInCollection(collection, activeEnvironmentUid);

        if (activeEnvironment) {
          const existingEnvVarNames = new Set(Object.keys(envVariables));

          // Update or add variables that exist in envVariables
          forOwn(envVariables, (value, key) => {
            const variable = find(activeEnvironment.variables, (v) => v.name === key);
            const isPersistent = persistentEnvVariables && persistentEnvVariables[key] !== undefined;

            if (variable) {
              // For updates coming from scripts, treat them as ephemeral overlays unless they are persistent.
              if (variable.value !== value) {
                /*
                 Overlay (persist: false): keep new value in Redux for UI and mark ephemeral
                 so it isn't written to disk. persistedValue stores the previous on-disk value;
                 save/persist uses that base unless the key is explicitly persisted.
                */
                const previousValue = variable.value;
                variable.value = value;
                variable.ephemeral = !isPersistent;
                if (variable.persistedValue === undefined) {
                  variable.persistedValue = previousValue;
                }
              }
            } else {
              // __name__ is a private variable used to store the name of the environment
              // this is not a user defined variable and hence should not be updated
              if (key !== '__name__') {
                activeEnvironment.variables.push({
                  name: key,
                  value,
                  secret: false,
                  enabled: true,
                  type: 'text',
                  uid: uuid(),
                  ephemeral: !isPersistent
                });
              }
            }
          });

          // Handle variables that were deleted via bru.deleteEnvVar()
          activeEnvironment.variables = activeEnvironment.variables.filter((variable) => {
            // Variable still exists in envVariables after script execution - keep it
            if (existingEnvVarNames.has(variable.name)) {
              return true;
            }

            // Variable was deleted via bru.deleteEnvVar() - handle based on its state
            // If variable was modified by script (has persistedValue), restore original value
            if (variable.persistedValue !== undefined) {
              variable.value = variable.persistedValue;
              variable.ephemeral = false;
              delete variable.persistedValue;
              return true;
            }

            // Remove variable: either ephemeral (created by scripts) or non-ephemeral deleted via API
            return false;
          });
        }

        collection.runtimeVariables = runtimeVariables;
      }
    },
    processEnvUpdateEvent: (state, action) => {
      const { collectionUid, processEnvVariables } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);

      if (collection) {
        collection.processEnvVariables = processEnvVariables;
      }
    },
    workspaceEnvUpdateEvent: (state, action) => {
      const { processEnvVariables } = action.payload;
      state.collections.forEach((collection) => {
        collection.workspaceProcessEnvVariables = processEnvVariables;
      });
    },
    requestCancelled: (state, action) => {
      const { itemUid, collectionUid, seq, timestamp } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, itemUid);
        if (item) {
          if (item.response?.stream?.running) {
            item.response.stream.running = null;

            const startTimestamp = item.requestSent.timestamp;
            item.response.duration = startTimestamp ? Date.now() - startTimestamp : item.response.duration;
            item.response.data = [{ type: 'info', timestamp: Date.now(), seq: seq, message: 'Connection Closed' }].concat(item.response.data);
          } else {
            item.response = null;
            item.requestUid = null;
          }
          item.cancelTokenUid = null;
          item.requestStartTime = null;
        }
      }
    },
    responseReceived: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);
        if (item) {
          item.requestState = 'received';
          item.response = action.payload.response;
          item.cancelTokenUid = item.response.stream?.running ? item.cancelTokenUid : null;
          item.requestStartTime = null;

          if (!collection.timeline) {
            collection.timeline = [];
          }

          // Ensure timestamp is a number (milliseconds since epoch)
          const timestamp = item?.requestSent?.timestamp instanceof Date
            ? item.requestSent.timestamp.getTime()
            : item?.requestSent?.timestamp || Date.now();

          // Append the new timeline entry with numeric timestamp
          collection.timeline.push({
            type: 'request',
            collectionUid: collection.uid,
            folderUid: null,
            itemUid: item.uid,
            timestamp: timestamp,
            data: {
              request: item.requestSent || item.request,
              response: action.payload.response,
              timestamp: timestamp
            }
          });
        }
      }
    },
    runGrpcRequestEvent: (state, action) => {
      const { itemUid, collectionUid, eventType, eventData } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);
      if (!collection) return;

      const item = findItemInCollection(collection, itemUid);
      if (!item) return;
      const request = item.draft ? item.draft.request : item.request;
      const isUnary = request.methodType === 'unary';

      if (eventType === 'request') {
        item.requestSent = eventData;
        item.requestSent.timestamp = Date.now();
        item.response = {
          initiatedGrpcResponse,
          statusText: isUnary ? 'PENDING' : 'STREAMING'
        };
      }

      if (!collection.timeline) {
        collection.timeline = [];
      }

      collection.timeline.push({
        type: 'request',
        eventType: eventType, // Add the specific gRPC event type
        collectionUid: collection.uid,
        folderUid: null,
        itemUid: item.uid,
        timestamp: Date.now(),
        data: {
          request: eventData || item.requestSent || item.request,
          timestamp: Date.now(),
          eventData: eventData
        }
      });
    },
    grpcResponseReceived: (state, action) => {
      const { itemUid, collectionUid, eventType, eventData } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);

      if (!collection) return;

      const item = findItemInCollection(collection, itemUid);

      if (!item) return;

      // Get current response state or create initial state
      const currentResponse = item.response || initiatedGrpcResponse;
      const timestamp = item?.requestSent?.timestamp;
      let updatedResponse = { ...currentResponse, duration: Date.now() - (timestamp || Date.now()) };

      // Process based on event type
      switch (eventType) {
        case 'response':
          const { error, res } = eventData;

          //  Handle error if present
          if (error) {
            const errorCode = error.code || 2; // Default to UNKNOWN if no code

            updatedResponse.error = error.details || 'gRPC error occurred';
            updatedResponse.statusCode = errorCode;
            updatedResponse.statusText = grpcStatusCodes[errorCode] || 'UNKNOWN';
            updatedResponse.errorDetails = error;
            updatedResponse.isError = true;
          }

          // Add response to list
          updatedResponse.responses = res
            ? [...(currentResponse?.responses || []), res]
            : [...(currentResponse?.responses || [])];
          break;

        case 'metadata':
          updatedResponse.headers = eventData.metadata;
          updatedResponse.metadata = eventData.metadata;
          break;

        case 'status':
          // Extract status info
          const statusCode = eventData.status?.code;
          const statusDetails = eventData.status?.details;
          const statusMetadata = eventData.status?.metadata;

          // Set status based on actual code and details
          updatedResponse.statusCode = statusCode;
          updatedResponse.statusText = grpcStatusCodes[statusCode] || 'UNKNOWN';
          updatedResponse.statusDescription = statusDetails;
          updatedResponse.statusDetails = eventData.status;

          // Store trailers (status metadata)
          if (statusMetadata) {
            updatedResponse.trailers = statusMetadata;
          }

          // Handle error status (non-zero code)
          if (statusCode !== 0) {
            updatedResponse.isError = true;
            updatedResponse.error = statusDetails || `gRPC error with code ${statusCode} (${updatedResponse.statusText})`;
          }

          break;

        case 'error':
          // Extract error details
          const errorCode = eventData.error?.code || 2; // Default to UNKNOWN if no code
          const errorDetails = eventData.error?.details || eventData.error?.message;
          const errorMetadata = eventData.error?.metadata;

          updatedResponse.isError = true;
          updatedResponse.error = errorDetails || 'Unknown gRPC error';
          updatedResponse.statusCode = errorCode;
          updatedResponse.statusText = grpcStatusCodes[errorCode] || 'UNKNOWN';
          updatedResponse.statusDescription = errorDetails;

          // Store error metadata as trailers if present
          if (errorMetadata) {
            updatedResponse.trailers = errorMetadata;
          }

          break;

        case 'end':
          state.activeConnections = state.activeConnections.filter((id) => id !== itemUid);
          break;

        case 'cancel':
          updatedResponse.statusCode = 1; // CANCELLED
          updatedResponse.statusText = 'CANCELLED';
          updatedResponse.statusDescription = 'Stream cancelled by client or server';
          state.activeConnections = state.activeConnections.filter((id) => id !== itemUid);
          break;
      }

      item.requestState = 'received';
      item.response = updatedResponse;

      // Update the timeline
      if (!collection?.timeline) {
        collection.timeline = [];
      }

      // Append the new timeline entry with specific gRPC event type
      collection.timeline.push({
        type: 'request',
        eventType: eventType, // Add the specific gRPC event type
        collectionUid: collection.uid,
        folderUid: null,
        itemUid: item.uid,
        timestamp: Date.now(),
        data: {
          request: item.requestSent || item.request,
          response: updatedResponse,
          eventData: eventData, // Store the original event data
          timestamp: Date.now()
        }
      });
    },
    responseCleared: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);
        if (item) {
          if (item.response && item.response.stream?.running) {
            item.response.data = '';
            item.response.size = 0;
            return;
          }
          item.response = null;
        }
      }
    },
    clearTimeline: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        collection.timeline = [];
      }
    },
    clearRequestTimeline: (state, action) => {
      const { collectionUid, itemUid } = action.payload || {};
      const collection = findCollectionByUid(state.collections, collectionUid);

      if (collection) {
        if (itemUid) {
          collection.timeline = collection?.timeline?.filter((t) => t?.itemUid !== itemUid);
        }
      }
    },
    saveRequest: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && item.draft) {
          item.request = item.draft.request;
          if (item.draft.settings) {
            item.settings = item.draft.settings;
          }
          item.draft = null;
        }
      }
    },
    deleteRequestDraft: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && item.draft) {
          item.draft = null;
        }
      }
    },
    saveCollectionDraft: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection && collection.draft) {
        if (collection.draft.root) {
          collection.root = collection.draft.root;
        }
        if (collection.draft.brunoConfig) {
          collection.brunoConfig = collection.draft.brunoConfig;
        }
        collection.draft = null;
      }
    },
    saveFolderDraft: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const folder = collection ? findItemInCollection(collection, action.payload.folderUid) : null;

      if (folder && folder.draft) {
        folder.root = folder.draft;
        folder.draft = null;
      }
    },
    deleteCollectionDraft: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection && collection.draft) {
        collection.draft = null;
      }
    },
    deleteFolderDraft: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const folder = collection ? findItemInCollection(collection, action.payload.folderUid) : null;

      if (folder && folder.draft) {
        folder.draft = null;
      }
    },
    setEnvironmentsDraft: (state, action) => {
      const { collectionUid, environmentUid, variables } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);
      if (collection) {
        collection.environmentsDraft = { environmentUid, variables };
      }
    },
    clearEnvironmentsDraft: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      if (collection) {
        collection.environmentsDraft = null;
      }
    },
    newEphemeralHttpRequest: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection && collection.items && collection.items.length) {
        const parts = splitOnFirst(action.payload.requestUrl, '?');
        const queryParams = parseQueryParams(parts[1]);

        let pathParams = [];
        try {
          pathParams = parsePathParams(parts[0]);
        } catch (err) {
          console.error(err);
          toast.error(err.message);
        }

        const queryParamObjects = queryParams.map((param) => ({
          uid: uuid(),
          name: param.key,
          value: param.value,
          description: '',
          type: 'query',
          enabled: true
        }));

        const pathParamObjects = pathParams.map((param) => ({
          uid: uuid(),
          name: param.key,
          value: param.value,
          description: '',
          type: 'path',
          enabled: true
        }));

        const params = [...queryParamObjects, ...pathParamObjects];

        const item = {
          uid: action.payload.uid,
          name: action.payload.requestName,
          type: action.payload.requestType,
          isTransient: false,
          request: {
            url: action.payload.requestUrl,
            method: action.payload.requestMethod,
            params,
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
    toggleCollection: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload);

      if (collection) {
        collection.collapsed = !collection.collapsed;
      }
    },
    toggleCollectionItem: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && item.type === 'folder') {
          item.collapsed = !item.collapsed;
        }
      }
    },
    requestUrlChanged: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.request.url = action.payload.url;
          item.draft.request.params = item?.draft?.request?.params ?? [];
          item.request.params = item?.request?.params ?? [];

          const parts = splitOnFirst(item?.draft?.request?.url, '?');
          const urlQueryParams = parseQueryParams(parts[1]);
          let urlPathParams = [];

          try {
            urlPathParams = parsePathParams(parts[0]);
          } catch (err) {
            console.error(err);
            toast.error(err.message);
          }

          const disabledQueryParams = filter(item?.draft?.request?.params, (p) => !p.enabled && p.type === 'query');
          let enabledQueryParams = filter(item?.draft?.request?.params, (p) => p.enabled && p.type === 'query');
          let oldPathParams = filter(item?.draft?.request?.params, (p) => p.enabled && p.type === 'path');
          let newPathParams = [];

          // try and connect as much as old params uid's as possible
          each(urlQueryParams, (urlQueryParam) => {
            const existingQueryParam = find(
              enabledQueryParams,
              (p) => p?.name === urlQueryParam?.name || p?.value === urlQueryParam?.value
            );
            urlQueryParam.uid = existingQueryParam?.uid || uuid();
            urlQueryParam.enabled = true;
            urlQueryParam.type = 'query';

            // once found, remove it - trying our best here to accommodate duplicate query params
            if (existingQueryParam) {
              enabledQueryParams = filter(enabledQueryParams, (p) => p?.uid !== existingQueryParam?.uid);
            }
          });

          // filter the newest path param and compare with previous data that already inserted
          newPathParams = filter(urlPathParams, (urlPath) => {
            const existingPathParam = find(oldPathParams, (p) => p.name === urlPath.name);
            if (existingPathParam) {
              return false;
            }
            urlPath.uid = uuid();
            urlPath.enabled = true;
            urlPath.type = 'path';
            return true;
          });

          // remove path param that not used or deleted when typing url
          oldPathParams = filter(oldPathParams, (urlPath) => {
            return find(urlPathParams, (p) => p.name === urlPath.name);
          });

          // ultimately params get replaced with params in url + the disabled ones that existed prior
          // the query params are the source of truth, the url in the queryurl input gets constructed using these params
          // we however are also storing the full url (with params) in the url itself
          item.draft.request.params = concat(urlQueryParams, newPathParams, disabledQueryParams, oldPathParams);
        }
      }
    },
    updateItemSettings: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.settings = { ...item.draft.settings, ...action.payload.settings };
        }
      }
    },
    updateAuth: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }

          item.draft.request.auth = item.draft.request.auth || {};
          switch (action.payload.mode) {
            case 'awsv4':
              item.draft.request.auth.mode = 'awsv4';
              item.draft.request.auth.awsv4 = action.payload.content;
              break;
            case 'bearer':
              item.draft.request.auth.mode = 'bearer';
              item.draft.request.auth.bearer = action.payload.content;
              break;
            case 'basic':
              item.draft.request.auth.mode = 'basic';
              item.draft.request.auth.basic = action.payload.content;
              break;
            case 'digest':
              item.draft.request.auth.mode = 'digest';
              item.draft.request.auth.digest = action.payload.content;
              break;
            case 'ntlm':
              item.draft.request.auth.mode = 'ntlm';
              item.draft.request.auth.ntlm = action.payload.content;
              break;
            case 'oauth2':
              item.draft.request.auth.mode = 'oauth2';
              item.draft.request.auth.oauth2 = action.payload.content;
              break;
            case 'wsse':
              item.draft.request.auth.mode = 'wsse';
              item.draft.request.auth.wsse = action.payload.content;
              break;
            case 'apikey':
              item.draft.request.auth.mode = 'apikey';
              item.draft.request.auth.apikey = action.payload.content;
              break;
          }
        }
      }
    },
    addQueryParam: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.request.params = item.draft.request.params || [];
          item.draft.request.params.push({
            uid: uuid(),
            name: '',
            value: '',
            description: '',
            type: 'query',
            enabled: true
          });
        }
      }
    },
    setQueryParams: (state, action) => {
      const { collectionUid, itemUid, params } = action.payload;

      const collection = findCollectionByUid(state.collections, collectionUid);
      if (!collection) {
        return;
      }

      const item = findItemInCollection(collection, itemUid);
      if (!item || !isItemARequest(item)) {
        return;
      }

      if (!item.draft) {
        item.draft = cloneDeep(item);
      }
      const existingOtherParams = item.draft.request.params?.filter((p) => p.type !== 'query') || [];
      const newQueryParams = map(params, ({ uid, name = '', value = '', description = '', type = 'query', enabled = true }) => ({
        uid: uid || uuid(),
        name,
        value,
        description,
        type,
        enabled
      }));

      item.draft.request.params = [...newQueryParams, ...existingOtherParams];

      // Update the request URL to reflect the new query params
      const parts = splitOnFirst(item.draft.request.url, '?');
      const query = stringifyQueryParams(
        filter(item.draft.request.params, (p) => p.enabled && p.type === 'query')
      );

      // If there are enabled query params, append them to the URL
      if (query && query.length) {
        item.draft.request.url = parts[0] + '?' + query;
      } else {
        // If no enabled query params, remove the query part from URL
        item.draft.request.url = parts[0];
      }
    },
    moveQueryParam: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          // Ensure item.draft is a deep clone of item if not already present
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }

          // Extract payload data
          const { updateReorderedItem } = action.payload;
          const params = item.draft.request.params;

          const queryParams = params.filter((param) => param.type === 'query');
          const pathParams = params.filter((param) => param.type === 'path');

          // Reorder only query params based on updateReorderedItem
          const reorderedQueryParams = updateReorderedItem.map((uid) => {
            return queryParams.find((param) => param.uid === uid);
          });
          item.draft.request.params = [...reorderedQueryParams, ...pathParams];

          // Update request URL
          const parts = splitOnFirst(item.draft.request.url, '?');
          const query = stringifyQueryParams(filter(item.draft.request.params, (p) => p.enabled && p.type === 'query'));
          if (query && query.length) {
            item.draft.request.url = parts[0] + '?' + query;
          } else {
            item.draft.request.url = parts[0];
          }
        }
      }
    },

    updateQueryParam: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          const queryParam = find(
            item.draft.request.params,
            (h) => h.uid === action.payload.queryParam.uid && h.type === 'query'
          );
          if (queryParam) {
            queryParam.name = action.payload.queryParam.name;
            queryParam.value = action.payload.queryParam.value;
            queryParam.enabled = action.payload.queryParam.enabled;

            // update request url
            const parts = splitOnFirst(item.draft.request.url, '?');
            const query = stringifyQueryParams(
              filter(item.draft.request.params, (p) => p.enabled && p.type === 'query')
            );

            // if no query is found, then strip the query params in url
            if (!query || !query.length) {
              if (parts.length) {
                item.draft.request.url = parts[0];
              }
              return;
            }

            // if no parts were found, then append the query
            if (!parts.length) {
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

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.request.params = filter(item.draft.request.params, (p) => p.uid !== action.payload.paramUid);

          // update request url
          const parts = splitOnFirst(item.draft.request.url, '?');
          const query = stringifyQueryParams(filter(item.draft.request.params, (p) => p.enabled && p.type === 'query'));
          if (query && query.length) {
            item.draft.request.url = parts[0] + '?' + query;
          } else {
            item.draft.request.url = parts[0];
          }
        }
      }
    },
    updatePathParam: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }

          const param = find(
            item.draft.request.params,
            (p) => p.uid === action.payload.pathParam.uid && p.type === 'path'
          );

          if (param) {
            param.name = action.payload.pathParam.name;
            param.value = action.payload.pathParam.value;
          }
        }
      }
    },
    addRequestHeader: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
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

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          const header = find(item.draft.request.headers, (h) => h.uid === action.payload.header.uid);
          if (header) {
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

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.request.headers = filter(item.draft.request.headers, (h) => h.uid !== action.payload.headerUid);
        }
      }
    },
    moveRequestHeader: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          // Ensure item.draft is a deep clone of item if not already present
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }

          // Extract payload data
          const { updateReorderedItem } = action.payload;
          const params = item.draft.request.headers;

          item.draft.request.headers = updateReorderedItem.map((uid) => {
            return params.find((param) => param.uid === uid);
          });
        }
      }
    },
    setRequestHeaders: (state, action) => {
      const { collectionUid, itemUid, headers } = action.payload;

      const collection = findCollectionByUid(state.collections, collectionUid);
      if (!collection) {
        return;
      }

      const item = findItemInCollection(collection, itemUid);
      if (!item || !isItemARequest(item)) {
        return;
      }

      if (!item.draft) {
        item.draft = cloneDeep(item);
      }
      item.draft.request.headers = map(action.payload.headers, ({ uid, name = '', value = '', description = '', enabled = true }) => ({
        uid: uid || uuid(),
        name,
        value,
        description,
        enabled
      }));
    },
    setCollectionHeaders: (state, action) => {
      const { collectionUid, headers } = action.payload;

      const collection = findCollectionByUid(state.collections, collectionUid);
      if (!collection) {
        return;
      }

      if (!collection.draft) {
        collection.draft = {
          root: cloneDeep(collection.root) || {}
        };
      }
      if (!collection.draft.root) {
        collection.draft.root = {};
      }
      if (!collection.draft.root.request) {
        collection.draft.root.request = {};
      }

      collection.draft.root.request.headers = map(headers, ({ uid, name = '', value = '', description = '', enabled = true }) => ({
        uid: uid || uuid(),
        name,
        value,
        description,
        enabled
      }));
    },
    setFolderHeaders: (state, action) => {
      const { collectionUid, folderUid, headers } = action.payload;

      const collection = findCollectionByUid(state.collections, collectionUid);
      if (!collection) {
        return;
      }

      const folder = findItemInCollection(collection, folderUid);
      if (!folder || !isItemAFolder(folder)) {
        return;
      }

      if (!folder.draft) {
        folder.draft = cloneDeep(folder.root) || {};
      }
      if (!folder.draft.request) {
        folder.draft.request = {};
      }
      folder.draft.request.headers = map(headers, ({ uid, name = '', value = '', description = '', enabled = true }) => ({
        uid: uid || uuid(),
        name,
        value,
        description,
        enabled
      }));
    },
    addFormUrlEncodedParam: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
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

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          const param = find(item.draft.request.body.formUrlEncoded, (p) => p.uid === action.payload.param.uid);
          if (param) {
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

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.request.body.formUrlEncoded = filter(
            item.draft.request.body.formUrlEncoded,
            (p) => p.uid !== action.payload.paramUid
          );
        }
      }
    },
    setFormUrlEncodedParams: (state, action) => {
      const { collectionUid, itemUid, params } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);
      if (!collection) return;

      const item = findItemInCollection(collection, itemUid);
      if (!item || !isItemARequest(item)) return;

      if (!item.draft) {
        item.draft = cloneDeep(item);
      }
      item.draft.request.body.formUrlEncoded = map(params, ({ uid, name = '', value = '', description = '', enabled = true }) => ({
        uid: uid || uuid(),
        name,
        value,
        description,
        enabled
      }));
    },
    moveFormUrlEncodedParam: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }

          const { updateReorderedItem } = action.payload;
          const params = item.draft.request.body.formUrlEncoded;

          item.draft.request.body.formUrlEncoded = updateReorderedItem.map((uid) => {
            return params.find((param) => param.uid === uid);
          });
        }
      }
    },
    addMultipartFormParam: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.request.body.multipartForm = item.draft.request.body.multipartForm || [];
          item.draft.request.body.multipartForm.push({
            uid: uuid(),
            type: action.payload.type,
            name: '',
            value: action.payload.value,
            description: '',
            contentType: '',
            enabled: true
          });
        }
      }
    },
    updateMultipartFormParam: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          const param = find(item.draft.request.body.multipartForm, (p) => p.uid === action.payload.param.uid);
          if (param) {
            param.type = action.payload.param.type;
            param.name = action.payload.param.name;
            param.value = action.payload.param.value;
            param.description = action.payload.param.description;
            param.contentType = action.payload.param.contentType;
            param.enabled = action.payload.param.enabled;
          }
        }
      }
    },
    deleteMultipartFormParam: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.request.body.multipartForm = filter(
            item.draft.request.body.multipartForm,
            (p) => p.uid !== action.payload.paramUid
          );
        }
      }
    },
    setMultipartFormParams: (state, action) => {
      const { collectionUid, itemUid, params } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);
      if (!collection) return;

      const item = findItemInCollection(collection, itemUid);
      if (!item || !isItemARequest(item)) return;

      if (!item.draft) {
        item.draft = cloneDeep(item);
      }
      item.draft.request.body.multipartForm = map(params, ({ uid, name = '', value = '', contentType = '', type = 'text', enabled = true }) => ({
        uid: uid || uuid(),
        name,
        value,
        contentType,
        type,
        enabled
      }));
    },
    moveMultipartFormParam: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }

          const { updateReorderedItem } = action.payload;
          const params = item.draft.request.body.multipartForm;

          item.draft.request.body.multipartForm = updateReorderedItem.map((uid) => {
            return params.find((param) => param.uid === uid);
          });
        }
      }
    },
    addFile: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.request.body.file = item.draft.request.body.file || [];

          item.draft.request.body.file.push({
            uid: uuid(),
            filePath: '',
            contentType: '',
            selected: false
          });
        }
      }
    },
    updateFile: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }

          const param = find(item.draft.request.body.file, (p) => p.uid === action.payload.param.uid);

          if (param) {
            const contentType = mime.contentType(path.extname(action.payload.param.filePath));
            param.filePath = action.payload.param.filePath;
            param.contentType = action.payload.param.contentType || contentType || '';
            param.selected = action.payload.param.selected;

            item.draft.request.body.file = item.draft.request.body.file.map((p) => {
              p.selected = p.uid === param.uid;
              return p;
            });
          }
        }
      }
    },
    deleteFile: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }

          item.draft.request.body.file = filter(
            item.draft.request.body.file,
            (p) => p.uid !== action.payload.paramUid
          );

          if (item.draft.request.body.file.length > 0) {
            item.draft.request.body.file[0].selected = true;
          }
        }
      }
    },
    updateRequestAuthMode: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection && collection.items && collection.items.length) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.request.auth = {};
          item.draft.request.auth.mode = action.payload.mode;
        }
      }
    },
    updateRequestBodyMode: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.request.body.mode = action.payload.mode;
        }
      }
    },
    updateRequestBody: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }

          switch (item.draft.request.body.mode) {
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
            case 'sparql': {
              item.draft.request.body.sparql = action.payload.content;
              break;
            }
            case 'file': {
              item.draft.request.body.file = action.payload.content;
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
            case 'grpc': {
              item.draft.request.body.grpc = action.payload.content;
              break;
            }
            case 'ws': {
              item.draft.request.body.ws = action.payload.content;
              break;
            }
          }
        }
      }
    },
    updateRequestGraphqlQuery: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.request.body.mode = 'graphql';
          item.draft.request.body.graphql = item.draft.request.body.graphql || {};
          item.draft.request.body.graphql.query = action.payload.query;
        }
      }
    },
    updateRequestGraphqlVariables: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.request.body.mode = 'graphql';
          item.draft.request.body.graphql = item.draft.request.body.graphql || {};
          item.draft.request.body.graphql.variables = action.payload.variables;
        }
      }
    },
    updateRequestScript: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.request.script = item.draft.request.script || {};
          item.draft.request.script.req = action.payload.script;
        }
      }
    },
    updateResponseScript: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.request.script = item.draft.request.script || {};
          item.draft.request.script.res = action.payload.script;
        }
      }
    },
    updateRequestTests: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.request.tests = action.payload.tests;
        }
      }
    },
    updateRequestMethod: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.request.method = action.payload.method;
          item.draft.request.methodType = action.payload.methodType;
        }
      }
    },
    updateRequestProtoPath: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.request.protoPath = action.payload.protoPath;
        }
      }
    },
    addAssertion: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.request.assertions = item.draft.request.assertions || [];
          item.draft.request.assertions.push({
            uid: uuid(),
            name: '',
            value: '',
            enabled: true
          });
        }
      }
    },
    updateAssertion: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          const assertion = item.draft.request.assertions.find((a) => a.uid === action.payload.assertion.uid);
          if (assertion) {
            assertion.name = action.payload.assertion.name;
            assertion.value = action.payload.assertion.value;
            assertion.enabled = action.payload.assertion.enabled;
          }
        }
      }
    },
    deleteAssertion: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.request.assertions = item.draft.request.assertions.filter(
            (a) => a.uid !== action.payload.assertUid
          );
        }
      }
    },
    setRequestAssertions: (state, action) => {
      const { collectionUid, itemUid, assertions } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);
      if (!collection) return;

      const item = findItemInCollection(collection, itemUid);
      if (!item || !isItemARequest(item)) return;

      if (!item.draft) {
        item.draft = cloneDeep(item);
      }
      item.draft.request.assertions = map(assertions, ({ uid, name = '', value = '', operator = 'eq', enabled = true }) => ({
        uid: uid || uuid(),
        name,
        value,
        operator,
        enabled
      }));
    },
    moveAssertion: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }

          const { updateReorderedItem } = action.payload;
          const params = item.draft.request.assertions;

          item.draft.request.assertions = updateReorderedItem.map((uid) => {
            return params.find((param) => param.uid === uid);
          });
        }
      }
    },
    addVar: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const type = action.payload.type;
      const varData = action.payload.var || {};

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          if (type === 'request') {
            item.draft.request.vars = item.draft.request.vars || {};
            item.draft.request.vars.req = item.draft.request.vars.req || [];
            item.draft.request.vars.req.push({
              uid: uuid(),
              name: varData.name || '',
              value: varData.value || '',
              local: varData.local === true,
              enabled: varData.enabled !== false
            });
          } else if (type === 'response') {
            item.draft.request.vars = item.draft.request.vars || {};
            item.draft.request.vars.res = item.draft.request.vars.res || [];
            item.draft.request.vars.res.push({
              uid: uuid(),
              name: '',
              value: '',
              local: false,
              enabled: true
            });
          }
        }
      }
    },
    updateVar: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const type = action.payload.type;

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          if (type === 'request') {
            item.draft.request.vars = item.draft.request.vars || {};
            item.draft.request.vars.req = item.draft.request.vars.req || [];

            const reqVar = find(item.draft.request.vars.req, (v) => v.uid === action.payload.var.uid);
            if (reqVar) {
              reqVar.name = action.payload.var.name;
              reqVar.value = action.payload.var.value;
              reqVar.description = action.payload.var.description;
              reqVar.enabled = action.payload.var.enabled;
            }
          } else if (type === 'response') {
            item.draft.request.vars = item.draft.request.vars || {};
            item.draft.request.vars.res = item.draft.request.vars.res || [];
            const resVar = find(item.draft.request.vars.res, (v) => v.uid === action.payload.var.uid);
            if (resVar) {
              resVar.name = action.payload.var.name;
              resVar.value = action.payload.var.value;
              resVar.description = action.payload.var.description;
              resVar.enabled = action.payload.var.enabled;
            }
          }
        }
      }
    },
    deleteVar: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const type = action.payload.type;

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          if (type === 'request') {
            item.draft.request.vars = item.draft.request.vars || {};
            item.draft.request.vars.req = item.draft.request.vars.req || [];
            item.draft.request.vars.req = item.draft.request.vars.req.filter((v) => v.uid !== action.payload.varUid);
          } else if (type === 'response') {
            item.draft.request.vars = item.draft.request.vars || {};
            item.draft.request.vars.res = item.draft.request.vars.res || [];
            item.draft.request.vars.res = item.draft.request.vars.res.filter((v) => v.uid !== action.payload.varUid);
          }
        }
      }
    },
    setRequestVars: (state, action) => {
      const { collectionUid, itemUid, vars, type } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);
      if (!collection) return;

      const item = findItemInCollection(collection, itemUid);
      if (!item || !isItemARequest(item)) return;

      if (!item.draft) {
        item.draft = cloneDeep(item);
      }
      item.draft.request.vars = item.draft.request.vars || {};
      const mappedVars = map(vars, ({ uid, name = '', value = '', enabled = true, local = false }) => ({
        uid: uid || uuid(),
        name,
        value,
        enabled,
        ...(type === 'response' ? { local } : {})
      }));
      if (type === 'request') {
        item.draft.request.vars.req = mappedVars;
      } else if (type === 'response') {
        item.draft.request.vars.res = mappedVars;
      }
    },
    moveVar: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const type = action.payload.type;

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          // Ensure item.draft is a deep clone of item if not already present
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }

          // Extract payload data
          const { updateReorderedItem } = action.payload;
          if (type == 'request') {
            const params = item.draft.request.vars.req;

            item.draft.request.vars.req = updateReorderedItem.map((uid) => {
              return params.find((param) => param.uid === uid);
            });
          } else if (type === 'response') {
            const params = item.draft.request.vars.res;

            item.draft.request.vars.res = updateReorderedItem.map((uid) => {
              return params.find((param) => param.uid === uid);
            });
          }
        }
      }
    },
    updateCollectionAuthMode: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        if (!collection.draft) {
          collection.draft = {
            root: cloneDeep(collection.root)
          };
        }
        set(collection, 'draft.root.request.auth', {});
        set(collection, 'draft.root.request.auth.mode', action.payload.mode);
      }
    },
    updateCollectionAuth: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        if (!collection.draft) {
          collection.draft = {
            root: cloneDeep(collection.root)
          };
        }
        set(collection, 'draft.root.request.auth', {});
        set(collection, 'draft.root.request.auth.mode', action.payload.mode);
        switch (action.payload.mode) {
          case 'awsv4':
            set(collection, 'draft.root.request.auth.awsv4', action.payload.content);
            break;
          case 'bearer':
            set(collection, 'draft.root.request.auth.bearer', action.payload.content);
            break;
          case 'basic':
            set(collection, 'draft.root.request.auth.basic', action.payload.content);
            break;
          case 'digest':
            set(collection, 'draft.root.request.auth.digest', action.payload.content);
            break;
          case 'ntlm':
            set(collection, 'draft.root.request.auth.ntlm', action.payload.content);
            break;
          case 'oauth2':
            set(collection, 'draft.root.request.auth.oauth2', action.payload.content);
            break;
          case 'wsse':
            set(collection, 'draft.root.request.auth.wsse', action.payload.content);
            break;
          case 'apikey':
            set(collection, 'draft.root.request.auth.apikey', action.payload.content);
            break;
        }
      }
    },
    updateCollectionRequestScript: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        if (!collection.draft) {
          collection.draft = {
            root: cloneDeep(collection.root)
          };
        }
        set(collection, 'draft.root.request.script.req', action.payload.script);
      }
    },
    updateCollectionResponseScript: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        if (!collection.draft) {
          collection.draft = {
            root: cloneDeep(collection.root)
          };
        }
        set(collection, 'draft.root.request.script.res', action.payload.script);
      }
    },
    updateCollectionTests: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        if (!collection.draft) {
          collection.draft = {
            root: cloneDeep(collection.root)
          };
        }
        set(collection, 'draft.root.request.tests', action.payload.tests);
      }
    },
    updateCollectionDocs: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        if (!collection.draft) {
          collection.draft = {
            root: cloneDeep(collection.root)
          };
        }
        set(collection, 'draft.root.docs', action.payload.docs);
      }
    },
    updateCollectionProxy: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        if (!collection.draft) {
          collection.draft = {
            root: cloneDeep(collection.root),
            brunoConfig: cloneDeep(collection.brunoConfig)
          };
        }
        if (!collection.draft.brunoConfig) {
          collection.draft.brunoConfig = cloneDeep(collection.brunoConfig);
        }
        set(collection, 'draft.brunoConfig.proxy', action.payload.proxy);
      }
    },
    updateCollectionClientCertificates: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        if (!collection.draft) {
          collection.draft = {
            root: cloneDeep(collection.root),
            brunoConfig: cloneDeep(collection.brunoConfig)
          };
        }
        if (!collection.draft.brunoConfig) {
          collection.draft.brunoConfig = cloneDeep(collection.brunoConfig);
        }
        set(collection, 'draft.brunoConfig.clientCertificates', action.payload.clientCertificates);
      }
    },
    updateCollectionPresets: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        if (!collection.draft) {
          collection.draft = {
            root: cloneDeep(collection.root),
            brunoConfig: cloneDeep(collection.brunoConfig)
          };
        }
        if (!collection.draft.brunoConfig) {
          collection.draft.brunoConfig = cloneDeep(collection.brunoConfig);
        }
        set(collection, 'draft.brunoConfig.presets', action.payload.presets);
      }
    },
    updateCollectionProtobuf: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        if (!collection.draft) {
          collection.draft = {
            root: cloneDeep(collection.root),
            brunoConfig: cloneDeep(collection.brunoConfig)
          };
        }
        if (!collection.draft.brunoConfig) {
          collection.draft.brunoConfig = cloneDeep(collection.brunoConfig);
        }
        set(collection, 'draft.brunoConfig.protobuf', action.payload.protobuf);
      }
    },
    addFolderHeader: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const folder = collection ? findItemInCollection(collection, action.payload.folderUid) : null;
      if (folder) {
        if (!folder.draft) {
          folder.draft = cloneDeep(folder.root);
        }
        const headers = get(folder, 'draft.request.headers', []);
        headers.push({
          uid: uuid(),
          name: '',
          value: '',
          description: '',
          enabled: true
        });
        set(folder, 'draft.request.headers', headers);
      }
    },
    updateFolderHeader: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const folder = collection ? findItemInCollection(collection, action.payload.folderUid) : null;
      if (folder) {
        if (!folder.draft) {
          folder.draft = cloneDeep(folder.root);
        }
        const headers = get(folder, 'draft.request.headers', []);
        const header = find(headers, (h) => h.uid === action.payload.header.uid);
        if (header) {
          header.name = action.payload.header.name;
          header.value = action.payload.header.value;
          header.description = action.payload.header.description;
          header.enabled = action.payload.header.enabled;
        }
      }
    },
    deleteFolderHeader: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const folder = collection ? findItemInCollection(collection, action.payload.folderUid) : null;
      if (folder) {
        if (!folder.draft) {
          folder.draft = cloneDeep(folder.root);
        }
        let headers = get(folder, 'draft.request.headers', []);
        headers = filter(headers, (h) => h.uid !== action.payload.headerUid);
        set(folder, 'draft.request.headers', headers);
      }
    },
    addFolderVar: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const folder = collection ? findItemInCollection(collection, action.payload.folderUid) : null;
      const type = action.payload.type;
      const varData = action.payload.var || {};
      if (folder) {
        if (!folder.draft) {
          folder.draft = cloneDeep(folder.root);
        }
        if (type === 'request') {
          const vars = get(folder, 'draft.request.vars.req', []);
          vars.push({
            uid: uuid(),
            name: varData.name || '',
            value: varData.value || '',
            enabled: varData.enabled !== false
          });
          set(folder, 'draft.request.vars.req', vars);
        } else if (type === 'response') {
          const vars = get(folder, 'draft.request.vars.res', []);
          vars.push({
            uid: uuid(),
            name: '',
            value: '',
            enabled: true
          });
          set(folder, 'draft.request.vars.res', vars);
        }
      }
    },
    updateFolderVar: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const folder = collection ? findItemInCollection(collection, action.payload.folderUid) : null;
      const type = action.payload.type;
      if (folder) {
        if (!folder.draft) {
          folder.draft = cloneDeep(folder.root);
        }
        if (type === 'request') {
          let vars = get(folder, 'draft.request.vars.req', []);
          const _var = find(vars, (h) => h.uid === action.payload.var.uid);
          if (_var) {
            _var.name = action.payload.var.name;
            _var.value = action.payload.var.value;
            _var.description = action.payload.var.description;
            _var.enabled = action.payload.var.enabled;
          }
          set(folder, 'draft.request.vars.req', vars);
        } else if (type === 'response') {
          let vars = get(folder, 'draft.request.vars.res', []);
          const _var = find(vars, (h) => h.uid === action.payload.var.uid);
          if (_var) {
            _var.name = action.payload.var.name;
            _var.value = action.payload.var.value;
            _var.description = action.payload.var.description;
            _var.enabled = action.payload.var.enabled;
          }
          set(folder, 'draft.request.vars.res', vars);
        }
      }
    },
    deleteFolderVar: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const folder = collection ? findItemInCollection(collection, action.payload.folderUid) : null;
      const type = action.payload.type;
      if (folder) {
        if (!folder.draft) {
          folder.draft = cloneDeep(folder.root);
        }
        if (type === 'request') {
          let vars = get(folder, 'draft.request.vars.req', []);
          vars = filter(vars, (h) => h.uid !== action.payload.varUid);
          set(folder, 'draft.request.vars.req', vars);
        } else if (type === 'response') {
          let vars = get(folder, 'draft.request.vars.res', []);
          vars = filter(vars, (h) => h.uid !== action.payload.varUid);
          set(folder, 'draft.request.vars.res', vars);
        }
      }
    },
    setFolderVars: (state, action) => {
      const { collectionUid, folderUid, vars, type } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);
      const folder = collection ? findItemInCollection(collection, folderUid) : null;
      if (!folder) {
        return;
      }
      if (!folder.draft) {
        folder.draft = cloneDeep(folder.root);
      }
      const mappedVars = map(vars, ({ uid, name = '', value = '', enabled = true, local = false }) => ({
        uid: uid || uuid(),
        name,
        value,
        enabled,
        ...(type === 'response' ? { local } : {})
      }));
      if (type === 'request') {
        set(folder, 'draft.request.vars.req', mappedVars);
      } else if (type === 'response') {
        set(folder, 'draft.request.vars.res', mappedVars);
      }
    },
    updateFolderRequestScript: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const folder = collection ? findItemInCollection(collection, action.payload.folderUid) : null;
      if (folder) {
        if (!folder.draft) {
          folder.draft = cloneDeep(folder.root);
        }
        set(folder, 'draft.request.script.req', action.payload.script);
      }
    },
    updateFolderResponseScript: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const folder = collection ? findItemInCollection(collection, action.payload.folderUid) : null;
      if (folder) {
        if (!folder.draft) {
          folder.draft = cloneDeep(folder.root);
        }
        set(folder, 'draft.request.script.res', action.payload.script);
      }
    },
    updateFolderTests: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const folder = collection ? findItemInCollection(collection, action.payload.folderUid) : null;
      if (folder) {
        if (!folder.draft) {
          folder.draft = cloneDeep(folder.root);
        }
        set(folder, 'draft.request.tests', action.payload.tests);
      }
    },
    updateFolderAuth: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      if (!collection) return;

      const folder = collection ? findItemInCollection(collection, action.payload.folderUid) : null;
      if (!folder) return;

      if (folder) {
        if (!folder.draft) {
          folder.draft = cloneDeep(folder.root);
        }
        set(folder, 'draft.request.auth', {});
        set(folder, 'draft.request.auth.mode', action.payload.mode);
        switch (action.payload.mode) {
          case 'oauth2':
            set(folder, 'draft.request.auth.oauth2', action.payload.content);
            break;
          case 'basic':
            set(folder, 'draft.request.auth.basic', action.payload.content);
            break;
          case 'bearer':
            set(folder, 'draft.request.auth.bearer', action.payload.content);
            break;
          case 'digest':
            set(folder, 'draft.request.auth.digest', action.payload.content);
            break;
          case 'ntlm':
            set(folder, 'draft.request.auth.ntlm', action.payload.content);
            break;
          case 'apikey':
            set(folder, 'draft.request.auth.apikey', action.payload.content);
            break;
          case 'awsv4':
            set(folder, 'draft.request.auth.awsv4', action.payload.content);
            break;
          case 'wsse':
            set(folder, 'draft.request.auth.wsse', action.payload.content);
            break;
          case 'ws':
            set(folder, 'draft.request.auth.ws', action.payload.content);
            break;
        }
      }
    },
    addCollectionHeader: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        if (!collection.draft) {
          collection.draft = {
            root: cloneDeep(collection.root)
          };
        }
        const headers = get(collection, 'draft.root.request.headers', []);
        headers.push({
          uid: uuid(),
          name: '',
          value: '',
          description: '',
          enabled: true
        });
        set(collection, 'draft.root.request.headers', headers);
      }
    },
    updateCollectionHeader: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        if (!collection.draft) {
          collection.draft = {
            root: cloneDeep(collection.root)
          };
        }
        const headers = get(collection, 'draft.root.request.headers', []);
        const header = find(headers, (h) => h.uid === action.payload.header.uid);
        if (header) {
          header.name = action.payload.header.name;
          header.value = action.payload.header.value;
          header.description = action.payload.header.description;
          header.enabled = action.payload.header.enabled;
        }
      }
    },
    deleteCollectionHeader: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        if (!collection.draft) {
          collection.draft = {
            root: cloneDeep(collection.root)
          };
        }
        let headers = get(collection, 'draft.root.request.headers', []);
        headers = filter(headers, (h) => h.uid !== action.payload.headerUid);
        set(collection, 'draft.root.request.headers', headers);
      }
    },
    addCollectionVar: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const type = action.payload.type;
      const varData = action.payload.var || {};
      if (collection) {
        if (!collection.draft) {
          collection.draft = {
            root: cloneDeep(collection.root)
          };
        }
        if (type === 'request') {
          const vars = get(collection, 'draft.root.request.vars.req', []);
          vars.push({
            uid: uuid(),
            name: varData.name || '',
            value: varData.value || '',
            enabled: varData.enabled !== false
          });
          set(collection, 'draft.root.request.vars.req', vars);
        } else if (type === 'response') {
          const vars = get(collection, 'draft.root.request.vars.res', []);
          vars.push({
            uid: uuid(),
            name: '',
            value: '',
            local: false,
            enabled: true
          });
          set(collection, 'draft.root.request.vars.res', vars);
        }
      }
    },
    updateCollectionVar: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const type = action.payload.type;
      if (collection) {
        if (!collection.draft) {
          collection.draft = {
            root: cloneDeep(collection.root)
          };
        }
        if (type === 'request') {
          let vars = get(collection, 'draft.root.request.vars.req', []);
          const _var = find(vars, (h) => h.uid === action.payload.var.uid);
          if (_var) {
            _var.name = action.payload.var.name;
            _var.value = action.payload.var.value;
            _var.description = action.payload.var.description;
            _var.enabled = action.payload.var.enabled;
          }
          set(collection, 'draft.root.request.vars.req', vars);
        } else if (type === 'response') {
          let vars = get(collection, 'draft.root.request.vars.res', []);
          const _var = find(vars, (h) => h.uid === action.payload.var.uid);
          if (_var) {
            _var.name = action.payload.var.name;
            _var.value = action.payload.var.value;
            _var.description = action.payload.var.description;
            _var.enabled = action.payload.var.enabled;
          }
          set(collection, 'draft.root.request.vars.res', vars);
        }
      }
    },
    deleteCollectionVar: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const type = action.payload.type;
      if (collection) {
        if (!collection.draft) {
          collection.draft = {
            root: cloneDeep(collection.root)
          };
        }
        if (type === 'request') {
          let vars = get(collection, 'draft.root.request.vars.req', []);
          vars = filter(vars, (h) => h.uid !== action.payload.varUid);
          set(collection, 'draft.root.request.vars.req', vars);
        } else if (type === 'response') {
          let vars = get(collection, 'draft.root.request.vars.res', []);
          vars = filter(vars, (h) => h.uid !== action.payload.varUid);
          set(collection, 'draft.root.request.vars.res', vars);
        }
      }
    },
    setCollectionVars: (state, action) => {
      const { collectionUid, vars, type } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);
      if (!collection) {
        return;
      }
      if (!collection.draft) {
        collection.draft = {
          root: cloneDeep(collection.root)
        };
      }
      const mappedVars = map(vars, ({ uid, name = '', value = '', enabled = true, local = false }) => ({
        uid: uid || uuid(),
        name,
        value,
        enabled,
        ...(type === 'response' ? { local } : {})
      }));
      if (type === 'request') {
        set(collection, 'draft.root.request.vars.req', mappedVars);
      } else if (type === 'response') {
        set(collection, 'draft.root.request.vars.res', mappedVars);
      }
    },
    collectionAddFileEvent: (state, action) => {
      const file = action.payload.file;
      const isCollectionRoot = file.meta.collectionRoot ? true : false;
      const isFolderRoot = file.meta.folderRoot ? true : false;
      const collection = findCollectionByUid(state.collections, file.meta.collectionUid);
      if (isCollectionRoot) {
        if (collection) {
          collection.root = file.data;
        }
        return;
      }

      if (isFolderRoot) {
        const folderPath = path.dirname(file.meta.pathname);
        const folderItem = findItemInCollectionByPathname(collection, folderPath);
        if (folderItem) {
          if (file?.data?.meta?.name) {
            folderItem.name = file?.data?.meta?.name;
          }
          folderItem.root = file.data;
          if (file?.data?.meta?.seq) {
            folderItem.seq = file.data?.meta?.seq;
          }
        }
        return;
      }

      if (collection) {
        const dirname = path.dirname(file.meta.pathname);

        const tempDirectory = state.tempDirectories?.[file.meta.collectionUid];
        const isTransientFile = tempDirectory && file.meta.pathname.startsWith(tempDirectory);

        const subDirectories = getSubdirectoriesFromRoot(collection.pathname, dirname);
        let currentPath = collection.pathname;
        let currentSubItems = collection.items;
        for (const directoryName of subDirectories) {
          let childItem = currentSubItems.find((f) => f.type === 'folder' && f.filename === directoryName);
          currentPath = path.join(currentPath, directoryName);
          if (!childItem) {
            childItem = {
              uid: uuid(),
              pathname: currentPath,
              name: directoryName,
              collapsed: true,
              type: 'folder',
              isTransient: isTransientFile,
              items: []
            };
            currentSubItems.push(childItem);
          } else if (isTransientFile && !childItem.isTransient) {
            // Update existing folder to be transient if the file is transient
            childItem.isTransient = true;
          }
          currentSubItems = childItem.items;
        }

        if (file.meta.name != 'folder.bru' && !currentSubItems.find((f) => f.name === file.meta.name)) {
          // this happens when you rename a file
          // the add event might get triggered first, before the unlink event
          // this results in duplicate uids causing react renderer to go mad
          const currentItem = find(currentSubItems, (i) => i.uid === file.data.uid);
          if (currentItem) {
            currentItem.name = file.data.name;
            currentItem.type = file.data.type;
            currentItem.seq = file.data.seq;
            currentItem.tags = file.data.tags;
            currentItem.request = file.data.request;
            currentItem.filename = file.meta.name;
            currentItem.pathname = file.meta.pathname;
            currentItem.settings = file.data.settings;
            currentItem.examples = file.data.examples;
            currentItem.draft = null;
            currentItem.partial = file.partial;
            currentItem.loading = file.loading;
            currentItem.size = file.size;
            currentItem.error = file.error;
            currentItem.isTransient = isTransientFile;
          } else {
            currentSubItems.push({
              uid: file.data.uid,
              name: file.data.name,
              type: file.data.type,
              seq: file.data.seq,
              tags: file.data.tags,
              request: file.data.request,
              settings: file.data.settings,
              examples: file.data.examples,
              filename: file.meta.name,
              pathname: file.meta.pathname,
              draft: null,
              partial: file.partial,
              loading: file.loading,
              size: file.size,
              error: file.error,
              isTransient: isTransientFile
            });
          }
        }
        addDepth(collection.items);
      }
    },
    collectionAddDirectoryEvent: (state, action) => {
      const { dir } = action.payload;
      const collection = findCollectionByUid(state.collections, dir.meta.collectionUid);

      if (collection) {
        // Check if this directory is in a temp directory (transient request)
        const tempDirectory = state.tempDirectories?.[dir.meta.collectionUid];
        const isTransientDir = tempDirectory && dir.meta.pathname.startsWith(tempDirectory);

        const subDirectories = getSubdirectoriesFromRoot(collection.pathname, dir.meta.pathname);
        let currentPath = collection.pathname;
        let currentSubItems = collection.items;
        for (const directoryName of subDirectories) {
          let childItem = currentSubItems.find((f) => f.type === 'folder' && f.filename === directoryName);
          currentPath = path.join(currentPath, directoryName);
          if (!childItem) {
            childItem = {
              uid: dir?.meta?.uid || uuid(),
              pathname: currentPath,
              name: dir?.meta?.name || directoryName,
              seq: dir?.meta?.seq,
              filename: directoryName,
              collapsed: true,
              type: 'folder',
              isTransient: isTransientDir,
              items: []
            };
            currentSubItems.push(childItem);
          } else if (isTransientDir && !childItem.isTransient) {
            // Update existing folder to be transient if the directory is transient
            childItem.isTransient = true;
          }
          currentSubItems = childItem.items;
        }
        addDepth(collection.items);
      }
    },
    collectionChangeFileEvent: (state, action) => {
      const { file } = action.payload;
      const isCollectionRoot = file.meta.collectionRoot ? true : false;
      const isFolderRoot = file.meta.folderRoot ? true : false;
      const collection = findCollectionByUid(state.collections, file.meta.collectionUid);
      if (isCollectionRoot) {
        if (collection) {
          collection.root = file.data;
        }
        return;
      }

      if (isFolderRoot) {
        const folderPath = path.dirname(file.meta.pathname);
        const folderItem = findItemInCollectionByPathname(collection, folderPath);
        if (folderItem) {
          if (file?.data?.meta?.name) {
            folderItem.name = file?.data?.meta?.name;
          }
          if (file?.data?.meta?.seq) {
            folderItem.seq = file?.data?.meta?.seq;
          }
          folderItem.root = file.data;
        }
        return;
      }

      if (collection) {
        const item = findItemInCollection(collection, file.data.uid);

        if (item) {
          // whenever a user attempts to sort a req within the same folder
          // the seq is updated, but everything else remains the same
          // we don't want to lose the draft in this case
          if (areItemsTheSameExceptSeqUpdate(item, file.data)) {
            item.seq = file.data.seq;
            if (item?.draft) {
              item.draft.seq = file.data.seq;
            }
            if (item?.draft && areItemsTheSameExceptSeqUpdate(item?.draft, file.data)) {
              item.draft = null;
            }
          } else {
            item.name = file.data.name;
            item.type = file.data.type;
            item.seq = file.data.seq;
            item.tags = file.data.tags;
            item.request = file.data.request;
            item.settings = file.data.settings;
            item.examples = file.data.examples;
            item.filename = file.meta.name;
            item.pathname = file.meta.pathname;

            // Only clear draft if it matches the file content
            // This preserves characters typed during autosave
            if (item.draft && areItemsTheSameExceptSeqUpdate(item.draft, file.data)) {
              item.draft = null;
            }
          }
        }
      }
    },
    collectionUnlinkFileEvent: (state, action) => {
      const { file } = action.payload;
      const collection = findCollectionByUid(state.collections, file.meta.collectionUid);

      if (collection) {
        const item = findItemInCollectionByPathname(collection, file.meta.pathname);

        if (item) {
          deleteItemInCollectionByPathname(file.meta.pathname, collection);
        }
      }
    },
    collectionUnlinkDirectoryEvent: (state, action) => {
      const { directory } = action.payload;
      const collection = findCollectionByUid(state.collections, directory.meta.collectionUid);

      if (collection) {
        const item = findItemInCollectionByPathname(collection, directory.meta.pathname);

        if (item) {
          deleteItemInCollectionByPathname(directory.meta.pathname, collection);
        }
      }
    },
    collectionAddEnvFileEvent: (state, action) => {
      const { environment, collectionUid } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);

      if (collection) {
        collection.environments = collection.environments || [];

        const existingEnv = collection.environments.find((e) => e.uid === environment.uid);

        if (existingEnv) {
          const prevEphemerals = (existingEnv.variables || []).filter((v) => v.ephemeral);
          existingEnv.name = environment.name;
          existingEnv.variables = environment.variables;
          /*
           Apply temporary (ephemeral) values only to variables that actually exist in the file. This prevents deleted temporaries from “popping back” after a save. If a variable is present in the file, we temporarily override the UI value while also remembering the on-disk value in persistedValue for future saves.
          */
          prevEphemerals.forEach((ev) => {
            const target = existingEnv.variables?.find((v) => v.name === ev.name);
            if (target) {
              if (target.value !== ev.value) {
                if (target.persistedValue === undefined) target.persistedValue = target.value;
                target.value = ev.value;
              }
              target.ephemeral = true;
            }
          });
        } else {
          collection.environments.push(environment);
          collection.environments.sort((a, b) => a.name.localeCompare(b.name));

          const lastAction = collection.lastAction;
          if (lastAction && lastAction.type === 'ADD_ENVIRONMENT') {
            collection.lastAction = null;
            if (lastAction.payload === environment.name) {
              collection.activeEnvironmentUid = environment.uid;
              // Persist the selection to the UI state snapshot
              const { ipcRenderer } = window;
              if (ipcRenderer) {
                ipcRenderer.invoke('renderer:update-ui-state-snapshot', {
                  type: 'COLLECTION_ENVIRONMENT',
                  data: { collectionPath: collection?.pathname, environmentName: environment.name }
                });
              }
            }
          }
        }
      }
    },
    collectionRenamedEvent: (state, action) => {
      const { collectionPathname, newName } = action.payload;
      const collection = findCollectionByPathname(state.collections, collectionPathname);

      if (collection) {
        collection.name = newName;
      }
    },
    resetRunResults: (state, action) => {
      const { collectionUid } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);

      if (collection) {
        collection.runnerResult = null;
      }
    },
    initRunRequestEvent: (state, action) => {
      const { requestUid, itemUid, collectionUid } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);
      if (!collection) return;

      const item = findItemInCollection(collection, itemUid);
      if (!item) return;

      item.requestState = null;
      item.requestUid = requestUid;
      item.requestStartTime = Date.now();
      item.testResults = [];
      item.preRequestTestResults = [];
      item.postResponseTestResults = [];
      item.assertionResults = [];
      item.preRequestScriptErrorMessage = null;
      item.postResponseScriptErrorMessage = null;
      item.testScriptErrorMessage = null;
    },
    runRequestEvent: (state, action) => {
      const { itemUid, collectionUid, type, requestUid } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, itemUid);
        if (item) {
          // ignore outdated updates in case multiple requests are fired rapidly to avoid state inconsistency
          if (item.requestUid !== requestUid) return;

          if (type === 'pre-request-script-execution') {
            item.preRequestScriptErrorMessage = action.payload.errorMessage;
          }

          if (type === 'post-response-script-execution') {
            item.postResponseScriptErrorMessage = action.payload.errorMessage;
          }

          if (type === 'test-script-execution') {
            item.testScriptErrorMessage = action.payload.errorMessage;
          }

          if (type === 'request-queued') {
            const { cancelTokenUid } = action.payload;
            // ignore if request is already in progress or completed
            if (['sending', 'received'].includes(item.requestState)) return;
            item.requestState = 'queued';
            item.cancelTokenUid = cancelTokenUid;
          }

          if (type === 'request-sent') {
            const { cancelTokenUid, requestSent } = action.payload;
            item.requestSent = requestSent;

            // sometimes the response is received before the request-sent event arrives
            if (item.requestState === 'queued') {
              item.requestState = 'sending';
              item.cancelTokenUid = cancelTokenUid;
            }
          }

          if (type === 'assertion-results') {
            const { results } = action.payload;
            item.assertionResults = results;
          }

          if (type === 'test-results') {
            const { results } = action.payload;
            item.testResults = results;
          }

          if (type === 'test-results-pre-request') {
            const { results } = action.payload;
            item.preRequestTestResults = results;
          }

          if (type === 'test-results-post-response') {
            const { results } = action.payload;
            item.postResponseTestResults = results;
          }
        }
      }
    },
    runFolderEvent: (state, action) => {
      const { collectionUid, folderUid, itemUid, type, isRecursive, error, cancelTokenUid } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);

      if (collection) {
        const folder = findItemInCollection(collection, folderUid);
        const request = findItemInCollection(collection, itemUid);

        collection.runnerResult = collection.runnerResult || { info: {}, items: [] };

        // todo
        // get startedAt and endedAt from the runner and display it in the UI
        if (type === 'testrun-started') {
          const info = collection.runnerResult.info;
          info.collectionUid = collectionUid;
          info.folderUid = folderUid;
          info.isRecursive = isRecursive;
          info.cancelTokenUid = cancelTokenUid;
          info.status = 'started';
        }

        if (type === 'testrun-ended') {
          const info = collection.runnerResult.info;
          info.status = 'ended';
          if (action.payload.runCompletionTime) {
            info.runCompletionTime = action.payload.runCompletionTime;
          }
          if (action.payload.statusText) {
            info.statusText = action.payload.statusText;
          }
        }

        if (type === 'request-queued') {
          collection.runnerResult.items.push({
            uid: request.uid,
            status: 'queued'
          });
        }

        if (type === 'request-sent') {
          const item = collection.runnerResult.items.findLast((i) => i.uid === request.uid);
          item.status = 'running';
          item.requestSent = action.payload.requestSent;
        }

        if (type === 'response-received') {
          const item = collection.runnerResult.items.findLast((i) => i.uid === request.uid);
          item.status = 'completed';
          item.responseReceived = action.payload.responseReceived;
        }

        if (type === 'test-results') {
          const item = collection.runnerResult.items.findLast((i) => i.uid === request.uid);
          item.testResults = action.payload.testResults;
        }

        if (type === 'test-results-pre-request') {
          const item = collection.runnerResult.items.findLast((i) => i.uid === request.uid);
          item.preRequestTestResults = action.payload.preRequestTestResults;
        }

        if (type === 'test-results-post-response') {
          const item = collection.runnerResult.items.findLast((i) => i.uid === request.uid);
          item.postResponseTestResults = action.payload.postResponseTestResults;
        }

        if (type === 'assertion-results') {
          const item = collection.runnerResult.items.findLast((i) => i.uid === request.uid);
          item.assertionResults = action.payload.assertionResults;
        }

        if (type === 'error') {
          const item = collection.runnerResult.items.findLast((i) => i.uid === request.uid);
          item.error = action.payload.error;
          item.responseReceived = action.payload.responseReceived;
          item.status = 'error';
        }

        if (type === 'runner-request-skipped') {
          const item = collection.runnerResult.items.findLast((i) => i.uid === request.uid);
          item.status = 'skipped';
          item.responseReceived = action.payload.responseReceived;
        }

        if (type === 'post-response-script-execution') {
          const item = collection.runnerResult.items.findLast((i) => i.uid === request.uid);
          item.postResponseScriptErrorMessage = action.payload.errorMessage;
        }

        if (type === 'test-script-execution') {
          const item = collection.runnerResult.items.findLast((i) => i.uid === request.uid);
          item.testScriptErrorMessage = action.payload.errorMessage;
        }

        if (type === 'pre-request-script-execution') {
          const item = collection.runnerResult.items.findLast((i) => i.uid === request.uid);
          item.preRequestScriptErrorMessage = action.payload.errorMessage;
        }
      }
    },
    resetCollectionRunner: (state, action) => {
      const { collectionUid } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);

      if (collection) {
        collection.runnerResult = null;
        collection.runnerTags = { include: [], exclude: [] };
        collection.runnerTagsEnabled = false;
        collection.runnerConfiguration = null;
      }
    },
    updateRunnerTagsDetails: (state, action) => {
      const { collectionUid, tags, tagsEnabled } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);
      if (collection) {
        if (tags) {
          collection.runnerTags = tags;
        }
        if (typeof tagsEnabled === 'boolean') {
          collection.runnerTagsEnabled = tagsEnabled;
        }
      }
    },
    updateRunnerConfiguration: (state, action) => {
      const { collectionUid, selectedRequestItems, requestItemsOrder, delay } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);
      if (collection) {
        collection.runnerConfiguration = {
          selectedRequestItems: selectedRequestItems || [],
          requestItemsOrder: requestItemsOrder || [],
          delay: delay
        };
      }
    },
    updateRequestDocs: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.request.docs = action.payload.docs;
        }
      }
    },
    updateFolderDocs: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const folder = collection ? findItemInCollection(collection, action.payload.folderUid) : null;
      if (folder) {
        if (isItemAFolder(folder)) {
          if (!folder.draft) {
            folder.draft = cloneDeep(folder.root);
          }
          set(folder, 'draft.docs', action.payload.docs);
        }
      }
    },
    collectionAddOauth2CredentialsByUrl: (state, action) => {
      const { collectionUid, folderUid, itemUid, url, credentials, credentialsId, debugInfo } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);
      if (!collection) return;

      // Update oauth2Credentials (latest token)
      if (!collection.oauth2Credentials) {
        collection.oauth2Credentials = [];
      }
      let collectionOauth2Credentials = cloneDeep(collection.oauth2Credentials);

      // Remove existing credentials for the same combination
      const filteredOauth2Credentials = filter(
        collectionOauth2Credentials,
        (creds) =>
          !(creds.url === url && creds.collectionUid === collectionUid && creds.credentialsId === credentialsId)
      );

      // Add the new credential with folderUid and itemUid
      filteredOauth2Credentials.push({
        collectionUid,
        folderUid,
        itemUid,
        url,
        credentials,
        credentialsId,
        debugInfo
      });

      collection.oauth2Credentials = filteredOauth2Credentials;

      if (!collection.timeline) {
        collection.timeline = [];
      }

      if (debugInfo) {
        collection.timeline.push({
          type: 'oauth2',
          collectionUid,
          folderUid,
          itemUid,
          timestamp: Date.now(),
          data: {
            collectionUid,
            folderUid,
            itemUid,
            url,
            credentials,
            credentialsId,
            debugInfo: debugInfo.data
          }
        });
      }
    },

    collectionClearOauth2CredentialsByUrl: (state, action) => {
      const { collectionUid, url, credentialsId } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);
      if (!collection) return;

      if (collection.oauth2Credentials) {
        let collectionOauth2Credentials = cloneDeep(collection.oauth2Credentials);
        const filteredOauth2Credentials = filter(
          collectionOauth2Credentials,
          (creds) =>
            !(creds.url === url && creds.collectionUid === collectionUid)
        );
        collection.oauth2Credentials = filteredOauth2Credentials;
      }
    },

    collectionGetOauth2CredentialsByUrl: (state, action) => {
      const { collectionUid, url, credentialsId } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);
      const oauth2Credential = find(
        collection?.oauth2Credentials || [],
        (creds) =>
          creds.url === url && creds.collectionUid === collectionUid && creds.credentialsId === credentialsId
      );
      return oauth2Credential;
    },

    updateFolderAuthMode: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const folder = collection ? findItemInCollection(collection, action.payload.folderUid) : null;

      if (folder) {
        if (!folder.draft) {
          folder.draft = cloneDeep(folder.root);
        }
        set(folder, 'draft.request.auth', {});
        set(folder, 'draft.request.auth.mode', action.payload.mode);
      }
    },
    streamDataReceived: (state, action) => {
      const { itemUid, collectionUid, seq, timestamp, data } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, itemUid);
        if (data.data) {
          item.response.data ||= [];
          item.response.data.push({
            type: 'incoming',
            seq,
            message: data.data,
            messageHexdump: hexdump(data.data),
            timestamp: timestamp || Date.now()
          });
        }
        if (item.response.dataBuffer && item.response.dataBuffer.length && data.dataBuffer) {
          item.response.dataBuffer = Buffer.concat([Buffer.from(item.response.dataBuffer), Buffer.from(data.dataBuffer)]);
        }

        item.response.size = data.data?.length + (item.response.size || 0);
      }
    },
    addRequestTag: (state, action) => {
      const { tag, collectionUid, itemUid } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.tags = item.draft.tags || [];
          if (!item.draft.tags.includes(tag.trim())) {
            item.draft.tags.push(tag.trim());
          }

          collection.allTags = getUniqueTagsFromItems(collection.items);
        }
      }
    },
    deleteRequestTag: (state, action) => {
      const { tag, collectionUid, itemUid } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, itemUid);

        if (item && isItemARequest(item)) {
          if (!item.draft) {
            item.draft = cloneDeep(item);
          }
          item.draft.tags = item.draft.tags || [];
          item.draft.tags = item.draft.tags.filter((t) => t !== tag.trim());

          collection.allTags = getUniqueTagsFromItems(collection.items);
        }
      }
    },
    updateCollectionTagsList: (state, action) => {
      const { collectionUid } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);

      if (collection) {
        collection.allTags = getUniqueTagsFromItems(collection.items);
      }
    },
    updateActiveConnections: (state, action) => {
      state.activeConnections = [...action.payload.activeConnectionIds];
    },
    runWsRequestEvent: (state, action) => {
      const { itemUid, collectionUid, eventType, eventData } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);
      if (!collection) return;

      const item = findItemInCollection(collection, itemUid);
      if (!item) return;
      const request = item.draft ? item.draft.request : item.request;

      if (eventType === 'request') {
        item.requestSent = eventData;
        item.requestSent.timestamp = Date.now();
        item.response = {
          ...initiatedWsResponse,
          initiatedWsResponse,
          statusText: 'CONNECTING'
        };
      }

      if (!collection.timeline) {
        collection.timeline = [];
      }

      collection.timeline.push({
        type: 'request',
        eventType: eventType,
        collectionUid: collection.uid,
        folderUid: null,
        itemUid: item.uid,
        timestamp: Date.now(),
        data: {
          request: eventData || item.requestSent || item.request,
          timestamp: Date.now(),
          eventData: eventData
        }
      });
    },
    wsResponseReceived: (state, action) => {
      const { itemUid, collectionUid, eventType, eventData } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);

      if (!collection) return;

      const item = findItemInCollection(collection, itemUid);

      if (!item) return;

      // Get current response state or create initial state
      const currentResponse = item.response || initiatedWsResponse;
      const timestamp = item?.requestSent?.timestamp;
      let updatedResponse = {
        ...currentResponse,
        isError: false,
        error: '',
        duration: Date.now() - (timestamp || Date.now())
      };

      // Process based on event type
      switch (eventType) {
        case 'message':
          // Add message to responses list
          updatedResponse.responses = (currentResponse?.responses || []).concat(eventData);
          break;

        case 'redirect':
          updatedResponse.requestHeaders = eventData.headers;
          updatedResponse.responses ||= [];
          updatedResponse.responses.push({
            message: eventData.message,
            type: eventData.type,
            timestamp: eventData.timestamp,
            seq: eventData.seq
          });
          break;

        case 'upgrade':
          updatedResponse.headers = eventData.headers;
          break;

        case 'open':
          updatedResponse.status = 'CONNECTED';
          updatedResponse.statusText = 'CONNECTED';
          updatedResponse.statusCode = 0;
          updatedResponse.responses ||= [];
          updatedResponse.responses.push({
            message: `Connected to ${eventData.url}`,
            type: 'info',
            timestamp: eventData.timestamp,
            seq: eventData.seq
          });
          break;

        case 'close':
          const { code, reason } = eventData;
          updatedResponse.isError = false;
          updatedResponse.error = '';
          updatedResponse.status = 'CLOSED';
          updatedResponse.statusCode = code;
          updatedResponse.statusText = wsStatusCodes[code] || 'CLOSED';
          updatedResponse.statusDescription = reason;

          updatedResponse.responses.push({
            type: code !== 1000 ? 'info' : 'error',
            message: reason.trim().length ? ['Closed:', reason.trim()].join(' ') : 'Closed',
            timestamp: eventData.timestamp,
            seq: eventData.seq
          });
          break;

        case 'error':
          const errorDetails = eventData.error || eventData.message;
          updatedResponse.isError = true;
          updatedResponse.error = errorDetails || 'WebSocket error occurred';
          updatedResponse.status = 'ERROR';
          updatedResponse.statusCode = wsStatusCodes[1011];
          updatedResponse.statusText = 'ERROR';

          updatedResponse.responses.push({
            type: 'error',
            message: errorDetails || 'WebSocket error occurred',
            timestamp: eventData.timestamp,
            seq: eventData.seq
          });

          break;

        case 'connecting':
          updatedResponse.status = 'CONNECTING';
          updatedResponse.statusText = 'CONNECTING';
          break;
      }

      item.response = updatedResponse;
    },
    wsUpdateResponseSortOrder: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);
        if (item) {
          item.response.sortOrder = item.response.sortOrder ? -item.response.sortOrder : -1;
        }
      }
    },

    addTransientDirectory: (state, action) => {
      state.tempDirectories[action.payload.collectionUid] = action.payload.pathname;
    },
    addSaveTransientRequestModal: (state, action) => {
      const { item, collection } = action.payload;
      // Avoid duplicates - check if this item is already in the array
      const exists = state.saveTransientRequestModals.some((modal) => modal.item.uid === item.uid);
      if (!exists) {
        state.saveTransientRequestModals.push({ item, collection });
      }
    },
    removeSaveTransientRequestModal: (state, action) => {
      const { itemUid } = action.payload;
      state.saveTransientRequestModals = state.saveTransientRequestModals.filter(
        (modal) => modal.item.uid !== itemUid
      );
    },
    clearAllSaveTransientRequestModals: (state) => {
      state.saveTransientRequestModals = [];
    },
    /* Response Example Actions */
    addResponseExample: exampleReducers.addResponseExample,
    cloneResponseExample: exampleReducers.cloneResponseExample,
    updateResponseExample: exampleReducers.updateResponseExample,
    deleteResponseExample: exampleReducers.deleteResponseExample,
    cancelResponseExampleEdit: exampleReducers.cancelResponseExampleEdit,
    addResponseExampleHeader: exampleReducers.addResponseExampleHeader,
    updateResponseExampleHeader: exampleReducers.updateResponseExampleHeader,
    deleteResponseExampleHeader: exampleReducers.deleteResponseExampleHeader,
    moveResponseExampleHeader: exampleReducers.moveResponseExampleHeader,
    setResponseExampleHeaders: exampleReducers.setResponseExampleHeaders,
    addResponseExampleParam: exampleReducers.addResponseExampleParam,
    updateResponseExampleParam: exampleReducers.updateResponseExampleParam,
    deleteResponseExampleParam: exampleReducers.deleteResponseExampleParam,
    moveResponseExampleParam: exampleReducers.moveResponseExampleParam,
    updateResponseExampleRequest: exampleReducers.updateResponseExampleRequest,
    updateResponseExampleMultipartFormParams: exampleReducers.updateResponseExampleMultipartFormParams,
    updateResponseExampleFileBodyParams: exampleReducers.updateResponseExampleFileBodyParams,
    updateResponseExampleFormUrlEncodedParams: exampleReducers.updateResponseExampleFormUrlEncodedParams,
    updateResponseExampleStatusCode: exampleReducers.updateResponseExampleStatusCode,
    updateResponseExampleStatusText: exampleReducers.updateResponseExampleStatusText,
    updateResponseExampleRequestUrl: exampleReducers.updateResponseExampleRequestUrl,
    updateResponseExampleResponse: exampleReducers.updateResponseExampleResponse,
    updateResponseExampleDetails: exampleReducers.updateResponseExampleDetails,
    updateResponseExampleName: exampleReducers.updateResponseExampleName,
    updateResponseExampleDescription: exampleReducers.updateResponseExampleDescription,
    addResponseExampleRequestHeader: exampleReducers.addResponseExampleRequestHeader,
    updateResponseExampleRequestHeader: exampleReducers.updateResponseExampleRequestHeader,
    deleteResponseExampleRequestHeader: exampleReducers.deleteResponseExampleRequestHeader,
    moveResponseExampleRequestHeader: exampleReducers.moveResponseExampleRequestHeader,
    setResponseExampleRequestHeaders: exampleReducers.setResponseExampleRequestHeaders,
    setResponseExampleParams: exampleReducers.setResponseExampleParams,
    updateResponseExampleBody: exampleReducers.updateResponseExampleBody,
    addResponseExampleFileParam: exampleReducers.addResponseExampleFileParam,
    updateResponseExampleFileParam: exampleReducers.updateResponseExampleFileParam,
    deleteResponseExampleFileParam: exampleReducers.deleteResponseExampleFileParam,
    addResponseExampleFormUrlEncodedParam: exampleReducers.addResponseExampleFormUrlEncodedParam,
    updateResponseExampleFormUrlEncodedParam: exampleReducers.updateResponseExampleFormUrlEncodedParam,
    deleteResponseExampleFormUrlEncodedParam: exampleReducers.deleteResponseExampleFormUrlEncodedParam,
    addResponseExampleMultipartFormParam: exampleReducers.addResponseExampleMultipartFormParam,
    updateResponseExampleMultipartFormParam: exampleReducers.updateResponseExampleMultipartFormParam,
    deleteResponseExampleMultipartFormParam: exampleReducers.deleteResponseExampleMultipartFormParam
    /* End Response Example Actions */
  }
});

export const {
  createCollection,
  updateCollectionMountStatus,
  updateCollectionLoadingState,
  setCollectionSecurityConfig,
  brunoConfigUpdateEvent,
  renameCollection,
  removeCollection,
  sortCollections,
  updateLastAction,
  updateSettingsSelectedTab,
  updatedFolderSettingsSelectedTab,
  collectionUnlinkEnvFileEvent,
  saveEnvironment,
  selectEnvironment,
  newItem,
  deleteItem,
  renameItem,
  cloneItem,
  scriptEnvironmentUpdateEvent,
  processEnvUpdateEvent,
  workspaceEnvUpdateEvent,
  requestCancelled,
  responseReceived,
  runGrpcRequestEvent,
  grpcResponseReceived,
  responseCleared,
  clearTimeline,
  clearRequestTimeline,
  saveRequest,
  deleteRequestDraft,
  saveCollectionDraft,
  saveFolderDraft,
  deleteCollectionDraft,
  deleteFolderDraft,
  setEnvironmentsDraft,
  clearEnvironmentsDraft,
  newEphemeralHttpRequest,
  collapseFullCollection,
  toggleCollection,
  toggleCollectionItem,
  requestUrlChanged,
  updateItemSettings,
  updateAuth,
  addQueryParam,
  setQueryParams,
  moveQueryParam,
  updateQueryParam,
  deleteQueryParam,
  updatePathParam,
  addRequestHeader,
  updateRequestHeader,
  deleteRequestHeader,
  moveRequestHeader,
  setRequestHeaders,
  setCollectionHeaders,
  setFolderHeaders,
  addFormUrlEncodedParam,
  updateFormUrlEncodedParam,
  deleteFormUrlEncodedParam,
  setFormUrlEncodedParams,
  moveFormUrlEncodedParam,
  addMultipartFormParam,
  updateMultipartFormParam,
  deleteMultipartFormParam,
  setMultipartFormParams,
  addFile,
  updateFile,
  deleteFile,
  moveMultipartFormParam,
  updateRequestAuthMode,
  updateRequestBodyMode,
  updateRequestBody,
  updateRequestGraphqlQuery,
  updateRequestGraphqlVariables,
  updateRequestScript,
  updateResponseScript,
  updateRequestTests,
  updateRequestMethod,
  updateRequestProtoPath,
  addAssertion,
  updateAssertion,
  deleteAssertion,
  setRequestAssertions,
  moveAssertion,
  addVar,
  updateVar,
  deleteVar,
  setRequestVars,
  moveVar,
  addFolderHeader,
  updateFolderHeader,
  deleteFolderHeader,
  addFolderVar,
  updateFolderVar,
  deleteFolderVar,
  setFolderVars,
  updateFolderRequestScript,
  updateFolderResponseScript,
  updateFolderTests,
  addCollectionHeader,
  updateCollectionHeader,
  deleteCollectionHeader,
  addCollectionVar,
  updateCollectionVar,
  deleteCollectionVar,
  setCollectionVars,
  updateCollectionAuthMode,
  updateCollectionAuth,
  updateCollectionRequestScript,
  updateCollectionResponseScript,
  updateCollectionTests,
  updateCollectionDocs,
  updateCollectionProxy,
  updateCollectionClientCertificates,
  updateCollectionPresets,
  updateCollectionProtobuf,
  collectionAddFileEvent,
  collectionAddDirectoryEvent,
  collectionChangeFileEvent,
  collectionUnlinkFileEvent,
  collectionUnlinkDirectoryEvent,
  collectionAddEnvFileEvent,
  collectionRenamedEvent,
  resetRunResults,
  initRunRequestEvent,
  runRequestEvent,
  runFolderEvent,
  resetCollectionRunner,
  updateRunnerTagsDetails,
  updateRunnerConfiguration,
  updateRequestDocs,
  updateFolderDocs,
  moveCollection,
  streamDataReceived,
  collectionAddOauth2CredentialsByUrl,
  collectionClearOauth2CredentialsByUrl,
  collectionGetOauth2CredentialsByUrl,
  updateFolderAuth,
  updateFolderAuthMode,
  addRequestTag,
  deleteRequestTag,
  updateCollectionTagsList,
  updateActiveConnections,
  runWsRequestEvent,
  wsResponseReceived,
  wsUpdateResponseSortOrder,

  /* Response Example Actions - Start */
  addResponseExample,
  cloneResponseExample,
  updateResponseExample,
  deleteResponseExample,
  cancelResponseExampleEdit,
  addResponseExampleHeader,
  updateResponseExampleHeader,
  deleteResponseExampleHeader,
  moveResponseExampleHeader,
  setResponseExampleHeaders,
  addResponseExampleParam,
  updateResponseExampleParam,
  deleteResponseExampleParam,
  moveResponseExampleParam,
  updateResponseExampleRequest,
  updateResponseExampleMultipartFormParams,
  updateResponseExampleFileBodyParams,
  updateResponseExampleFormUrlEncodedParams,
  updateResponseExampleStatusCode,
  updateResponseExampleStatusText,
  updateResponseExampleRequestUrl,
  updateResponseExampleResponse,
  updateResponseExampleDetails,
  updateResponseExampleName,
  updateResponseExampleDescription,
  addResponseExampleRequestHeader,
  updateResponseExampleRequestHeader,
  deleteResponseExampleRequestHeader,
  moveResponseExampleRequestHeader,
  setResponseExampleRequestHeaders,
  setResponseExampleParams,
  /* Response Example Actions - End */
  addTransientDirectory,
  addSaveTransientRequestModal,
  removeSaveTransientRequestModal,
  clearAllSaveTransientRequestModals
} = collectionsSlice.actions;

export default collectionsSlice.reducer;
