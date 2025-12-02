import { saveRequest, saveCollectionSettings, saveFolderRoot } from '../../slices/collections/actions';
import { flattenItems, isItemARequest, isItemAFolder } from 'utils/collections';

const actionsToIntercept = [
  // Request-level actions
  'collections/requestUrlChanged',
  'collections/updateAuth',
  'collections/addQueryParam',
  'collections/moveQueryParam',
  'collections/updateQueryParam',
  'collections/deleteQueryParam',
  'collections/updatePathParam',
  'collections/addRequestHeader',
  'collections/updateRequestHeader',
  'collections/deleteRequestHeader',
  'collections/moveRequestHeader',
  'collections/addFormUrlEncodedParam',
  'collections/updateFormUrlEncodedParam',
  'collections/deleteFormUrlEncodedParam',
  'collections/moveFormUrlEncodedParam',
  'collections/addMultipartFormParam',
  'collections/updateMultipartFormParam',
  'collections/deleteMultipartFormParam',
  'collections/moveMultipartFormParam',
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

  // Folder-level actions
  'collections/addFolderHeader',
  'collections/updateFolderHeader',
  'collections/deleteFolderHeader',
  'collections/addFolderVar',
  'collections/updateFolderVar',
  'collections/deleteFolderVar',
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
  'collections/addCollectionVar',
  'collections/updateCollectionVar',
  'collections/deleteCollectionVar',
  'collections/updateCollectionAuth',
  'collections/updateCollectionAuthMode',
  'collections/updateCollectionRequestScript',
  'collections/updateCollectionResponseScript',
  'collections/updateCollectionTests',
  'collections/updateCollectionDocs',
  'collections/updateCollectionClientCertificates',
  'collections/updateCollectionProtobuf',
  'collections/updateCollectionProxy'
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
  const collections = getState().collections.collections;

  collections.forEach((collection) => {
    // Check collection-level draft
    if (collection.draft) {
      const key = `collection-${collection.uid}`;
      scheduleAutoSave(key, () => dispatch(saveCollectionSettings(collection.uid, null, true)), interval);
    }

    // Check all items (requests and folders) for drafts
    const allItems = flattenItems(collection.items);
    allItems.forEach((item) => {
      if (item.draft) {
        if (isItemARequest(item)) {
          const key = `request-${item.uid}`;
          scheduleAutoSave(key, () => dispatch(saveRequest(item.uid, collection.uid, true)), interval);
        } else if (isItemAFolder(item)) {
          const key = `folder-${item.uid}`;
          scheduleAutoSave(key, () => dispatch(saveFolderRoot(collection.uid, item.uid, true)), interval);
        }
      }
    });
  });
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

  const { itemUid, folderUid, collectionUid } = action.payload;
  const interval = autoSave.interval;

  // Determine what to save based on what IDs are present
  let key, save;

  if (itemUid) {
    // Request change
    key = `request-${itemUid}`;
    save = () => dispatch(saveRequest(itemUid, collectionUid, true));
  } else if (folderUid) {
    // Folder change
    key = `folder-${folderUid}`;
    save = () => dispatch(saveFolderRoot(collectionUid, folderUid, true));
  } else if (collectionUid) {
    // Collection change
    key = `collection-${collectionUid}`;
    save = () => dispatch(saveCollectionSettings(collectionUid, null, true));
  }

  if (key && save) {
    scheduleAutoSave(key, save, interval);
  }

  return result;
};
