const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { writeFile, validateName } = require('./filesystem');

const WORKSPACE_TYPE = 'workspace';
const OPENCOLLECTION_VERSION = '1.0.0';

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
  yamlLines.push(`opencollection: ${config.opencollection || OPENCOLLECTION_VERSION}`);
  yamlLines.push('info:');
  yamlLines.push(`  name: ${config.info?.name || config.name}`);
  yamlLines.push(`  type: ${config.info?.type || config.type || WORKSPACE_TYPE}`);
  yamlLines.push('');

  const collections = config.collections || [];
  if (collections.length > 0) {
    yamlLines.push('collections:');
    for (const collection of collections) {
      yamlLines.push(`  - name: ${collection.name}`);
      yamlLines.push(`    path: ${collection.path}`);
      if (collection.remote) {
        yamlLines.push(`    remote: ${collection.remote}`);
      }
      if (collection.type) {
        yamlLines.push(`    type: ${collection.type}`);
      }
    }
  } else {
    yamlLines.push('collections:');
  }
  yamlLines.push('');

  const specs = config.specs || [];
  if (specs.length > 0) {
    yamlLines.push('specs:');
    for (const spec of specs) {
      yamlLines.push(`  - name: ${spec.name}`);
      yamlLines.push(`    path: ${spec.path}`);
    }
  } else {
    yamlLines.push('specs:');
  }
  yamlLines.push('');

  const docs = config.docs || '';
  if (docs) {
    const escapedDocs = docs.includes('\n')
      ? `|-\n  ${docs.split('\n').join('\n  ')}`
      : `'${docs.replace(/'/g, '\'\'')}'`;
    yamlLines.push(`docs: ${escapedDocs}`);
  } else {
    yamlLines.push('docs: \'\'');
  }

  if (config.activeEnvironmentUid) {
    yamlLines.push('');
    yamlLines.push(`activeEnvironmentUid: ${config.activeEnvironmentUid}`);
  }

  yamlLines.push('');

  return yamlLines.join('\n');
};

const writeWorkspaceConfig = async (workspacePath, config) => {
  const yamlContent = generateYamlContent(config);
  await writeFile(path.join(workspacePath, 'workspace.yml'), yamlContent);
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
  const config = readWorkspaceConfig(workspacePath);
  config.name = newName;
  if (config.info) {
    config.info.name = newName;
  }
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

  const normalizedCollection = {
    name: collection.name,
    path: collection.path
  };

  if (collection.remote) {
    normalizedCollection.remote = collection.remote;
  }

  const existingIndex = config.collections.findIndex((c) => c.path === normalizedCollection.path);

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

    const absoluteCollectionPath = path.isAbsolute(collectionPathFromYml)
      ? collectionPathFromYml
      : path.resolve(workspacePath, collectionPathFromYml);

    if (path.normalize(absoluteCollectionPath) === path.normalize(collectionPath)) {
      removedCollection = c;

      const hasRemote = c.remote;
      const isExternalPath = path.isAbsolute(collectionPathFromYml);

      shouldDeleteFiles = !hasRemote && !isExternalPath;

      return false;
    }

    return true;
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

const getWorkspaceApiSpecs = (workspacePath) => {
  const config = readWorkspaceConfig(workspacePath);
  const specs = config.specs || [];

  return specs.map((spec) => {
    if (spec.path && !path.isAbsolute(spec.path)) {
      return {
        ...spec,
        path: path.join(workspacePath, spec.path)
      };
    }
    return spec;
  });
};

const addApiSpecToWorkspace = async (workspacePath, apiSpec) => {
  const config = readWorkspaceConfig(workspacePath);

  if (!config.specs) {
    config.specs = [];
  }

  const normalizedSpec = {
    name: apiSpec.name,
    path: makeRelativePath(workspacePath, apiSpec.path)
  };

  const existingIndex = config.specs.findIndex(
    (a) => a.name === normalizedSpec.name || a.path === normalizedSpec.path
  );

  if (existingIndex >= 0) {
    config.specs[existingIndex] = normalizedSpec;
  } else {
    config.specs.push(normalizedSpec);
  }

  await writeWorkspaceConfig(workspacePath, config);
  return config.specs;
};

const removeApiSpecFromWorkspace = async (workspacePath, apiSpecPath) => {
  const config = readWorkspaceConfig(workspacePath);

  if (!config.specs) {
    return { removedApiSpec: null, updatedConfig: config };
  }

  let removedApiSpec = null;

  config.specs = config.specs.filter((a) => {
    const specPathFromYml = a.path;
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

  await writeWorkspaceConfig(workspacePath, config);

  return {
    removedApiSpec,
    updatedConfig: config
  };
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
  getWorkspaceCollections,
  getWorkspaceApiSpecs,
  addApiSpecToWorkspace,
  removeApiSpecFromWorkspace,
  generateYamlContent
};
