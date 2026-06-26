const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const { createCollectionJsonFromPathname } = require('@usebruno/cli/collection');

const collectionIdFromPath = (collectionPath) => {
  return crypto.createHash('sha1').update(path.resolve(collectionPath)).digest('hex').slice(0, 12);
};

const collectionNameFromConfig = (collectionPath) => {
  const brunoJsonPath = path.join(collectionPath, 'bruno.json');
  if (fs.existsSync(brunoJsonPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(brunoJsonPath, 'utf8'));
      if (config && config.name) return config.name;
    } catch (_) {}
  }
  return path.basename(collectionPath);
};

const listEnvironments = (collectionPath) => {
  const envDir = path.join(collectionPath, 'environments');
  if (!fs.existsSync(envDir)) return [];
  return fs
    .readdirSync(envDir)
    .filter((f) => f.endsWith('.bru') || f.endsWith('.yml'))
    .map((f) => f.replace(/\.(bru|yml)$/, ''));
};

const flattenRequests = (items, basePath, acc = []) => {
  for (const item of items || []) {
    if (item.type === 'folder') {
      flattenRequests(item.items, basePath, acc);
    } else {
      acc.push({
        name: item.name.replace(/\.(bru|yml)$/, ''),
        pathname: item.pathname,
        relativePath: path.relative(basePath, item.pathname),
        method: (item.request && item.request.method) || null,
        url: (item.request && item.request.url) || null
      });
    }
  }
  return acc;
};

class CollectionRegistry {
  constructor(entries) {
    this.collections = (entries || []).map((entry) => {
      const collectionPath = entry.path;
      return {
        id: collectionIdFromPath(collectionPath),
        name: entry.nameInWorkspace || collectionNameFromConfig(collectionPath),
        path: collectionPath,
        workspacePath: entry.workspacePath || null,
        workspaceName: entry.workspaceName || null
      };
    });
  }

  list() {
    return this.collections.map((c) => ({
      id: c.id,
      name: c.name,
      path: c.path,
      workspaceName: c.workspaceName,
      workspacePath: c.workspacePath,
      environments: listEnvironments(c.path)
    }));
  }

  resolve(collectionId) {
    return this.collections.find((c) => c.id === collectionId) || null;
  }

  listRequests(collectionId) {
    const collection = this.resolve(collectionId);
    if (!collection) return null;
    const { items } = createCollectionJsonFromPathname(collection.path);
    return flattenRequests(items, collection.path);
  }

  register(collectionPath, { workspacePath = null, workspaceName = null, nameInWorkspace = null } = {}) {
    const resolved = path.resolve(collectionPath);
    const id = collectionIdFromPath(resolved);
    const existing = this.collections.find((c) => c.id === id);
    if (existing) return existing;
    const entry = {
      id,
      name: nameInWorkspace || collectionNameFromConfig(resolved),
      path: resolved,
      workspacePath,
      workspaceName
    };
    this.collections.push(entry);
    return entry;
  }
}

module.exports = {
  CollectionRegistry,
  collectionIdFromPath
};
