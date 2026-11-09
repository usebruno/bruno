import toast from 'react-hot-toast';
import get from 'lodash/get';
import { pluralizeWord, uuid } from 'utils/common';
import { callIpc } from 'utils/common/ipc';
import { selectCollections } from 'src/selectors/collections';
import { updatePreferences } from 'providers/ReduxStore/slices/app';
import { browseDirectories, mountCollection, openMultipleCollections } from 'providers/ReduxStore/slices/collections/actions';
import { toggleCollection } from 'providers/ReduxStore/slices/collections';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import {
  showOpenCollectionModal,
  showOpenCollectionPage,
  hideOpenCollectionModal,
  folderPickStarted,
  folderSearchStarted,
  folderSearchFinished,
  folderPickEnded,
  folderResultCleared,
  collectionsOpeningStarted,
  collectionsOpeningEnded
} from './index';
import { selectOpenCollectionPathKeys } from './selectors';
import { getFolderSearchOutcome } from './folder-results';
import { getFolderName, toPathKey } from './collection-paths';

const CHOOSE_FOLDER_PAGE = 'choose-folder';
const IMPORT_PAGE = 'import';

const getSearchLabel = (folderPaths) =>
  folderPaths.length === 1 ? getFolderName(folderPaths[0]) : `${folderPaths.length} folders`;

const cancelSearchInMain = (searchId) => callIpc('renderer:collection-search:cancel', { requestId: searchId });

export const closeOpenCollectionModal = () => (dispatch, getState) => {
  const { searchId } = getState().openCollectionModal.chooseFolder;
  if (searchId) {
    cancelSearchInMain(searchId);
  }
  dispatch(hideOpenCollectionModal());
};

export const switchToCollection = (collectionPath) => (dispatch, getState) => {
  const pathKey = toPathKey(collectionPath);
  const collection = selectCollections(getState()).find((item) => toPathKey(item.pathname) === pathKey);
  if (collection) {
    if (collection.mountStatus !== 'mounted' && collection.mountStatus !== 'mounting') {
      dispatch(mountCollection({
        collectionUid: collection.uid,
        collectionPathname: collection.pathname,
        brunoConfig: collection.brunoConfig
      }));
    }
    if (collection.collapsed) {
      dispatch(toggleCollection(collection.uid));
    }
    dispatch(addTab({ uid: collection.uid, collectionUid: collection.uid, type: 'collection-settings' }));
  }
  dispatch(closeOpenCollectionModal());
};

export const openCollectionsFromModal = (collectionPaths) => async (dispatch, getState) => {
  if (getState().openCollectionModal.openingId) {
    return;
  }
  const openingId = uuid();
  dispatch(collectionsOpeningStarted(openingId));

  let result;
  try {
    result = await dispatch(openMultipleCollections(collectionPaths, { silent: true }));
  } catch (error) {
    dispatch(collectionsOpeningEnded(openingId));
    toast.error('An error occurred while opening the collections');
    return;
  }

  const failedCount = result.failed.length + result.invalid.length;
  if (result.opened.length > 0) {
    toast.success(result.opened.length === 1 ? 'Collection added to workspace' : 'Collections added to workspace');
  }
  if (failedCount > 0) {
    toast.error(`Failed to open ${failedCount} ${pluralizeWord('collection', failedCount)}`);
  }

  if (getState().openCollectionModal.openingId !== openingId) {
    return;
  }
  dispatch(result.opened.length > 0 ? closeOpenCollectionModal() : collectionsOpeningEnded(openingId));
};

export const findCollectionsInFolders = (folderPaths, droppedFileCount = 0) => async (dispatch, getState) => {
  const { searchId: runningSearchId } = getState().openCollectionModal.chooseFolder;
  if (runningSearchId) {
    cancelSearchInMain(runningSearchId);
  }

  const searchId = uuid();
  dispatch(folderSearchStarted({ searchId, searchLabel: getSearchLabel(folderPaths) }));
  const isCurrentSearch = () => getState().openCollectionModal.chooseFolder.searchId === searchId;

  let searchResult;
  try {
    searchResult = await callIpc('renderer:collection-search:find-in-folders', { requestId: searchId, paths: folderPaths });
  } catch (error) {
    if (isCurrentSearch()) {
      dispatch(folderPickEnded());
      toast.error('Could not inspect that folder');
    }
    return;
  }
  if (!isCurrentSearch()) {
    return;
  }

  const outcome = getFolderSearchOutcome(searchResult, new Set(selectOpenCollectionPathKeys(getState())), droppedFileCount);
  if (outcome.type === 'list' || outcome.type === 'message') {
    if (getState().openCollectionModal.page !== CHOOSE_FOLDER_PAGE) {
      dispatch(showOpenCollectionPage(CHOOSE_FOLDER_PAGE));
    }
    dispatch(folderSearchFinished({ searchId, result: { id: searchId, ...outcome } }));
    return;
  }

  dispatch(folderPickEnded());
  if (outcome.skippedText) {
    toast(outcome.skippedText);
  }
  if (outcome.type === 'open') {
    await dispatch(openCollectionsFromModal(outcome.paths));
  } else if (outcome.type === 'switch') {
    toast.success(`${outcome.name} is already open`);
    dispatch(switchToCollection(outcome.path));
  } else {
    toast.success('Those collections are already open');
    dispatch(closeOpenCollectionModal());
  }
};

export const openDroppedItems = ({ folderPaths, hasFolders, fileCount }) => async (dispatch, getState) => {
  if (getState().openCollectionModal.openingId) {
    return;
  }
  if (hasFolders && folderPaths.length === 0) {
    toast.error('Could not read the dropped folders');
    return;
  }
  if (folderPaths.length > 0) {
    dispatch(showOpenCollectionPage(CHOOSE_FOLDER_PAGE));
    await dispatch(findCollectionsInFolders(folderPaths, fileCount));
  } else if (fileCount > 0) {
    dispatch(showOpenCollectionPage(IMPORT_PAGE));
  }
};

export const pickCollectionFolders = () => async (dispatch, getState) => {
  const { openingId, chooseFolder } = getState().openCollectionModal;
  if (openingId || chooseFolder.status !== 'idle') {
    return;
  }
  dispatch(folderPickStarted());

  let folderPaths;
  try {
    folderPaths = await dispatch(browseDirectories());
  } catch (error) {
    dispatch(folderPickEnded());
    toast.error('An error occurred while opening the folder picker');
    return;
  }

  if (getState().openCollectionModal.chooseFolder.status !== 'picking') {
    return;
  }
  if (folderPaths.length === 0) {
    dispatch(folderPickEnded());
    return;
  }
  await dispatch(findCollectionsInFolders(folderPaths));
};

export const saveAutoOpenFolderPicker = (enabled) => async (dispatch, getState) => {
  const previous = getState().app.preferences;
  const updated = { ...previous, openCollection: { ...previous.openCollection, autoOpenFolderPicker: enabled } };
  dispatch(updatePreferences(updated));

  try {
    await callIpc('renderer:save-auto-open-folder-picker', enabled);
  } catch (error) {
    if (getState().app.preferences === updated) {
      dispatch(updatePreferences(previous));
    }
    toast.error('Failed to save preferences');
  }
};

export const cancelCollectionSearch = () => (dispatch, getState) => {
  cancelSearchInMain(getState().openCollectionModal.chooseFolder.searchId);
  dispatch(folderPickEnded());
};

export const openCollectionModal = (page) => (dispatch, getState) => {
  const { isOpen, openingId, chooseFolder } = getState().openCollectionModal;
  dispatch(isOpen ? showOpenCollectionPage(page) : showOpenCollectionModal(page));

  if (page !== CHOOSE_FOLDER_PAGE || openingId) {
    return;
  }
  if (chooseFolder.result) {
    dispatch(folderResultCleared());
  }
  if (get(getState().app.preferences, 'openCollection.autoOpenFolderPicker', true)) {
    dispatch(pickCollectionFolders());
  }
};
