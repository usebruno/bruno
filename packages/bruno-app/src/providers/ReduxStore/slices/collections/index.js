import { uuid } from 'utils/common';
import { find, map, forOwn, concat, filter, each, cloneDeep, get, set, findIndex } from 'lodash';
import { createSlice } from '@reduxjs/toolkit';
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
import { parsePathParams, parseQueryParams, splitOnFirst, stringifyQueryParams } from 'utils/url';
import { getSubdirectoriesFromRoot } from 'utils/common/platform';
import toast from 'react-hot-toast';
import mime from 'mime-types';
import path from 'utils/common/path';

const initialState = {
  collections: [],
  collectionSortOrder: 'default'
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

      // Collection mount status is used to track the mount status of the collection
      // values can be 'unmounted', 'mounting', 'mounted'
      collection.mountStatus = 'unmounted';

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
    updateCollectionMountStatus: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      if (collection) {
        if (action.payload.mountStatus) {
          collection.mountStatus = action.payload.mountStatus;
        }
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
      const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
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
      const { collectionUid, envVariables, runtimeVariables } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);

      if (collection) {
        const activeEnvironmentUid = collection.activeEnvironmentUid;
        const activeEnvironment = findEnvironmentInCollection(collection, activeEnvironmentUid);

        if (activeEnvironment) {
          forOwn(envVariables, (value, key) => {
            const variable = find(activeEnvironment.variables, (v) => v.name === key);

            if (variable) {
              variable.value = value;
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
                  uid: uuid()
                });
              }
            }
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
    requestCancelled: (state, action) => {
      const { itemUid, collectionUid } = action.payload;
      const collection = findCollectionByUid(state.collections, collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, itemUid);
        if (item) {
          item.response = null;
          item.cancelTokenUid = null;
          item.requestUid = null;
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
          item.cancelTokenUid = null;
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
            type: "request",
            collectionUid: collection.uid,
            folderUid: null,
            itemUid: item.uid,
            timestamp: timestamp,
            data: {
              request: item.requestSent || item.request,
              response: action.payload.response,
              timestamp: timestamp,
            }
          });
        }
      }
    },
    responseCleared: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);
        if (item) {
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
          collection.timeline = collection?.timeline?.filter(t => t?.itemUid !== itemUid);
        }
      }
    },
    saveRequest: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const item = findItemInCollection(collection, action.payload.itemUid);

        if (item && item.draft) {
          item.request = item.draft.request;
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
      const existingOtherParams = item.draft.request.params?.filter(p => p.type !== 'query') || [];
      const newQueryParams = map(params, ({ name = '', value = '', enabled = true }) => ({
        uid: uuid(),
        name,
        value,
        description: '',
        type: 'query',
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
      item.draft.request.headers = map(action.payload.headers, ({name = '', value = '', enabled = true}) => ({
        uid: uuid(),
        name: name,
        value: value,
        description: '',
        enabled: enabled
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
    moveFormUrlEncodedParam: (state, action) => {
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
    moveMultipartFormParam: (state, action) => {
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
    moveAssertion: (state, action) => {
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
              name: '',
              value: '',
              local: false,
              enabled: true
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
          if(type == "request"){
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
        set(collection, 'root.request.auth', {});
        set(collection, 'root.request.auth.mode', action.payload.mode);
      }
    },
    updateCollectionAuth: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        set(collection, 'root.request.auth', {});
        set(collection, 'root.request.auth.mode', action.payload.mode);
        switch (action.payload.mode) {
          case 'awsv4':
            set(collection, 'root.request.auth.awsv4', action.payload.content);
            break;
          case 'bearer':
            set(collection, 'root.request.auth.bearer', action.payload.content);
            break;
          case 'basic':
            set(collection, 'root.request.auth.basic', action.payload.content);
            break;
          case 'digest':
            set(collection, 'root.request.auth.digest', action.payload.content);
            break;
          case 'ntlm':
            set(collection, 'root.request.auth.ntlm', action.payload.content);
            break;            
          case 'oauth2':
            set(collection, 'root.request.auth.oauth2', action.payload.content);
            break;
          case 'wsse':
            set(collection, 'root.request.auth.wsse', action.payload.content);
            break;
          case 'apikey':
            set(collection, 'root.request.auth.apikey', action.payload.content);
            break;
        }
      }
    },
    updateCollectionRequestScript: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        set(collection, 'root.request.script.req', action.payload.script);
      }
    },
    updateCollectionResponseScript: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        set(collection, 'root.request.script.res', action.payload.script);
      }
    },
    updateCollectionTests: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        set(collection, 'root.request.tests', action.payload.tests);
      }
    },
    updateCollectionDocs: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        set(collection, 'root.docs', action.payload.docs);
      }
    },
    addFolderHeader: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const folder = collection ? findItemInCollection(collection, action.payload.folderUid) : null;
      if (folder) {
        const headers = get(folder, 'root.request.headers', []);
        headers.push({
          uid: uuid(),
          name: '',
          value: '',
          description: '',
          enabled: true
        });
        set(folder, 'root.request.headers', headers);
      }
    },
    updateFolderHeader: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const folder = collection ? findItemInCollection(collection, action.payload.folderUid) : null;
      if (folder) {
        const headers = get(folder, 'root.request.headers', []);
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
        let headers = get(folder, 'root.request.headers', []);
        headers = filter(headers, (h) => h.uid !== action.payload.headerUid);
        set(folder, 'root.request.headers', headers);
      }
    },
    addFolderVar: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const folder = collection ? findItemInCollection(collection, action.payload.folderUid) : null;
      const type = action.payload.type;
      if (folder) {
        if (type === 'request') {
          const vars = get(folder, 'root.request.vars.req', []);
          vars.push({
            uid: uuid(),
            name: '',
            value: '',
            enabled: true
          });
          set(folder, 'root.request.vars.req', vars);
        } else if (type === 'response') {
          const vars = get(folder, 'root.request.vars.res', []);
          vars.push({
            uid: uuid(),
            name: '',
            value: '',
            enabled: true
          });
          set(folder, 'root.request.vars.res', vars);
        }
      }
    },
    updateFolderVar: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const folder = collection ? findItemInCollection(collection, action.payload.folderUid) : null;
      const type = action.payload.type;
      if (folder) {
        if (type === 'request') {
          let vars = get(folder, 'root.request.vars.req', []);
          const _var = find(vars, (h) => h.uid === action.payload.var.uid);
          if (_var) {
            _var.name = action.payload.var.name;
            _var.value = action.payload.var.value;
            _var.description = action.payload.var.description;
            _var.enabled = action.payload.var.enabled;
          }
          set(folder, 'root.request.vars.req', vars);
        } else if (type === 'response') {
          let vars = get(folder, 'root.request.vars.res', []);
          const _var = find(vars, (h) => h.uid === action.payload.var.uid);
          if (_var) {
            _var.name = action.payload.var.name;
            _var.value = action.payload.var.value;
            _var.description = action.payload.var.description;
            _var.enabled = action.payload.var.enabled;
          }
          set(folder, 'root.request.vars.res', vars);
        }
      }
    },
    deleteFolderVar: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const folder = collection ? findItemInCollection(collection, action.payload.folderUid) : null;
      const type = action.payload.type;
      if (folder) {
        if (type === 'request') {
          let vars = get(folder, 'root.request.vars.req', []);
          vars = filter(vars, (h) => h.uid !== action.payload.varUid);
          set(folder, 'root.request.vars.req', vars);
        } else if (type === 'response') {
          let vars = get(folder, 'root.request.vars.res', []);
          vars = filter(vars, (h) => h.uid !== action.payload.varUid);
          set(folder, 'root.request.vars.res', vars);
        }
      }
    },
    updateFolderRequestScript: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const folder = collection ? findItemInCollection(collection, action.payload.folderUid) : null;
      if (folder) {
        set(folder, 'root.request.script.req', action.payload.script);
      }
    },
    updateFolderResponseScript: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const folder = collection ? findItemInCollection(collection, action.payload.folderUid) : null;
      if (folder) {
        set(folder, 'root.request.script.res', action.payload.script);
      }
    },
    updateFolderTests: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const folder = collection ? findItemInCollection(collection, action.payload.folderUid) : null;
      if (folder) {
        set(folder, 'root.request.tests', action.payload.tests);
      }
    },
    updateFolderAuth: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      if (!collection) return;

      const folder = collection ? findItemInCollection(collection, action.payload.itemUid) : null;
      if (!folder) return;

      if (folder) {
        set(folder, 'root.request.auth', {});
        set(folder, 'root.request.auth.mode', action.payload.mode);
        switch (action.payload.mode) {
          case 'oauth2':
            set(folder, 'root.request.auth.oauth2', action.payload.content);
            break;
          case 'basic':
            set(folder, 'root.request.auth.basic', action.payload.content);
            break;
          case 'bearer':
            set(folder, 'root.request.auth.bearer', action.payload.content);
            break;
          case 'digest':
            set(folder, 'root.request.auth.digest', action.payload.content);
            break;
          case 'ntlm':
            set(folder, 'root.request.auth.ntlm', action.payload.content);
            break;
          case 'apikey':
            set(folder, 'root.request.auth.apikey', action.payload.content);
            break;
          case 'awsv4':
            set(folder, 'root.request.auth.awsv4', action.payload.content);
            break;
          case 'wsse':
            set(folder, 'root.request.auth.wsse', action.payload.content);
            break;
        }
      }
    },
    addCollectionHeader: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const headers = get(collection, 'root.request.headers', []);
        headers.push({
          uid: uuid(),
          name: '',
          value: '',
          description: '',
          enabled: true
        });
        set(collection, 'root.request.headers', headers);
      }
    },
    updateCollectionHeader: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);

      if (collection) {
        const headers = get(collection, 'root.request.headers', []);
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
        let headers = get(collection, 'root.request.headers', []);
        headers = filter(headers, (h) => h.uid !== action.payload.headerUid);
        set(collection, 'root.request.headers', headers);
      }
    },
    addCollectionVar: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const type = action.payload.type;
      if (collection) {
        if (type === 'request') {
          const vars = get(collection, 'root.request.vars.req', []);
          vars.push({
            uid: uuid(),
            name: '',
            value: '',
            enabled: true
          });
          set(collection, 'root.request.vars.req', vars);
        } else if (type === 'response') {
          const vars = get(collection, 'root.request.vars.res', []);
          vars.push({
            uid: uuid(),
            name: '',
            value: '',
            enabled: true
          });
          set(collection, 'root.request.vars.res', vars);
        }
      }
    },
    updateCollectionVar: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const type = action.payload.type;
      if (type === 'request') {
        let vars = get(collection, 'root.request.vars.req', []);
        const _var = find(vars, (h) => h.uid === action.payload.var.uid);
        if (_var) {
          _var.name = action.payload.var.name;
          _var.value = action.payload.var.value;
          _var.description = action.payload.var.description;
          _var.enabled = action.payload.var.enabled;
        }
        set(collection, 'root.request.vars.req', vars);
      } else if (type === 'response') {
        let vars = get(collection, 'root.request.vars.res', []);
        const _var = find(vars, (h) => h.uid === action.payload.var.uid);
        if (_var) {
          _var.name = action.payload.var.name;
          _var.value = action.payload.var.value;
          _var.description = action.payload.var.description;
          _var.enabled = action.payload.var.enabled;
        }
        set(collection, 'root.request.vars.res', vars);
      }
    },
    deleteCollectionVar: (state, action) => {
      const collection = findCollectionByUid(state.collections, action.payload.collectionUid);
      const type = action.payload.type;
      if (collection) {
        if (type === 'request') {
          let vars = get(collection, 'root.request.vars.req', []);
          vars = filter(vars, (h) => h.uid !== action.payload.varUid);
          set(collection, 'root.request.vars.req', vars);
        } else if (type === 'response') {
          let vars = get(collection, 'root.request.vars.res', []);
          vars = filter(vars, (h) => h.uid !== action.payload.varUid);
          set(collection, 'root.request.vars.res', vars);
        }
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
              items: [],
            };
            currentSubItems.push(childItem);
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
            currentItem.request = file.data.request;
            currentItem.filename = file.meta.name;
            currentItem.pathname = file.meta.pathname;
            currentItem.draft = null;
            currentItem.partial = file.partial;
            currentItem.loading = file.loading;
            currentItem.size = file.size;
            currentItem.error = file.error;
          } else {
            currentSubItems.push({
              uid: file.data.uid,
              name: file.data.name,
              type: file.data.type,
              seq: file.data.seq,
              request: file.data.request,
              filename: file.meta.name,
              pathname: file.meta.pathname,
              draft: null,
              partial: file.partial,
              loading: file.loading,
              size: file.size,
              error: file.error
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
              seq: dir?.meta?.seq || 1,
              filename: directoryName,
              collapsed: true,
              type: 'folder',
              items: []
            };
            currentSubItems.push(childItem);
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
            item.request = file.data.request;
            item.filename = file.meta.name;
            item.pathname = file.meta.pathname;
            item.draft = null;
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
          existingEnv.variables = environment.variables;
        } else {
          collection.environments.push(environment);
          collection.environments.sort((a, b) => a.name.localeCompare(b.name));

          const lastAction = collection.lastAction;
          if (lastAction && lastAction.type === 'ADD_ENVIRONMENT') {
            collection.lastAction = null;
            if (lastAction.payload === environment.name) {
              collection.activeEnvironmentUid = environment.uid;
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

          if(type === 'post-response-script-execution') {
            item.postResponseScriptErrorMessage = action.payload.errorMessage;
          }

          if(type === 'test-script-execution') {
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
          set(folder, 'root.docs', action.payload.docs);
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

      if(debugInfo) {
        collection.timeline.push({
          type: "oauth2",
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
            debugInfo: debugInfo.data,
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
        set(folder, 'root.request.auth', {});
        set(folder, 'root.request.auth.mode', action.payload.mode);
      }
    }
  },

});

export const {
  createCollection,
  updateCollectionMountStatus,
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
  requestCancelled,
  responseReceived,
  responseCleared,
  clearTimeline,
  clearRequestTimeline,
  saveRequest,
  deleteRequestDraft,
  newEphemeralHttpRequest,
  toggleCollection,
  toggleCollectionItem,
  requestUrlChanged,
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
  addFormUrlEncodedParam,
  updateFormUrlEncodedParam,
  deleteFormUrlEncodedParam,
  moveFormUrlEncodedParam,
  addMultipartFormParam,
  updateMultipartFormParam,
  deleteMultipartFormParam,
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
  addAssertion,
  updateAssertion,
  deleteAssertion,
  moveAssertion,
  addVar,
  updateVar,
  deleteVar,
  moveVar,
  addFolderHeader,
  updateFolderHeader,
  deleteFolderHeader,
  addFolderVar,
  updateFolderVar,
  deleteFolderVar,
  updateFolderRequestScript,
  updateFolderResponseScript,
  updateFolderTests,
  addCollectionHeader,
  updateCollectionHeader,
  deleteCollectionHeader,
  addCollectionVar,
  updateCollectionVar,
  deleteCollectionVar,
  updateCollectionAuthMode,
  updateCollectionAuth,
  updateCollectionRequestScript,
  updateCollectionResponseScript,
  updateCollectionTests,
  updateCollectionDocs,
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
  updateRequestDocs,
  updateFolderDocs,
  moveCollection,
  collectionAddOauth2CredentialsByUrl,
  collectionClearOauth2CredentialsByUrl,
  collectionGetOauth2CredentialsByUrl,
  updateFolderAuth,
  updateFolderAuthMode,
} = collectionsSlice.actions;

export default collectionsSlice.reducer;
