const fs = require('fs');
const os = require('os');
const path = require('path');
const yaml = require('js-yaml');

const brunoPreferencesPath = () => {
  switch (process.platform) {
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Application Support', 'bruno', 'preferences.json');
    case 'win32':
      return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'bruno', 'preferences.json');
    default:
      return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'bruno', 'preferences.json');
  }
};

const isCollectionDir = (dir) => {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return false;
  return fs.existsSync(path.join(dir, 'bruno.json')) || fs.existsSync(path.join(dir, 'opencollection.yml'));
};

const isWorkspaceDir = (dir) => {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return false;
  return fs.existsSync(path.join(dir, 'workspace.yml'));
};

const collectionsFromWorkspace = (workspacePath) => {
  const workspaceYml = path.join(workspacePath, 'workspace.yml');
  if (!fs.existsSync(workspaceYml)) return [];

  let doc;
  try {
    doc = yaml.load(fs.readFileSync(workspaceYml, 'utf8'));
  } catch (_) {
    return [];
  }

  const entries = Array.isArray(doc && doc.collections) ? doc.collections : [];
  const results = [];
  for (const entry of entries) {
    if (!entry || typeof entry.path !== 'string') continue;
    const resolved = path.resolve(workspacePath, entry.path);
    if (isCollectionDir(resolved)) {
      results.push({
        path: resolved,
        workspacePath,
        workspaceName: doc && doc.info && doc.info.name ? doc.info.name : path.basename(workspacePath),
        nameInWorkspace: entry.name || null
      });
    }
  }
  return results;
};

const readPersistedSources = () => {
  const prefsPath = brunoPreferencesPath();
  if (!fs.existsSync(prefsPath)) {
    return { workspaces: [], collections: [], prefsPath, prefsExists: false };
  }

  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
  } catch (_) {
    return { workspaces: [], collections: [], prefsPath, prefsExists: true, parseError: true };
  }

  const workspaces = ((doc && doc.workspaces && doc.workspaces.lastOpenedWorkspaces) || []).filter(
    (p) => typeof p === 'string'
  );
  const collections = ((doc && doc.preferences && doc.preferences.lastOpenedCollections) || []).filter(
    (p) => typeof p === 'string'
  );

  return { workspaces, collections, prefsPath, prefsExists: true };
};

const CWD_MARKERS = ['workspace.yml', 'bruno.json', 'opencollection.yml'];

const findUpward = (startDir, markers = CWD_MARKERS) => {
  let dir = path.resolve(startDir);
  while (true) {
    for (const marker of markers) {
      const candidate = path.join(dir, marker);
      if (fs.existsSync(candidate)) {
        return { dir, marker };
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
};

const discoverFromCwd = (cwd) => {
  const hit = findUpward(cwd);
  if (!hit) return { entries: [], hit: null };

  if (hit.marker === 'workspace.yml') {
    return { entries: collectionsFromWorkspace(hit.dir), hit };
  }
  // bruno.json or opencollection.yml → single collection
  return {
    entries: [{
      path: hit.dir,
      workspacePath: null,
      workspaceName: null,
      nameInWorkspace: null
    }],
    hit
  };
};

const dedupeByPath = (entries) => {
  const seen = new Set();
  const out = [];
  for (const entry of entries) {
    const key = path.resolve(entry.path);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...entry, path: key });
  }
  return out;
};

const expandSources = ({ collections = [], workspaces = [] }) => {
  const out = [];

  for (const c of collections) {
    if (isCollectionDir(c)) {
      out.push({ path: c, workspacePath: null, workspaceName: null, nameInWorkspace: null });
    }
  }

  for (const w of workspaces) {
    if (!isWorkspaceDir(w)) continue;
    for (const member of collectionsFromWorkspace(w)) {
      out.push(member);
    }
  }

  return dedupeByPath(out);
};

const autoDiscoverFromBruno = () => {
  const persisted = readPersistedSources();
  return {
    ...expandSources({ collections: persisted.collections, workspaces: persisted.workspaces }).reduce(
      (acc, entry) => {
        acc.entries.push(entry);
        return acc;
      },
      { entries: [] }
    ),
    diagnostics: {
      prefsPath: persisted.prefsPath,
      prefsExists: persisted.prefsExists,
      parseError: !!persisted.parseError,
      persistedWorkspaceCount: persisted.workspaces.length,
      persistedCollectionCount: persisted.collections.length
    }
  };
};

module.exports = {
  brunoPreferencesPath,
  isCollectionDir,
  isWorkspaceDir,
  collectionsFromWorkspace,
  readPersistedSources,
  expandSources,
  autoDiscoverFromBruno,
  findUpward,
  discoverFromCwd
};
