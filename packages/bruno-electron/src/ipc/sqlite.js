const { ipcMain } = require('electron');
const { getStatements, getFiles } = require('../services/sqlite');
const { readRunnerExchange, clearRunnerResponses } = require('../services/runner-exchange');

const requireUid = (value, name) => {
  if (typeof value !== 'string' || value === '') {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value;
};

const requireFileId = (value) => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error('id must be a positive integer');
  }
  return value;
};

const registerSqliteIpc = () => {
  ipcMain.handle('datastore:file-index:file_index_size', () => {
    return getStatements().execute('file_index_size');
  });

  ipcMain.handle('datastore:file-index:file_index_clear', () => {
    return getStatements().execute('file_index_clear');
  });

  ipcMain.handle('datastore:runner_responses:get_runner_response', (_event, params) => {
    const request_uid = requireUid(params?.request_uid, 'request_uid');
    return readRunnerExchange(request_uid);
  });

  ipcMain.handle('datastore:runner_responses:delete_runner_responses_for_collection', (_event, params) => {
    const collection_uid = requireUid(params?.collection_uid, 'collection_uid');
    return clearRunnerResponses(collection_uid);
  });

  ipcMain.handle('datastore:files:stat', (_event, params) => {
    return getFiles().stat(requireFileId(params?.id));
  });

  ipcMain.handle('datastore:files:read', (_event, params) => {
    return getFiles().read(requireFileId(params?.id));
  });
};

module.exports = { registerSqliteIpc };
