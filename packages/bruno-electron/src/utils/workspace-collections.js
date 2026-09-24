const path = require('path');
const LastOpenedWorkspaces = require('../store/last-opened-workspaces');
const { defaultWorkspaceManager } = require('../store/default-workspace');
const { resolveLastOpenedWorkspacePaths } = require('./workspace-startup');
const { getWorkspaceCollections } = require('./workspace-config');

const getAllWorkspaceCollections = async () => {
  const allCollections = new Map();
  let defaultWorkspacePath = null;

  const defaultResult = await defaultWorkspaceManager.ensureDefaultWorkspaceExists();
  if (defaultResult) {
    defaultWorkspacePath = defaultResult.workspacePath;
    for (const collection of getWorkspaceCollections(defaultResult.workspacePath)) {
      if (!collection.notFoundLocally) allCollections.set(collection.path, collection);
    }
  }

  const lastOpenedWorkspaces = new LastOpenedWorkspaces();
  const { validWorkspaces } = resolveLastOpenedWorkspacePaths(lastOpenedWorkspaces, { defaultWorkspacePath });

  for (const workspacePath of validWorkspaces) {
    try {
      for (const collection of getWorkspaceCollections(workspacePath)) {
        if (!collection.notFoundLocally) allCollections.set(collection.path, collection);
      }
    } catch (err) {
      console.error(`Error loading workspace ${workspacePath}:`, err);
    }
  }

  return Array.from(allCollections.values());
};

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

module.exports = { getAllWorkspaceCollections, findWorkspacePathForCollection };
