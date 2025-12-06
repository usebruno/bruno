const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { writeFile, validateName } = require('./filesystem');

const WORKSPACE_TYPE = 'workspace';

const makeRelativePath = (workspacePath, absolutePath) => {
  if (!path.isAbsolute(absolutePath)) {
    return absolutePath;
  }

  try {
    const relativePath = path.relative(workspacePath, absolutePath);
    if (relativePath.startsWith('..') && relativePath.split(path.sep).filter((s) => s === '..').length > 2) {
      return absolutePath;
    }
    return relativePath;
  } catch (error) {
    return absolutePath;
  }
};

const normalizeCollectionEntry = (workspacePath, collection) => {
  const relativePath = makeRelativePath(workspacePath, collection.path);

  const normalizedCollection = {
    name: collection.name,
    path: relativePath
  };

  if (collection.remote) {
    normalizedCollection.remote = collection.remote;
  }

  return normalizedCollection;
};

const validateWorkspacePath = (workspacePath) => {
  if (!workspacePath) {
    throw new Error('Workspace path is required');
  }

  if (!fs.existsSync(workspacePath)) {
    throw new Error(`Workspace path does not exist: ${workspacePath}`);
  }

  const workspaceFilePath = path.join(workspacePath, 'workspace.yml');
  if (!fs.existsSync(workspaceFilePath)) {
    throw new Error('Invalid workspace: workspace.yml not found');
  }

  return true;
};

const validateWorkspaceDirectory = (dirPath) => {
  if (!validateName(path.basename(dirPath))) {
    throw new Error(`Invalid workspace directory name: ${dirPath}`);
  }
  return true;
};

const createWorkspaceConfig = (workspaceName) => ({
  name: workspaceName,
  type: WORKSPACE_TYPE,
  version: '1.0.0',
  docs: '',
  collections: []
});

const readWorkspaceConfig = (workspacePath) => {
  const workspaceFilePath = path.join(workspacePath, 'workspace.yml');

  if (!fs.existsSync(workspaceFilePath)) {
    throw new Error('Invalid workspace: workspace.yml not found');
  }

  const yamlContent = fs.readFileSync(workspaceFilePath, 'utf8');
  const workspaceConfig = yaml.load(yamlContent);

  if (!workspaceConfig || typeof workspaceConfig !== 'object') {
    throw new Error('Invalid workspace: workspace.yml is malformed');
  }

  return workspaceConfig;
};

const writeWorkspaceConfig = async (workspacePath, config) => {
  const yamlContent = yaml.dump(config, {
    indent: 2,
    lineWidth: -1,
    noRefs: true
  });
  await writeFile(path.join(workspacePath, 'workspace.yml'), yamlContent);
};

const validateWorkspaceConfig = (config) => {
  if (!config || typeof config !== 'object') {
    throw new Error('Workspace configuration must be an object');
  }

  if (config.type !== WORKSPACE_TYPE) {
    throw new Error('Invalid workspace: not a bruno workspace');
  }

  if (!config.name || typeof config.name !== 'string') {
    throw new Error('Workspace must have a valid name');
  }

  return true;
};

const updateWorkspaceName = async (workspacePath, newName) => {
  const config = readWorkspaceConfig(workspacePath);
  config.name = newName;
  await writeWorkspaceConfig(workspacePath, config);
  return config;
};

const updateWorkspaceDocs = async (workspacePath, docs) => {
  const config = readWorkspaceConfig(workspacePath);
  config.docs = docs;
  await writeWorkspaceConfig(workspacePath, config);
  return docs;
};

const addCollectionToWorkspace = async (workspacePath, collection) => {
  const config = readWorkspaceConfig(workspacePath);

  if (!config.collections) {
    config.collections = [];
  }

  // Normalize collection entry
  const normalizedCollection = {
    name: collection.name,
    path: collection.path
  };

  if (collection.remote) {
    normalizedCollection.remote = collection.remote;
  }

  // Check if collection already exists
  const existingIndex = config.collections.findIndex((c) => c.name === normalizedCollection.name || c.path === normalizedCollection.path);

  if (existingIndex >= 0) {
    config.collections[existingIndex] = normalizedCollection;
  } else {
    config.collections.push(normalizedCollection);
  }

  await writeWorkspaceConfig(workspacePath, config);
  return config.collections;
};

const removeCollectionFromWorkspace = async (workspacePath, collectionPath) => {
  const config = readWorkspaceConfig(workspacePath);

  let removedCollection = null;
  let shouldDeleteFiles = false;

  config.collections = (config.collections || []).filter((c) => {
    const collectionPathFromYml = c.path;

    if (!collectionPathFromYml) {
      return true;
    }

    // Convert to absolute path for comparison
    const absoluteCollectionPath = path.isAbsolute(collectionPathFromYml)
      ? collectionPathFromYml
      : path.resolve(workspacePath, collectionPathFromYml);

    if (path.normalize(absoluteCollectionPath) === path.normalize(collectionPath)) {
      removedCollection = c;

      // Delete files only for workspace collections (not remote, not external absolute paths)
      const hasRemote = c.remote;
      const isExternalPath = path.isAbsolute(collectionPathFromYml);

      shouldDeleteFiles = !hasRemote && !isExternalPath;

      return false; // Remove from array
    }

    return true; // Keep in array
  });

  await writeWorkspaceConfig(workspacePath, config);

  return {
    removedCollection,
    shouldDeleteFiles,
    updatedConfig: config
  };
};

const getWorkspaceCollections = (workspacePath) => {
  const config = readWorkspaceConfig(workspacePath);
  const collections = config.collections || [];

  return collections.map((collection) => {
    if (collection.path && !path.isAbsolute(collection.path)) {
      return {
        ...collection,
        path: path.resolve(workspacePath, collection.path)
      };
    }
    return collection;
  });
};

module.exports = {
  makeRelativePath,
  normalizeCollectionEntry,
  validateWorkspacePath,
  validateWorkspaceDirectory,
  createWorkspaceConfig,
  readWorkspaceConfig,
  writeWorkspaceConfig,
  validateWorkspaceConfig,
  updateWorkspaceName,
  updateWorkspaceDocs,
  addCollectionToWorkspace,
  removeCollectionFromWorkspace,
  getWorkspaceCollections
};
