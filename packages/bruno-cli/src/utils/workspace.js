const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const findWorkspacePath = (startPath) => {
  let currentPath = startPath;
  while (currentPath !== path.dirname(currentPath)) {
    const workspaceYmlPath = path.join(currentPath, 'workspace.yml');
    if (fs.existsSync(workspaceYmlPath)) {
      return currentPath;
    }
    currentPath = path.dirname(currentPath);
  }
  return null;
};

// The collection paths a workspace.yml lists, resolved against the workspace the way the app's
// resolveWorkspaceCollectionPaths (bruno-electron/src/utils/workspace-config.js) does; keep the
// two in sync.
const getWorkspaceCollectionPaths = (workspacePath) => {
  const workspaceConfig = yaml.load(fs.readFileSync(path.join(workspacePath, 'workspace.yml'), 'utf8'));
  const collectionPaths = (workspaceConfig?.collections || [])
    .filter((collection) => typeof collection?.path === 'string' && collection.path)
    .map((collection) => {
      const collectionPath = collection.path.replace(/\\/g, '/');
      return path.normalize(path.isAbsolute(collectionPath) ? collectionPath : path.resolve(workspacePath, collectionPath));
    });
  return [...new Set(collectionPaths)];
};

const canonicalPath = (pathname) => {
  try {
    return fs.realpathSync(pathname);
  } catch (err) {
    return path.resolve(pathname);
  }
};

// A workspace.yml found above a collection only covers it when it lists it, as the app only
// knows a collection's workspace from having opened it there.
const isCollectionInWorkspace = (workspacePath, collectionPath) => {
  const collectionCanonicalPath = canonicalPath(collectionPath);
  return getWorkspaceCollectionPaths(workspacePath)
    .some((workspaceCollectionPath) => path.relative(canonicalPath(workspaceCollectionPath), collectionCanonicalPath) === '');
};

module.exports = {
  findWorkspacePath,
  getWorkspaceCollectionPaths,
  isCollectionInWorkspace
};
