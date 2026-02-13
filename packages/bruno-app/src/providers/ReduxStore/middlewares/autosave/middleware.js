import { saveRequest, saveCollectionSettings, saveFolderRoot, saveEnvironment } from '../../slices/collections/actions';
import { saveGlobalEnvironment } from '../../slices/global-environments';
import { flattenItems, isItemARequest, isItemAFolder, findItemInCollection, findCollectionByUid, isItemTransientRequest } from 'utils/collections';

const actionsToIntercept = [
  // Request-level actions
  'collections/requestUrlChanged',
  'collections/updateAuth',
  'collections/addQueryParam',
  'collections/moveQueryParam',
  'collections/updateQueryParam',
  'collections/deleteQueryParam',
  'collections/setQueryParams',
  'collections/updatePathParam',
  'collections/addRequestHeader',
  'collections/updateRequestHeader',
  'collections/deleteRequestHeader',
  'collections/moveRequestHeader',
  'collections/setRequestHeaders',
  'collections/addFormUrlEncodedParam',
  'collections/updateFormUrlEncodedParam',
  'collections/deleteFormUrlEncodedParam',
  'collections/moveFormUrlEncodedParam',
  'collections/setFormUrlEncodedParams',
  'collections/addMultipartFormParam',
  'collections/updateMultipartFormParam',
  'collections/deleteMultipartFormParam',
  'collections/moveMultipartFormParam',
  'collections/setMultipartFormParams',
  'collections/updateRequestAuthMode',
  'collections/updateRequestBodyMode',
  'collections/updateRequestBody',
  'collections/updateRequestGraphqlQuery',
  'collections/updateRequestGraphqlVariables',
  'collections/updateRequestScript',
  'collections/updateResponseScript',
  'collections/updateRequestTests',
  'collections/updateRequestMethod',
  'collections/addAssertion',
  'collections/updateAssertion',
  'collections/deleteAssertion',
  'collections/moveAssertion',
  'collections/addVar',
  'collections/updateVar',
  'collections/deleteVar',
  'collections/moveVar',
  'collections/updateRequestDocs',
  'collections/runRequestEvent',
  'collections/updateCollectionPresets',
  'collections/setRequestVars',
  'collections/setRequestAssertions',
  'collections/updateItemSettings',
  'collections/addRequestTag',
  'collections/deleteRequestTag',

  // Folder-level actions
  'collections/addFolderHeader',
  'collections/updateFolderHeader',
  'collections/deleteFolderHeader',
  'collections/setFolderHeaders',
  'collections/addFolderVar',
  'collections/updateFolderVar',
  'collections/deleteFolderVar',
  'collections/setFolderVars',
  'collections/updateFolderRequestScript',
  'collections/updateFolderResponseScript',
  'collections/updateFolderTests',
  'collections/updateFolderAuth',
  'collections/updateFolderAuthMode',
  'collections/updateFolderDocs',

  // Collection-level actions
  'collections/addCollectionHeader',
  'collections/updateCollectionHeader',
  'collections/deleteCollectionHeader',
  'collections/setCollectionHeaders',
  'collections/addCollectionVar',
  'collections/updateCollectionVar',
  'collections/deleteCollectionVar',
  'collections/setCollectionVars',
  'collections/updateCollectionAuth',
  'collections/updateCollectionAuthMode',
  'collections/updateCollectionRequestScript',
  'collections/updateCollectionResponseScript',
  'collections/updateCollectionTests',
  'collections/updateCollectionDocs',
  'collections/updateCollectionClientCertificates',
  'collections/updateCollectionProtobuf',
  'collections/updateCollectionProxy',

  // Environment draft actions
  'collections/setEnvironmentsDraft',
  'global-environments/setGlobalEnvironmentDraft'
];

// Simple object to track pending save timers
const pendingTimers = {};

// Helper to schedule autosave for an item
const scheduleAutoSave = (key, save, interval) => {
  // Clear any existing timer for this entity
  clearTimeout(pendingTimers[key]);

  // Schedule a new save
  pendingTimers[key] = setTimeout(() => {
    save();
    delete pendingTimers[key];
  }, interval);
};

// Helper to find and schedule saves for all existing drafts
const saveExistingDrafts = (dispatch, getState, interval) => {
  const state = getState();
  const collections = state.collections.collections;

  collections.forEach((collection) => {
    // Check collection-level draft
    if (collection.draft) {
      const key = `collection-${collection.uid}`;
      scheduleAutoSave(key, () => dispatch(saveCollectionSettings(collection.uid, null, true)), interval);
    }

    // Check collection environment drafts
    if (collection.environmentsDraft) {
      const { environmentUid, variables } = collection.environmentsDraft;
      if (environmentUid && variables) {
        const key = `environment-${collection.uid}-${environmentUid}`;
        scheduleAutoSave(key, () => dispatch(saveEnvironment(variables, environmentUid, collection.uid)), interval);
      }
    }

    // Check all items (requests and folders) for drafts
    const allItems = flattenItems(collection.items);
    allItems.forEach((item) => {
      if (item.draft) {
        if (isItemARequest(item)) {
          // Skip auto-save for transient requests
          if (isItemTransientRequest(item)) {
            return;
          }
          const key = `request-${item.uid}`;
          scheduleAutoSave(key, () => dispatch(saveRequest(item.uid, collection.uid, true)), interval);
        } else if (isItemAFolder(item)) {
          const key = `folder-${item.uid}`;
          scheduleAutoSave(key, () => dispatch(saveFolderRoot(collection.uid, item.uid, true)), interval);
        }
      }
    });
  });

  // Check global environment drafts
  const globalEnvironmentDraft = state.globalEnvironments?.globalEnvironmentDraft;
  if (globalEnvironmentDraft) {
    const { environmentUid, variables } = globalEnvironmentDraft;
    if (environmentUid && variables) {
      const key = `global-environment-${environmentUid}`;
      scheduleAutoSave(key, () => dispatch(saveGlobalEnvironment({ variables, environmentUid })), interval);
    }
  }
};

// Helper to determine entity type and create save handler
const determineSaveHandler = (actionType, payload, dispatch, getState) => {
  const { itemUid, folderUid, collectionUid, environmentUid } = payload;

  // Handle environment drafts
  if (actionType === 'collections/setEnvironmentsDraft') {
    if (!environmentUid || !collectionUid) return null;
    return {
      key: `environment-${collectionUid}-${environmentUid}`,
      save: () => {
        const state = getState();
        const collection = state.collections.collections.find((c) => c.uid === collectionUid);
        const draft = collection?.environmentsDraft;
        if (draft?.environmentUid === environmentUid && draft?.variables) {
          dispatch(saveEnvironment(draft.variables, environmentUid, collectionUid));
        }
      }
    };
  }

  if (actionType === 'global-environments/setGlobalEnvironmentDraft') {
    if (!environmentUid) return null;
    return {
      key: `global-environment-${environmentUid}`,
      save: () => {
        const state = getState();
        const draft = state.globalEnvironments?.globalEnvironmentDraft;
        if (draft?.environmentUid === environmentUid && draft?.variables) {
          dispatch(saveGlobalEnvironment({ variables: draft.variables, environmentUid }));
        }
      }
    };
  }

  // Handle folder actions
  if (folderUid) {
    return {
      key: `folder-${folderUid}`,
      save: () => dispatch(saveFolderRoot(collectionUid, folderUid, true))
    };
  }

  // Handle request actions
  if (itemUid) {
    // Check if this is a transient request and skip auto-save
    const state = getState();
    const collection = findCollectionByUid(state.collections.collections, collectionUid);
    if (collection) {
      const item = findItemInCollection(collection, itemUid);
      if (item && isItemTransientRequest(item)) {
        return null; // Skip auto-save for transient requests
      }
    }

    return {
      key: `request-${itemUid}`,
      save: () => dispatch(saveRequest(itemUid, collectionUid, true))
    };
  }

  // Handle collection-level changes
  if (collectionUid) {
    return {
      key: `collection-${collectionUid}`,
      save: () => dispatch(saveCollectionSettings(collectionUid, null, true))
    };
  }

  return null;
};

export const autosaveMiddleware = ({ dispatch, getState }) => (next) => (action) => {
  // Let the action update the state first
  const result = next(action);

  // Check if autosave is enabled
  const { autoSave } = getState().app.preferences;
  if (!autoSave?.enabled) return result;

  // When autosave is enabled (or settings change), save any existing drafts
  if (action.type === 'app/updatePreferences' && action.payload?.autoSave?.enabled) {
    saveExistingDrafts(dispatch, getState, autoSave.interval);
    return result;
  }

  if (action.type === 'app/updatePreferences' && action.payload?.autoSave?.enabled === false) {
    Object.keys(pendingTimers).forEach((key) => {
      clearTimeout(pendingTimers[key]);
      delete pendingTimers[key];
    });
    return result;
  }

  // Only handle actions that create dirty state
  if (!actionsToIntercept.includes(action.type)) return result;

  const handler = determineSaveHandler(action.type, action.payload, dispatch, getState);
  if (handler) {
    scheduleAutoSave(handler.key, handler.save, autoSave.interval);
  }

  return result;
};
