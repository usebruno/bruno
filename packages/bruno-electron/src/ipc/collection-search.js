const path = require('node:path');
const { ipcMain } = require('electron');
const { transientManager } = require('../services/transient');
const { findCollectionsInFolders } = require('../services/collection-search/find-in-folders');
const { readImportableFileText } = require('../services/collection-search/importable-files');

const MAX_FOLDERS_PER_SEARCH = 1000;
const MAX_REQUEST_ID_LENGTH = 100;

const activeSearches = new Map();

const isRequestId = (requestId) =>
  typeof requestId === 'string' && requestId.length > 0 && requestId.length <= MAX_REQUEST_ID_LENGTH;

const isFolderPathList = (paths) =>
  Array.isArray(paths)
  && paths.length > 0
  && paths.length <= MAX_FOLDERS_PER_SEARCH
  && paths.every((folderPath) => typeof folderPath === 'string' && path.isAbsolute(folderPath));

const findInFolders = async (request) => {
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
  }
};

const cancelSearch = (request) => {
  const { requestId } = request || {};
  activeSearches.get(requestId)?.abort();
};

const readImportableFile = (request) => {
  const { path: filePath } = request || {};
  if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) {
    throw new Error('Reading an importable file needs an absolute path');
  }
  return readImportableFileText(filePath);
};

const registerCollectionSearchIpc = () => {
  ipcMain.handle('renderer:collection-search:find-in-folders', (_event, request) => findInFolders(request));
  ipcMain.handle('renderer:collection-search:cancel', (_event, request) => cancelSearch(request));
  ipcMain.handle('renderer:collection-search:read-importable-file', (_event, request) => readImportableFile(request));
};

module.exports = {
  findInFolders,
  cancelSearch,
  readImportableFile,
  registerCollectionSearchIpc
};
