import toast from 'react-hot-toast';
import get from 'lodash/get';
import { uuid } from 'utils/common';
import { formatIpcError } from 'utils/common/error';
import { callIpc } from 'utils/common/ipc';
import { OPEN_COLLECTION_PAGE } from 'utils/common/constants';
import { selectCollections } from 'src/selectors/collections';
import { updatePreferences } from 'providers/ReduxStore/slices/app';
import { browseDirectories, browseDirectory, mountCollection, openMultipleCollections } from 'providers/ReduxStore/slices/collections/actions';
import { expandCollection } from 'providers/ReduxStore/slices/collections';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import {
  showOpenCollectionModal,
  showOpenCollectionPage,
  hideOpenCollectionModal,
  folderPickStarted,
  folderSearchStarted,
  folderSearchFinished,
  folderPickEnded,
  folderResultAddedToSearch,
  importLoadStarted,
  importLoadEnded,
  collectionsOpeningStarted,
  collectionsOpeningEnded,
  recentsLoadStarted,
  recentsLoadFinished,
  recentsLoadFailed,
  myComputerScanStarted,
  myComputerLocationsReceived,
  myComputerScanFailed
} from './index';
import { selectOpenCollectionPathKeys } from './selectors';
import { countOf, getFolderSearchOutcome } from './folder-results';
import { getFolderName, toPathKey } from './collection-paths';
import { readImportableFile, readImportFiles, readImportText } from './import-sources';

const getSearchLabel = (folderPaths) =>
  folderPaths.length === 1 ? getFolderName(folderPaths[0]) : `${folderPaths.length} folders`;

const cancelSearchInMain = (searchId) => callIpc('renderer:collection-search:cancel', { requestId: searchId });

const cancelScanInMain = (scanId) => callIpc('renderer:collection-scan:cancel', { scanId });

export const closeOpenCollectionModal = () => (dispatch, getState) => {
  const { chooseFolder, myComputer } = getState().openCollectionModal;
  if (chooseFolder.searchId) {
    cancelSearchInMain(chooseFolder.searchId);
  }
  if (myComputer.status === 'scanning') {
    cancelScanInMain(myComputer.scanId);
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
    dispatch(expandCollection(collection.uid));
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
    result = await dispatch(openMultipleCollections(collectionPaths, { silent: true, recordRecent: true }));
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
    toast.error(`Failed to open ${countOf(failedCount, 'collection')}`);
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
    if (getState().openCollectionModal.page !== OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) {
      dispatch(showOpenCollectionPage(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER));
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

export const cancelCollectionSearch = () => (dispatch, getState) => {
  cancelSearchInMain(getState().openCollectionModal.chooseFolder.searchId);
  dispatch(folderPickEnded());
};

const loadImportData = (read) => async (dispatch, getState) => {
  if (getState().openCollectionModal.chooseFolder.searchId) {
    dispatch(cancelCollectionSearch());
  }
  const loadId = uuid();
  dispatch(importLoadStarted(loadId));
  const isCurrentLoad = () => getState().openCollectionModal.importLoadId === loadId;

  try {
    const importData = await read();
    if (isCurrentLoad()) {
      dispatch(importLoadEnded());
      return importData;
    }
  } catch (error) {
    if (isCurrentLoad()) {
      dispatch(importLoadEnded());
      toast.error(formatIpcError(error) || 'Import collection failed');
    }
  }
  return null;
};

export const loadImportFiles = (files) => async (dispatch) => {
  const importData = await dispatch(loadImportData(() => readImportFiles(files)));
  const skippedFileNames = importData?.skippedFileNames ?? [];
  if (skippedFileNames.length > 0) {
    toast(`${skippedFileNames.join(', ')} ${skippedFileNames.length === 1 ? 'isn’t a valid collection, so it was' : 'aren’t valid collections, so they were'} skipped.`);
  }
  return importData;
};

export const loadImportText = (text) => loadImportData(() => readImportText(text));

export const loadImportableFile = (file) => (dispatch) => {
  dispatch(showOpenCollectionPage(OPEN_COLLECTION_PAGE.IMPORT));
  return dispatch(loadImportData(() => readImportableFile(file)));
};

export const openDroppedItems = ({ folderPaths, hasFolders, files }) => async (dispatch, getState) => {
  if (getState().openCollectionModal.openingId) {
    return;
  }
  if (hasFolders && folderPaths.length === 0) {
    toast.error('Could not read the dropped folders');
    return;
  }
  if (folderPaths.length > 0) {
    dispatch(showOpenCollectionPage(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER));
    await dispatch(findCollectionsInFolders(folderPaths, files.length));
  } else if (files.length > 0) {
    dispatch(showOpenCollectionPage(OPEN_COLLECTION_PAGE.IMPORT));
    return dispatch(loadImportFiles(files));
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

export const loadRecentCollections = () => async (dispatch) => {
  const loadId = uuid();
  dispatch(recentsLoadStarted(loadId));

  try {
    const items = await callIpc('datastore:recent_collections:list_recent_collections');
    dispatch(recentsLoadFinished({ loadId, items }));
  } catch (error) {
    dispatch(recentsLoadFailed({ loadId, error: formatIpcError(error) }));
  }
};

export const scanMyComputer = () => async (dispatch) => {
  const scanId = uuid();
  dispatch(myComputerScanStarted(scanId));

  try {
    const started = await callIpc('renderer:collection-scan:start', { scanId });
    if (started) {
      dispatch(myComputerLocationsReceived({ scanId, locations: started.locations }));
    }
  } catch (error) {
    dispatch(myComputerScanFailed({ scanId, error: formatIpcError(error) || 'Could not start the scan' }));
  }
};

const getSearchFolders = (state) => {
  const searchFolders = get(state.app.preferences, 'openCollection.searchFolders');
  return Array.isArray(searchFolders) ? searchFolders : [];
};

const latestSearchSettingSaveIds = {};

const saveSearchSetting = (key, value, channel, failureText) => async (dispatch, getState) => {
  const saveId = uuid();
  latestSearchSettingSaveIds[key] = saveId;
  const { preferences } = getState().app;
  const previousValue = preferences.openCollection?.[key];
  dispatch(updatePreferences({ ...preferences, openCollection: { ...preferences.openCollection, [key]: value } }));

  try {
    await callIpc(channel, value);
  } catch (error) {
    const current = getState().app.preferences;
    if (latestSearchSettingSaveIds[key] === saveId && current.openCollection?.[key] === value) {
      dispatch(updatePreferences({ ...current, openCollection: { ...current.openCollection, [key]: previousValue } }));
    }
    toast.error(formatIpcError(error) || failureText);
    return false;
  }

  if (getState().openCollectionModal.myComputer.status !== 'idle') {
    dispatch(scanMyComputer());
  }
  return true;
};

export const saveSearchWholeComputer = (enabled) =>
  saveSearchSetting('searchWholeComputer', enabled, 'renderer:save-search-whole-computer', 'Could not update whole computer search');

export const addSearchFolders = (folderPaths) => async (dispatch, getState) => {
  const searchFolders = getSearchFolders(getState());
  const savedKeys = new Set(searchFolders.map(toPathKey));
  const newFolders = folderPaths.filter((folderPath) => !savedKeys.has(toPathKey(folderPath)));
  if (newFolders.length === 0) {
    return true;
  }
  return dispatch(saveSearchSetting('searchFolders', [...searchFolders, ...newFolders], 'renderer:save-search-folders', 'Could not add that folder'));
};

export const removeSearchFolder = (folderPath) => async (dispatch, getState) => {
  const searchFolders = getSearchFolders(getState());
  const removedKey = toPathKey(folderPath);
  const remainingFolders = searchFolders.filter((searchFolder) => toPathKey(searchFolder) !== removedKey);
  if (remainingFolders.length === searchFolders.length) {
    return true;
  }
  return dispatch(saveSearchSetting('searchFolders', remainingFolders, 'renderer:save-search-folders', 'Could not remove that folder'));
};

export const pickSearchFolder = () => async (dispatch) => {
  let folderPath;
  try {
    folderPath = await dispatch(browseDirectory());
  } catch (error) {
    toast.error(formatIpcError(error) || 'Could not add that folder');
    return;
  }
  if (folderPath) {
    await dispatch(addSearchFolders([folderPath]));
  }
};

export const addFolderResultToSearch = () => async (dispatch, getState) => {
  const { result } = getState().openCollectionModal.chooseFolder;
  if (await dispatch(addSearchFolders(result.folders))) {
    const text = `Bruno now also searches ${result.folders.map(getFolderName).join(', ')}. Its collections show up in My computer too.`;
    dispatch(folderResultAddedToSearch({ resultId: result.id, text }));
  }
};

export const openCollectionModal = (page, { pickFolders = false } = {}) => (dispatch, getState) => {
  const { isOpen, myComputer } = getState().openCollectionModal;
  dispatch(isOpen ? showOpenCollectionPage(page) : showOpenCollectionModal(page));
  if (page === OPEN_COLLECTION_PAGE.RECENTS) {
    dispatch(loadRecentCollections());
  }
  if (page === OPEN_COLLECTION_PAGE.MY_COMPUTER && myComputer.status === 'idle') {
    dispatch(loadRecentCollections());
    dispatch(scanMyComputer());
  }
  if (pickFolders && page === OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) {
    dispatch(pickCollectionFolders());
  }
};

export const openCollectionModalOnLastPage = () => (dispatch, getState) =>
  dispatch(openCollectionModal(getState().openCollectionModal.lastPage));

export const recentCollectionsChangedEvent = () => (dispatch, getState) => {
  if (getState().openCollectionModal.isOpen) {
    dispatch(loadRecentCollections());
  }
};
