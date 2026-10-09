const path = require('path');
const LastOpenedWorkspaces = require('../store/last-opened-workspaces');
const { defaultWorkspaceManager } = require('../store/default-workspace');
const { resolveLastOpenedWorkspacePaths } = require('./workspace-startup');
const { getWorkspaceCollections } = require('./workspace-config');

const findWorkspacePathForCollection = async (collectionPath) => {
  const normalizedTarget = path.resolve(collectionPath);
  let defaultWorkspacePath = null;

  const defaultResult = await defaultWorkspaceManager.ensureDefaultWorkspaceExists();
  if (defaultResult) {
    defaultWorkspacePath = defaultResult.workspacePath;
    const isInDefault = getWorkspaceCollections(defaultWorkspacePath)
      .some((collection) => path.resolve(collection.path) === normalizedTarget);
    if (isInDefault) return defaultWorkspacePath;
  }

  const lastOpenedWorkspaces = new LastOpenedWorkspaces();
  const { validWorkspaces } = resolveLastOpenedWorkspacePaths(lastOpenedWorkspaces, { defaultWorkspacePath });

  for (const workspacePath of validWorkspaces) {
    try {
      const isInWorkspace = getWorkspaceCollections(workspacePath)
        .some((collection) => path.resolve(collection.path) === normalizedTarget);
      if (isInWorkspace) return workspacePath;
    } catch (err) {}
  }

  return null;
};

module.exports = { findWorkspacePathForCollection };
