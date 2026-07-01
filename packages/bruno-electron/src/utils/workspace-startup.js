const fs = require('fs');
const path = require('path');
const snapshotManager = require('../services/snapshot');
const { readWorkspaceConfig, validateWorkspaceConfig } = require('./workspace-config');

const normalizeWorkspacePathname = (workspacePath) => {
  if (typeof workspacePath !== 'string' || !workspacePath.length) {
    return '';
  }

  return path.normalize(workspacePath.replace(/\\+$/, '').replace(/\/+$/, ''));
};

const prioritizeActiveWorkspacePath = (workspacePaths, activeWorkspacePath) => {
  if (!activeWorkspacePath || !Array.isArray(workspacePaths) || workspacePaths.length <= 1) {
    return workspacePaths;
  }

  const normalizedActivePath = normalizeWorkspacePathname(activeWorkspacePath);
  if (!normalizedActivePath) {
    return workspacePaths;
  }

  const activeIndex = workspacePaths.findIndex(
    (workspacePath) => normalizeWorkspacePathname(workspacePath) === normalizedActivePath
  );

  if (activeIndex <= 0) {
    return workspacePaths;
  }

  const prioritizedPaths = [...workspacePaths];
  const [activePath] = prioritizedPaths.splice(activeIndex, 1);
  prioritizedPaths.unshift(activePath);
  return prioritizedPaths;
};

const isValidWorkspacePathOnDisk = (workspacePath, { validateConfig = false } = {}) => {
  const workspaceYmlPath = path.join(workspacePath, 'workspace.yml');

  if (!fs.existsSync(workspaceYmlPath)) {
    return false;
  }

  if (!validateConfig) {
    return true;
  }

  try {
    const workspaceConfig = readWorkspaceConfig(workspacePath);
    validateWorkspaceConfig(workspaceConfig);
    return true;
  } catch (error) {
    return false;
  }
};

const resolveLastOpenedWorkspacePaths = (lastOpenedWorkspaces, {
  defaultWorkspacePath = null,
  validateConfig = false
} = {}) => {
  const workspacePaths = lastOpenedWorkspaces.getAll();
  const activeWorkspacePath = snapshotManager.getSnapshot()?.activeWorkspacePath;
  const validWorkspaces = [];
  const invalidPaths = [];
  for (const workspacePath of workspacePaths) {
    if (defaultWorkspacePath && workspacePath === defaultWorkspacePath) {
      continue;
    }

    if (isValidWorkspacePathOnDisk(workspacePath, { validateConfig })) {
      validWorkspaces.push(workspacePath);
    } else {
      invalidPaths.push(workspacePath);
    }
  }

  let prioritizedWorkspaces = prioritizeActiveWorkspacePath(validWorkspaces, activeWorkspacePath);

  if (activeWorkspacePath) {
    const normalizedActivePath = normalizeWorkspacePathname(activeWorkspacePath);
    const alreadyIncluded = prioritizedWorkspaces.some(
      (workspacePath) => normalizeWorkspacePathname(workspacePath) === normalizedActivePath
    );

    if (
      !alreadyIncluded
      && normalizedActivePath
      && (!defaultWorkspacePath || activeWorkspacePath !== defaultWorkspacePath)
      && isValidWorkspacePathOnDisk(activeWorkspacePath, { validateConfig })
    ) {
      prioritizedWorkspaces.unshift(activeWorkspacePath);
    }
  }

  for (const invalidPath of invalidPaths) {
    lastOpenedWorkspaces.remove(invalidPath);
  }

  return {
    validWorkspaces: prioritizedWorkspaces,
    invalidPaths
  };
};

module.exports = {
  normalizeWorkspacePathname,
  prioritizeActiveWorkspacePath,
  isValidWorkspacePathOnDisk,
  resolveLastOpenedWorkspacePaths
};
