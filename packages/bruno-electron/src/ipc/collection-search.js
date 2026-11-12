const path = require('node:path');
const { ipcMain } = require('electron');
const { transientManager } = require('../services/transient');
const { findCollectionsInFolders } = require('../services/collection-search/find-in-folders');

const MAX_FOLDERS_PER_SEARCH = 1000;
const MAX_REQUEST_ID_LENGTH = 100;
const PAGE_GONE_EVENTS = ['did-navigate', 'render-process-gone', 'destroyed'];

const activeSearches = new Map();

const isRequestId = (requestId) =>
  typeof requestId === 'string' && requestId.length > 0 && requestId.length <= MAX_REQUEST_ID_LENGTH;

const isFolderPathList = (paths) =>
  Array.isArray(paths)
  && paths.length > 0
  && paths.length <= MAX_FOLDERS_PER_SEARCH
  && paths.every((folderPath) => typeof folderPath === 'string' && path.isAbsolute(folderPath));

const abortWhenPageIsGone = (sender, controller) => {
  const abort = () => controller.abort();
  PAGE_GONE_EVENTS.forEach((eventName) => sender.on(eventName, abort));
  return () => PAGE_GONE_EVENTS.forEach((eventName) => sender.removeListener(eventName, abort));
};

const findInFolders = async (request, sender) => {
  const { requestId, paths } = request || {};
  if (!isRequestId(requestId)) {
    throw new Error('A folder search needs a request id');
  }
  if (!isFolderPathList(paths)) {
    throw new Error(`A folder search needs 1 to ${MAX_FOLDERS_PER_SEARCH} absolute folder paths`);
  }
  if (activeSearches.has(requestId)) {
    throw new Error(`Folder search ${requestId} is already running`);
  }

  const controller = new AbortController();
  const stopWatchingPage = abortWhenPageIsGone(sender, controller);
  activeSearches.set(requestId, controller);
  try {
    return await findCollectionsInFolders(paths, {
      signal: controller.signal,
      excludedFolders: [transientManager.getRootDirectory()]
    });
  } catch (error) {
    if (controller.signal.aborted) {
      return null;
    }
    throw error;
  } finally {
    activeSearches.delete(requestId);
    stopWatchingPage();
  }
};

const cancelSearch = (request) => {
  const { requestId } = request || {};
  activeSearches.get(requestId)?.abort();
};

const registerCollectionSearchIpc = () => {
  ipcMain.handle('renderer:collection-search:find-in-folders', (event, request) => findInFolders(request, event.sender));
  ipcMain.handle('renderer:collection-search:cancel', (_event, request) => cancelSearch(request));
};

module.exports = {
  findInFolders,
  cancelSearch,
  registerCollectionSearchIpc
};
