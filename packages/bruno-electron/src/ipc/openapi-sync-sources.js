const path = require('node:path');
const { ipcMain } = require('electron');
const { getSourceState, approveSource, dismissSource, describeSource } = require('../services/openapi-sync-sources');
const { sourceApprovalArgs, loadBrunoConfig } = require('./openapi-sync');

const requireCollectionPath = (collectionPath) => {
  if (typeof collectionPath !== 'string' || !path.isAbsolute(collectionPath)) {
    throw new Error('A collection path is required');
  }
};

// Read from the collection file, never the renderer, so an approval names the source the collection points at.
const currentSourceArgs = (collectionPath) => {
  requireCollectionPath(collectionPath);
  let sourceUrl;
  try {
    sourceUrl = loadBrunoConfig(collectionPath).brunoConfig?.openapi?.[0]?.sourceUrl;
  } catch {
    sourceUrl = undefined;
  }
  return sourceApprovalArgs(collectionPath, sourceUrl);
};

const getOpenApiSyncSourceState = ({ collectionPath } = {}) => {
  const args = currentSourceArgs(collectionPath);
  if (!args.sourceKey) {
    return { status: 'none' };
  }
  return { source: args.sourceKey, ...describeSource(args.sourceKey), ...getSourceState(args) };
};

// Refuse when the file changed after the banner showed the source, so a click never approves an unseen source.
const requireShownSource = (sourceKey, expectedSource) => {
  if (expectedSource !== undefined && expectedSource !== sourceKey) {
    throw new Error('The sync source changed since it was shown. Review the new source.');
  }
};

// `sourceUrl` comes only from the Connect form, before the typed source is saved.
const approveOpenApiSyncSource = ({ collectionPath, sourceUrl, expectedSource, autoCheck, autoCheckInterval } = {}) => {
  requireCollectionPath(collectionPath);
  const sourceKey = sourceUrl === undefined
    ? currentSourceArgs(collectionPath).sourceKey
    : sourceApprovalArgs(collectionPath, sourceUrl).sourceKey;
  if (!sourceKey) {
    throw new Error('This collection has no sync source to approve');
  }
  requireShownSource(sourceKey, expectedSource);
  approveSource({ collectionPath, sourceKey, autoCheck, autoCheckInterval });
  return getOpenApiSyncSourceState({ collectionPath });
};

const dismissOpenApiSyncSource = ({ collectionPath, expectedSource } = {}) => {
  const args = currentSourceArgs(collectionPath);
  requireShownSource(args.sourceKey, expectedSource);
  if (args.sourceKey) {
    dismissSource({ collectionPath, sourceKey: args.sourceKey });
  }
  return getOpenApiSyncSourceState({ collectionPath });
};

const registerOpenApiSyncSourcesIpc = () => {
  ipcMain.handle('renderer:get-openapi-sync-source-state', (_event, request) => getOpenApiSyncSourceState(request));
  ipcMain.handle('renderer:approve-openapi-sync-source', (_event, request) => approveOpenApiSyncSource(request));
  ipcMain.handle('renderer:dismiss-openapi-sync-source', (_event, request) => dismissOpenApiSyncSource(request));
};

module.exports = {
  getOpenApiSyncSourceState,
  approveOpenApiSyncSource,
  dismissOpenApiSyncSource,
  registerOpenApiSyncSourcesIpc
};
