const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { writeFile, validateName, isValidCollectionDirectory } = require('./filesystem');
const { generateUidBasedOnHash } = require('./common');
const { withLock, getWorkspaceLockKey } = require('./workspace-lock');

// Normalize Windows backslash paths to forward slashes for cross-platform compatibility.
const posixifyPath = (p) => (p ? p.replace(/\\/g, '/') : p);

const WORKSPACE_TYPE = 'workspace';
const OPENCOLLECTION_VERSION = '1.0.0';

const quoteYamlValue = (value) => {
  if (typeof value !== 'string') {
    return `"${String(value)}"`;
  }

  if (value === '') {
    return '""';
  }

  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
};

const writeWorkspaceFileAtomic = async (workspacePath, content) => {
  const workspaceFilePath = path.join(workspacePath, 'workspace.yml');
  await writeFile(workspaceFilePath, content);

  // Previous atomic write implementation commented out due to permission issues on Linux
  // when temp directory is on a different filesystem (cross-device link error)

  // const tempFilePath = path.join(os.tmpdir(), `workspace-${Date.now()}-${crypto.randomBytes(16).toString('hex')}.yml`);

  // try {
  //   await writeFile(tempFilePath, content);

  //   if (fs.existsSync(workspaceFilePath)) {
  //     fs.unlinkSync(workspaceFilePath);
  //   }

  //   fs.renameSync(tempFilePath, workspaceFilePath);
  // } catch (error) {
  //   if (fs.existsSync(tempFilePath)) {
  //     try {
  //       fs.unlinkSync(tempFilePath);
  //     } catch (_) {}
  //   }
  //   throw error;
  // }
};

const isValidCollectionEntry = (collection) => {
  if (!collection || typeof collection !== 'object') {
    return false;
  }

  if (!collection.name || typeof collection.name !== 'string' || collection.name.trim() === '') {
    return false;
  }

  if (!collection.path || typeof collection.path !== 'string' || collection.path.trim() === '') {
    return false;
  }

  return true;
};

const isValidSpecEntry = (spec) => {
  if (!spec || typeof spec !== 'object') {
    return false;
  }

  if (!spec.name || typeof spec.name !== 'string' || spec.name.trim() === '') {
    return false;
  }

  if (!spec.path || typeof spec.path !== 'string' || spec.path.trim() === '') {
    return false;
  }

  return true;
};

const sanitizeCollections = (collections) => {
  if (!Array.isArray(collections)) {
    return [];
  }

  return collections.filter((collection) => {
    if (!isValidCollectionEntry(collection)) {
      console.error('Skipping invalid collection entry:', collection);
      return false;
    }
    return true;
  }).map((collection) => {
    const sanitized = {
      name: collection.name.trim(),
      path: posixifyPath(collection.path.trim())
    };

    if (collection.remote && typeof collection.remote === 'string') {
      sanitized.remote = collection.remote.trim();
    }

    return sanitized;
  });
};

const sanitizeSpecs = (specs) => {
  if (!Array.isArray(specs)) {
    return [];
  }

  return specs.filter((spec) => {
    if (!isValidSpecEntry(spec)) {
      console.error('Skipping invalid spec entry:', spec);
      return false;
    }
    return true;
  }).map((spec) => ({
    name: spec.name.trim(),
    path: posixifyPath(spec.path.trim())
  }));
};

const makeRelativePath = (workspacePath, absolutePath) => {
  if (!path.isAbsolute(absolutePath)) {
    return posixifyPath(absolutePath);
  }

  try {
    const relativePath = path.relative(workspacePath, absolutePath);
    if (relativePath.startsWith('..') && relativePath.split(path.sep).filter((s) => s === '..').length > 2) {
      return posixifyPath(absolutePath);
    }
    return posixifyPath(relativePath);
  } catch (error) {
    return posixifyPath(absolutePath);
  }
};

const getNormalizedAbsoluteCollectionPath = (workspacePath, collection) => {
  if (!collection?.path) return null;
  const resolved = path.isAbsolute(collection.path) ? collection.path : path.resolve(workspacePath, collection.path);
  return path.normalize(resolved);
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
  opencollection: OPENCOLLECTION_VERSION,
  info: {
    name: workspaceName,
    type: WORKSPACE_TYPE
  },
  collections: [],
  specs: [],
  docs: ''
});

const normalizeWorkspaceConfig = (config) => {
  return {
    ...config,
    name: config.info?.name,
    type: config.info?.type,
    collections: config.collections || [],
    apiSpecs: config.specs || []
  };
};

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

  return normalizeWorkspaceConfig(workspaceConfig);
};

const generateYamlContent = (config) => {
  const yamlLines = [];
  const workspaceName = config.info?.name || config.name || 'Untitled Workspace';
  const workspaceType = config.info?.type || config.type || WORKSPACE_TYPE;

  yamlLines.push(`opencollection: ${config.opencollection || OPENCOLLECTION_VERSION}`);
  yamlLines.push('info:');
  yamlLines.push(`  name: ${quoteYamlValue(workspaceName)}`);
  yamlLines.push(`  type: ${workspaceType}`);
  yamlLines.push('');

  const collections = sanitizeCollections(config.collections);
  if (collections.length > 0) {
    yamlLines.push('collections:');
    for (const collection of collections) {
      yamlLines.push(`  - name: ${quoteYamlValue(collection.name)}`);
      yamlLines.push(`    path: ${quoteYamlValue(collection.path)}`);
      if (collection.remote) {
        yamlLines.push(`    remote: ${quoteYamlValue(collection.remote)}`);
      }
    }
  } else {
    yamlLines.push('collections:');
  }
  yamlLines.push('');

  const specs = sanitizeSpecs(config.specs);
  if (specs.length > 0) {
    yamlLines.push('specs:');
    for (const spec of specs) {
      yamlLines.push(`  - name: ${quoteYamlValue(spec.name)}`);
      yamlLines.push(`    path: ${quoteYamlValue(spec.path)}`);
    }
  } else {
    yamlLines.push('specs:');
  }
  yamlLines.push('');

  const docs = config.docs || '';
  if (docs) {
    const escapedDocs = docs.includes('\n')
      ? `|-\n  ${docs.split('\n').join('\n  ')}`
      : quoteYamlValue(docs);
    yamlLines.push(`docs: ${escapedDocs}`);
  } else {
    yamlLines.push('docs: \'\'');
  }

  yamlLines.push('');

  return yamlLines.join('\n');
};

const writeWorkspaceConfig = async (workspacePath, config) => {
  return withLock(getWorkspaceLockKey(workspacePath), async () => {
    const yamlContent = generateYamlContent(config);
    await writeWorkspaceFileAtomic(workspacePath, yamlContent);
  });
};

const validateWorkspaceConfig = (config) => {
  if (!config || typeof config !== 'object') {
    throw new Error('Workspace configuration must be an object');
  }

  const type = config.info?.type || config.type;
  if (type !== WORKSPACE_TYPE) {
    throw new Error('Invalid workspace: not a bruno workspace');
  }

  const name = config.info?.name || config.name;
  if (!name || typeof name !== 'string') {
    throw new Error('Workspace must have a valid name');
  }

  return true;
};

const updateWorkspaceName = async (workspacePath, newName) => {
  return withLock(getWorkspaceLockKey(workspacePath), async () => {
    const config = readWorkspaceConfig(workspacePath);
    config.name = newName;
    if (config.info) {
      config.info.name = newName;
    }
    const yamlContent = generateYamlContent(config);
    await writeWorkspaceFileAtomic(workspacePath, yamlContent);
    return config;
  });
};

const updateWorkspaceDocs = async (workspacePath, docs) => {
  return withLock(getWorkspaceLockKey(workspacePath), async () => {
    const config = readWorkspaceConfig(workspacePath);
    config.docs = docs;
    const yamlContent = generateYamlContent(config);
    await writeWorkspaceFileAtomic(workspacePath, yamlContent);
    return docs;
  });
};

const addCollectionToWorkspace = async (workspacePath, collection) => {
  if (!isValidCollectionEntry(collection)) {
    throw new Error('Invalid collection: name and path are required');
  }

  return withLock(getWorkspaceLockKey(workspacePath), async () => {
    const config = readWorkspaceConfig(workspacePath);

    if (!config.collections) {
      config.collections = [];
    }

    const normalizedCollection = {
      name: collection.name.trim(),
      path: posixifyPath(collection.path.trim())
    };

    if (collection.remote && typeof collection.remote === 'string') {
      normalizedCollection.remote = collection.remote.trim();
    }

    const existingIndex = config.collections.findIndex((c) => c.path && posixifyPath(c.path) === normalizedCollection.path);

    if (existingIndex >= 0) {
      config.collections[existingIndex] = normalizedCollection;
    } else {
      config.collections.push(normalizedCollection);
    }

    const yamlContent = generateYamlContent(config);
    await writeWorkspaceFileAtomic(workspacePath, yamlContent);
    return config.collections;
  });
};

const getCollectionGitignoreEntry = (workspacePath, collectionPath) => {
  const absolute = path.isAbsolute(collectionPath)
    ? collectionPath
    : path.resolve(workspacePath, collectionPath);
  const relative = path.relative(workspacePath, absolute);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return posixifyPath(relative).replace(/\/+$/, '') + '/';
};

const addCollectionToWorkspaceGitignore = async (workspacePath, collectionPath) => {
  const entry = getCollectionGitignoreEntry(workspacePath, collectionPath);
  if (!entry) return;

  const gitignorePath = path.join(workspacePath, '.gitignore');
  const existing = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';

  if (existing.split('\n').some((line) => line.trim() === entry)) return;

  const prefix = existing.length === 0 || existing.endsWith('\n') ? existing : existing + '\n';
  await writeFile(gitignorePath, `${prefix}${entry}\n`);
};

const removeCollectionFromWorkspaceGitignore = async (workspacePath, collectionPath) => {
  const entry = getCollectionGitignoreEntry(workspacePath, collectionPath);
  if (!entry) return;

  const gitignorePath = path.join(workspacePath, '.gitignore');
  if (!fs.existsSync(gitignorePath)) return;

  const lines = fs.readFileSync(gitignorePath, 'utf8').split('\n');
  const filtered = lines.filter((line) => line.trim() !== entry);
  if (filtered.length === lines.length) return;

  await writeFile(gitignorePath, filtered.join('\n'));
};

const setCollectionGitRemote = async (workspacePath, collectionPath, remoteUrl) => {
  if (typeof remoteUrl !== 'string' || remoteUrl.trim() === '') {
    throw new Error('A non-empty Git remote URL is required');
  }
  const trimmedUrl = remoteUrl.trim();

  return withLock(getWorkspaceLockKey(workspacePath), async () => {
    const config = readWorkspaceConfig(workspacePath);
    const target = path.normalize(collectionPath);
    let matched = false;

    config.collections = (config.collections || []).map((c) => {
      if (getNormalizedAbsoluteCollectionPath(workspacePath, c) !== target) return c;
      matched = true;
      return { ...c, remote: trimmedUrl };
    });

    if (!matched) {
      throw new Error('Collection not found in workspace');
    }

    await writeWorkspaceFileAtomic(workspacePath, generateYamlContent(config));
    await addCollectionToWorkspaceGitignore(workspacePath, collectionPath);
    return config;
  });
};

const clearCollectionGitRemote = async (workspacePath, collectionPath) => {
  return withLock(getWorkspaceLockKey(workspacePath), async () => {
    const config = readWorkspaceConfig(workspacePath);
    const target = path.normalize(collectionPath);
    let matched = false;

    config.collections = (config.collections || []).map((c) => {
      if (getNormalizedAbsoluteCollectionPath(workspacePath, c) !== target) return c;
      matched = true;
      const updated = { ...c };
      delete updated.remote;
      return updated;
    });

    if (!matched) {
      throw new Error('Collection not found in workspace');
    }

    await writeWorkspaceFileAtomic(workspacePath, generateYamlContent(config));
    await removeCollectionFromWorkspaceGitignore(workspacePath, collectionPath);
    return config;
  });
};

const removeCollectionFromWorkspace = async (workspacePath, collectionPath) => {
  return withLock(getWorkspaceLockKey(workspacePath), async () => {
    const config = readWorkspaceConfig(workspacePath);

    let removedCollection = null;

    config.collections = (config.collections || []).filter((c) => {
      const collectionPathFromYml = c.path ? posixifyPath(c.path) : c.path;

      if (!collectionPathFromYml) {
        return true;
      }

      const absoluteCollectionPath = path.isAbsolute(collectionPathFromYml)
        ? collectionPathFromYml
        : path.resolve(workspacePath, collectionPathFromYml);

      if (path.normalize(absoluteCollectionPath) === path.normalize(collectionPath)) {
        removedCollection = c;
        return false;
      }

      return true;
    });

    const yamlContent = generateYamlContent(config);
    await writeWorkspaceFileAtomic(workspacePath, yamlContent);

    return {
      removedCollection,
      updatedConfig: config
    };
  });
};

/**
 * Reorders the collections array in the workspace's workspace.yml to match the given path list.
 * Entries not in the list are appended at the end.
 * @param {string} workspacePath - Absolute path to the workspace directory
 * @param {string[]} collectionPaths - Absolute collection pathnames in the desired order
 */
const reorderWorkspaceCollections = async (workspacePath, collectionPaths) => {
  if (!Array.isArray(collectionPaths)) {
    throw new Error('collectionPaths must be an array');
  }

  return withLock(getWorkspaceLockKey(workspacePath), async () => {
    const config = readWorkspaceConfig(workspacePath);
    const existing = config.collections || [];

    const inNewOrder = [];
    const matched = new Set();

    for (const absolutePath of collectionPaths) {
      const targetPath = posixifyPath(path.normalize(absolutePath));
      const entry = existing.find(
        (c) => posixifyPath(getNormalizedAbsoluteCollectionPath(workspacePath, c)) === targetPath
      );
      if (entry && !matched.has(entry)) {
        inNewOrder.push(entry);
        matched.add(entry);
      }
    }

    const notInList = existing.filter((c) => !matched.has(c));
    config.collections = [...inNewOrder, ...notInList];

    const yamlContent = generateYamlContent(config);
    await writeWorkspaceFileAtomic(workspacePath, yamlContent);
  });
};

const resolveAndFilterWorkspaceCollections = (workspacePath, rawCollections) => {
  const seenPaths = new Set();

  return (rawCollections || [])
    .map((collection) => {
      if (!collection.path) return collection;
      const collectionPath = posixifyPath(collection.path);
      const absolute = path.isAbsolute(collectionPath)
        ? collectionPath
        : path.resolve(workspacePath, collectionPath);
      return { ...collection, path: absolute };
    })
    .map((collection) => {
      if (!collection.path) return null;
      const normalizedPath = path.normalize(collection.path);
      if (seenPaths.has(normalizedPath)) return null;
      seenPaths.add(normalizedPath);

      if (isValidCollectionDirectory(collection.path)) return collection;
      if (collection.remote) return { ...collection, notFoundLocally: true };
      return null;
    })
    .filter(Boolean);
};

const getWorkspaceCollections = (workspacePath) => {
  const config = readWorkspaceConfig(workspacePath);
  return resolveAndFilterWorkspaceCollections(workspacePath, config.collections);
};

const getWorkspaceApiSpecs = (workspacePath) => {
  const config = readWorkspaceConfig(workspacePath);
  const specs = config.specs || [];

  return specs.map((spec) => {
    const specPath = spec.path ? posixifyPath(spec.path) : spec.path;
    if (specPath && !path.isAbsolute(specPath)) {
      return {
        ...spec,
        path: path.join(workspacePath, specPath)
      };
    }
    return { ...spec, path: specPath };
  });
};

const addApiSpecToWorkspace = async (workspacePath, apiSpec) => {
  if (!isValidSpecEntry(apiSpec)) {
    throw new Error('Invalid API spec: name and path are required');
  }

  return withLock(getWorkspaceLockKey(workspacePath), async () => {
    const config = readWorkspaceConfig(workspacePath);

    if (!config.specs) {
      config.specs = [];
    }

    const normalizedSpec = {
      name: apiSpec.name.trim(),
      path: makeRelativePath(workspacePath, apiSpec.path).trim()
    };

    const existingIndex = config.specs.findIndex(
      (a) => a.name === normalizedSpec.name || (a.path && posixifyPath(a.path) === normalizedSpec.path)
    );

    if (existingIndex >= 0) {
      config.specs[existingIndex] = normalizedSpec;
    } else {
      config.specs.push(normalizedSpec);
    }

    const yamlContent = generateYamlContent(config);
    await writeWorkspaceFileAtomic(workspacePath, yamlContent);
    return config.specs;
  });
};

const removeApiSpecFromWorkspace = async (workspacePath, apiSpecPath) => {
  return withLock(getWorkspaceLockKey(workspacePath), async () => {
    const config = readWorkspaceConfig(workspacePath);

    if (!config.specs) {
      return { removedApiSpec: null, updatedConfig: config };
    }

    let removedApiSpec = null;

    config.specs = config.specs.filter((a) => {
      const specPathFromYml = a.path ? posixifyPath(a.path) : a.path;
      if (!specPathFromYml) return true;

      const absoluteSpecPath = path.isAbsolute(specPathFromYml)
        ? specPathFromYml
        : path.resolve(workspacePath, specPathFromYml);

      if (path.normalize(absoluteSpecPath) === path.normalize(apiSpecPath)) {
        removedApiSpec = a;
        return false;
      }

      return true;
    });

    const yamlContent = generateYamlContent(config);
    await writeWorkspaceFileAtomic(workspacePath, yamlContent);

    return {
      removedApiSpec,
      updatedConfig: config
    };
  });
};

const getWorkspaceUid = (workspacePath) => {
  const { defaultWorkspaceManager } = require('../store/default-workspace');
  const defaultWorkspacePath = defaultWorkspaceManager.getDefaultWorkspacePath();
  if (defaultWorkspacePath && path.normalize(workspacePath) === path.normalize(defaultWorkspacePath)) {
    return defaultWorkspaceManager.getDefaultWorkspaceUid();
  }
  return generateUidBasedOnHash(workspacePath);
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
  setCollectionGitRemote,
  clearCollectionGitRemote,
  reorderWorkspaceCollections,
  getWorkspaceCollections,
  resolveAndFilterWorkspaceCollections,
  getWorkspaceApiSpecs,
  addApiSpecToWorkspace,
  removeApiSpecFromWorkspace,
  generateYamlContent,
  getWorkspaceUid,
  writeWorkspaceFileAtomic,
  isValidCollectionEntry,
  isValidSpecEntry
};
