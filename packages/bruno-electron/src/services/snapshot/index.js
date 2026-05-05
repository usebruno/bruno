const Store = require('electron-store');
const fs = require('fs');
const path = require('path');
const yup = require('yup');

const SNAPSHOT_VERSION = '0.0.1';
const ENV_FILE_EXTENSIONS = ['bru', 'yml', 'yaml'];

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const normalizeLookupKey = (pathname) => {
  if (typeof pathname !== 'string' || !pathname) {
    return null;
  }

  return path.normalize(pathname);
};

const buildWorkspaceCollectionLookupKey = (workspacePathname, collectionPathname) => {
  const normalizedCollectionPath = normalizeLookupKey(collectionPathname);
  if (!normalizedCollectionPath) {
    return null;
  }

  const normalizedWorkspacePath = normalizeLookupKey(workspacePathname || '');
  return `${normalizedWorkspacePath || ''}::${normalizedCollectionPath}`;
};

const tabSchema = yup.object({
  type: yup.string().required(),
  accessor: yup.string().oneOf(['pathname', 'pathname::exampleName', 'type']).required(),
  pathname: yup.string().nullable(),
  permanent: yup.boolean().required(),
  name: yup.string().optional(),
  exampleName: yup.string().optional(),
  request: yup.object({
    tab: yup.string(),
    width: yup.number().nullable(),
    height: yup.number().nullable()
  }).optional(),
  response: yup.object({
    tab: yup.string(),
    format: yup.string().nullable(),
    viewTab: yup.string().nullable()
  }).optional()
});

const activeTabSchema = yup.object({
  accessor: yup.string().oneOf(['pathname', 'pathname::exampleName', 'type']).required(),
  value: yup.string().required()
});

const collectionSchema = yup.object({
  pathname: yup.string().required(),
  workspacePathname: yup.string().optional().default(''),
  environment: yup.object({
    collection: yup.string(),
    global: yup.string()
  }).required(),
  environmentPath: yup.string().optional(),
  selectedEnvironment: yup.string().optional(),
  isOpen: yup.boolean().required(),
  isMounted: yup.boolean().required(),
  activeTab: activeTabSchema.nullable(),
  tabs: yup.array().of(tabSchema).required()
});

const workspaceSchema = yup.object({
  pathname: yup.string().required(),
  environment: yup.string().defined(),
  lastActiveCollectionPathname: yup.string().nullable(),
  sorting: yup.mixed().oneOf(['alphabetical', 'reverseAlphabetical', 'default']),
  collections: yup.array().of(yup.string()).optional()
});

const devToolsSchema = yup.object({
  open: yup.boolean().required(),
  activeTab: yup.string().defined(),
  tabs: yup.object().shape({
    console: yup.object().shape({}).optional(),
    network: yup.object().shape({}).optional(),
    performance: yup.object().shape({}).optional(),
    terminal: yup.object().shape({}).optional()
  })
});

const snapshotSchema = yup.object({
  version: yup.string().defined(),
  activeWorkspacePath: yup.string().nullable(),
  extras: yup.object({
    devTools: devToolsSchema.required()
  }).required(),
  workspaces: yup.array().of(workspaceSchema).required(),
  collections: yup.array().of(collectionSchema).required()
});

const emptySnapshot = {
  version: SNAPSHOT_VERSION,
  activeWorkspacePath: null,
  extras: {
    devTools: {
      open: false
    }
  },
  workspaces: [],
  collections: []
};

class SnapshotManager {
  constructor() {
    this.store = new Store({
      name: 'ui-state-snapshot',
      clearInvalidConfig: true,
      defaults: emptySnapshot
    });
  }

  // --- Reads ---

  getSnapshot() {
    return this._normalizeSnapshot(this.store.store);
  }

  getActiveWorkspacePath() {
    const snapshot = this._normalizeSnapshot(this.store.store);
    return snapshot.activeWorkspacePath;
  }

  getWorkspace(pathname) {
    const normalizedPath = normalizeLookupKey(pathname);
    if (!normalizedPath) {
      return null;
    }

    const { workspacesByPath } = this._buildLookupMaps(this.store.store);
    const workspace = workspacesByPath[normalizedPath];

    if (!workspace) {
      return null;
    }

    return {
      pathname: workspace.pathname,
      environment: workspace.environment,
      lastActiveCollectionPathname: workspace.lastActiveCollectionPathname,
      sorting: workspace.sorting,
      collections: workspace.collections
    };
  }

  getCollection(pathname) {
    const normalizedPath = normalizeLookupKey(pathname);
    if (!normalizedPath) {
      return null;
    }

    const { collectionsByPath } = this._buildLookupMaps(this.store.store);
    const collection = collectionsByPath[normalizedPath];

    if (!collection) {
      return null;
    }

    return {
      pathname: collection.pathname,
      workspacePathname: collection.workspacePathname,
      environment: collection.environment,
      environmentPath: collection.environmentPath,
      selectedEnvironment: collection.selectedEnvironment,
      isOpen: collection.isOpen,
      isMounted: collection.isMounted
    };
  }

  getTabs(collectionPathname, workspacePathname = null) {
    const normalizedPath = normalizeLookupKey(collectionPathname);
    if (!normalizedPath) {
      return null;
    }

    const { tabsByCollectionPath, tabsByWorkspaceAndCollectionPath } = this._buildLookupMaps(this.store.store);
    const workspaceCollectionKey = buildWorkspaceCollectionLookupKey(workspacePathname, collectionPathname);

    let tabsEntry = workspaceCollectionKey ? tabsByWorkspaceAndCollectionPath[workspaceCollectionKey] : null;
    if (!tabsEntry) {
      tabsEntry = tabsByCollectionPath[normalizedPath];
    }

    if (!tabsEntry) {
      return null;
    }

    return {
      activeTab: tabsEntry.activeTab,
      tabs: tabsEntry.tabs
    };
  }

  // --- Writes ---

  saveSnapshot(data) {
    try {
      const normalizedSnapshot = this._normalizeSnapshot(data);
      snapshotSchema.validateSync(normalizedSnapshot, { strict: false });
      this.store.store = normalizedSnapshot;
      return true;
    } catch (err) {
      console.error('Failed to save snapshot:', err.message);
      return false;
    }
  }

  setActiveWorkspacePath(pathname) {
    const snapshot = this._normalizeSnapshot(this.store.store);
    snapshot.activeWorkspacePath = typeof pathname === 'string' ? pathname : null;
    this.store.store = snapshot;
  }

  setWorkspace(pathname, data) {
    const normalizedPath = normalizeLookupKey(pathname);
    if (!normalizedPath) {
      return;
    }

    const snapshot = this._normalizeSnapshot(this.store.store);
    const normalizedEntry = this._normalizeWorkspaceEntry(pathname, data);
    const workspaceIndex = snapshot.workspaces.findIndex((workspace) => normalizeLookupKey(workspace.pathname) === normalizedPath);

    if (workspaceIndex === -1) {
      snapshot.workspaces.push(normalizedEntry);
    } else {
      snapshot.workspaces[workspaceIndex] = normalizedEntry;
    }

    this.store.store = snapshot;
  }

  setCollection(pathname, data) {
    const normalizedPath = normalizeLookupKey(pathname);
    if (!normalizedPath) {
      return;
    }

    const snapshot = this._normalizeSnapshot(this.store.store);
    const existingCollection = snapshot.collections.find((collection) => normalizeLookupKey(collection.pathname) === normalizedPath);

    const mergedCollection = {
      ...(existingCollection || {}),
      ...(isObject(data) ? data : {}),
      environment: {
        ...(isObject(existingCollection?.environment) ? existingCollection.environment : {}),
        ...(isObject(data?.environment) ? data.environment : {})
      },
      activeTab: data?.activeTab ?? existingCollection?.activeTab,
      tabs: data?.tabs ?? existingCollection?.tabs,
      environmentPath: data?.environmentPath ?? existingCollection?.environmentPath,
      selectedEnvironment: data?.selectedEnvironment ?? existingCollection?.selectedEnvironment
    };

    const normalizedCollection = this._normalizeCollectionEntry(pathname, mergedCollection);
    const collectionIndex = snapshot.collections.findIndex((collection) => normalizeLookupKey(collection.pathname) === normalizedPath);

    if (collectionIndex === -1) {
      snapshot.collections.push(normalizedCollection);
    } else {
      snapshot.collections[collectionIndex] = normalizedCollection;
    }

    this.store.store = snapshot;
  }

  setTabs(collectionPathname, data) {
    const normalizedPath = normalizeLookupKey(collectionPathname);
    if (!normalizedPath) {
      return;
    }

    const snapshot = this._normalizeSnapshot(this.store.store);
    const collectionIndex = snapshot.collections.findIndex((collection) => normalizeLookupKey(collection.pathname) === normalizedPath);
    const existingCollection = collectionIndex === -1 ? null : snapshot.collections[collectionIndex];

    const normalizedCollection = this._normalizeCollectionEntry(collectionPathname, {
      ...(existingCollection || {}),
      activeTab: data?.activeTab,
      tabs: data?.tabs
    });

    if (collectionIndex === -1) {
      snapshot.collections.push(normalizedCollection);
    } else {
      snapshot.collections[collectionIndex] = normalizedCollection;
    }

    this.store.store = snapshot;
  }

  removeWorkspace(pathname) {
    const normalizedPath = normalizeLookupKey(pathname);
    if (!normalizedPath) {
      return;
    }

    const snapshot = this._normalizeSnapshot(this.store.store);
    snapshot.workspaces = snapshot.workspaces.filter((workspace) => normalizeLookupKey(workspace.pathname) !== normalizedPath);
    this.store.store = snapshot;
  }

  removeCollection(pathname) {
    const normalizedPath = normalizeLookupKey(pathname);
    if (!normalizedPath) {
      return;
    }

    const snapshot = this._normalizeSnapshot(this.store.store);
    snapshot.collections = snapshot.collections.filter((collection) => normalizeLookupKey(collection.pathname) !== normalizedPath);
    this.store.store = snapshot;
  }

  async update({ type, data }) {
    switch (type) {
      case 'COLLECTION_ENVIRONMENT':
        await this.updateCollectionEnvironment(data || {});
        break;
      default:
        break;
    }
  }

  async updateCollectionEnvironment({ collectionPath, environmentPath, selectedEnvironment }) {
    if (!collectionPath) {
      return;
    }

    const existingCollection = this.getCollection(collectionPath) || {};
    const existingEnvironment = isObject(existingCollection.environment) ? existingCollection.environment : {};
    const incomingEnvironmentRef = environmentPath === undefined ? selectedEnvironment : environmentPath;
    const normalizedEnvironmentPath = await this._normalizeCollectionEnvironmentRefAsync(collectionPath, incomingEnvironmentRef);

    this.setCollection(collectionPath, {
      workspacePathname: typeof existingCollection.workspacePathname === 'string' ? existingCollection.workspacePathname : '',
      environment: {
        collection: normalizedEnvironmentPath,
        global: typeof existingEnvironment.global === 'string' ? existingEnvironment.global : ''
      },
      environmentPath: normalizedEnvironmentPath,
      selectedEnvironment: typeof selectedEnvironment === 'string' ? selectedEnvironment : '',
      isOpen: typeof existingCollection.isOpen === 'boolean' ? existingCollection.isOpen : false,
      isMounted: typeof existingCollection.isMounted === 'boolean' ? existingCollection.isMounted : false
    });
  }

  _normalizeSnapshot(snapshot = {}) {
    return {
      version: snapshot.version ?? SNAPSHOT_VERSION,
      activeWorkspacePath: typeof snapshot.activeWorkspacePath === 'string' ? snapshot.activeWorkspacePath : null,
      extras: {
        devTools: this._normalizeDevTools(snapshot?.extras?.devTools)
      },
      workspaces: this._normalizeWorkspaceList(snapshot.workspaces),
      collections: this._normalizeCollectionList(snapshot.collections, snapshot.tabs)
    };
  }

  _normalizeDevTools(devTools = {}) {
    const devToolKeys = [
      'console',
      'network',
      'performance',
      'terminal'
    ];

    const _snapshotEntry = {
      open: typeof devTools?.open === 'boolean' ? devTools.open : false,
      activeTab: devTools.activeTab,
      tabs: {}
    };

    devToolKeys.forEach((key) => {
      if (key in devTools) {
        _snapshotEntry.tabs[key] = devTools.tabs[key];
      }
    });

    return _snapshotEntry;
  }

  _normalizeWorkspaceList(workspaces) {
    const workspaceMap = new Map();

    if (Array.isArray(workspaces)) {
      workspaces.forEach((workspace) => {
        if (!isObject(workspace) || typeof workspace.pathname !== 'string') {
          return;
        }

        const normalizedWorkspace = this._normalizeWorkspaceEntry(workspace.pathname, workspace);
        const normalizedPath = normalizeLookupKey(workspace.pathname);

        if (normalizedPath) {
          workspaceMap.set(normalizedPath, normalizedWorkspace);
        }
      });
    } else if (isObject(workspaces)) {
      Object.entries(workspaces).forEach(([workspacePathname, workspace]) => {
        const normalizedWorkspace = this._normalizeWorkspaceEntry(workspacePathname, workspace);
        const normalizedPath = normalizeLookupKey(workspacePathname);

        if (normalizedPath) {
          workspaceMap.set(normalizedPath, normalizedWorkspace);
        }
      });
    }

    return [...workspaceMap.values()];
  }

  _normalizeWorkspaceEntry(pathname, workspace = {}) {
    const collections = this._normalizeCollectionPathList(workspace.collections);

    return {
      pathname,
      environment: typeof workspace.environment === 'string' ? workspace.environment : '',
      lastActiveCollectionPathname: typeof workspace.lastActiveCollectionPathname === 'string'
        ? workspace.lastActiveCollectionPathname
        : null,
      sorting: typeof workspace.sorting === 'string' ? workspace.sorting : 'default',
      collections
    };
  }

  _normalizeCollectionPathList(collectionPaths) {
    if (!Array.isArray(collectionPaths)) {
      return [];
    }

    const dedupedPaths = new Map();

    collectionPaths.forEach((collectionPath) => {
      const rawPath = typeof collectionPath === 'string'
        ? collectionPath
        : (isObject(collectionPath) && typeof collectionPath.path === 'string' ? collectionPath.path : null);

      if (!rawPath) {
        return;
      }

      const normalizedPath = normalizeLookupKey(rawPath);
      if (!normalizedPath || dedupedPaths.has(normalizedPath)) {
        return;
      }

      dedupedPaths.set(normalizedPath, rawPath);
    });

    return [...dedupedPaths.values()];
  }

  _normalizeCollectionList(collections, tabs) {
    const collectionMap = new Map();

    if (Array.isArray(collections)) {
      collections.forEach((collection) => {
        if (!isObject(collection) || typeof collection.pathname !== 'string') {
          return;
        }

        const normalizedCollection = this._normalizeCollectionEntry(collection.pathname, collection);
        const normalizedPath = normalizeLookupKey(collection.pathname);
        const workspaceCollectionKey = buildWorkspaceCollectionLookupKey(
          normalizedCollection.workspacePathname,
          normalizedCollection.pathname
        );

        if (workspaceCollectionKey) {
          collectionMap.set(workspaceCollectionKey, normalizedCollection);
        } else if (normalizedPath) {
          collectionMap.set(normalizedPath, normalizedCollection);
        }
      });

      return [...collectionMap.values()];
    }

    const collectionEntries = collections ?? [];
    const tabsEntries = tabs ?? [];
    const collectionPathnames = new Set([...collectionEntries, ...tabsEntries]);

    collectionPathnames.forEach((collectionPathname) => {
      const normalizedCollection = this._normalizeCollectionEntry(
        collectionPathname,
        collectionEntries[collectionPathname],
        tabsEntries[collectionPathname]
      );
      const normalizedPath = normalizeLookupKey(collectionPathname);

      if (normalizedPath) {
        collectionMap.set(normalizedPath, normalizedCollection);
      }
    });

    return [...collectionMap.values()];
  }

  _normalizeCollectionEntry(pathname, collection = {}, tabsEntry = {}) {
    const environment = isObject(collection.environment) ? collection.environment : {};
    const tabsEntryObject = isObject(tabsEntry) ? tabsEntry : {};
    const collectionEnvironmentRef = environment.collection ?? collection.environmentPath ?? collection.selectedEnvironment;
    const normalizedEnvironmentPath = this._normalizeCollectionEnvironmentRef(pathname, collectionEnvironmentRef);

    const tabs = Array.isArray(tabsEntryObject.tabs)
      ? tabsEntryObject.tabs.filter((tab) => isObject(tab))
      : (Array.isArray(collection.tabs) ? collection.tabs.filter((tab) => isObject(tab)) : []);

    return {
      pathname,
      workspacePathname: typeof collection.workspacePathname === 'string' ? collection.workspacePathname : '',
      environment: {
        collection: normalizedEnvironmentPath,
        global: typeof environment.global === 'string' ? environment.global : ''
      },
      environmentPath: normalizedEnvironmentPath,
      selectedEnvironment: typeof collection.selectedEnvironment === 'string' ? collection.selectedEnvironment : '',
      isOpen: typeof collection.isOpen === 'boolean' ? collection.isOpen : false,
      isMounted: typeof collection.isMounted === 'boolean' ? collection.isMounted : false,
      activeTab: this._normalizeActiveTab(tabsEntryObject.activeTab ?? collection.activeTab),
      tabs
    };
  }

  _normalizeCollectionEnvironmentRef(collectionPath, environmentRef) {
    if (typeof environmentRef !== 'string') {
      return '';
    }

    const trimmedRef = environmentRef.trim();
    if (!trimmedRef) {
      return '';
    }

    if (path.isAbsolute(trimmedRef)) {
      return path.normalize(trimmedRef);
    }

    return trimmedRef;
  }

  async _normalizeCollectionEnvironmentRefAsync(collectionPath, environmentRef) {
    if (typeof environmentRef !== 'string') {
      return '';
    }

    const trimmedRef = environmentRef.trim();
    if (!trimmedRef) {
      return '';
    }

    if (path.isAbsolute(trimmedRef)) {
      return path.normalize(trimmedRef);
    }

    const resolvedEnvironmentPath = await this._resolveEnvironmentPathByNameAsync(collectionPath, trimmedRef);
    if (resolvedEnvironmentPath) {
      return resolvedEnvironmentPath;
    }

    return trimmedRef;
  }

  async _resolveEnvironmentPathByNameAsync(collectionPath, environmentName) {
    if (typeof collectionPath !== 'string' || !collectionPath || typeof environmentName !== 'string' || !environmentName) {
      return null;
    }

    const environmentsDir = path.join(collectionPath, 'environments');
    try {
      await fs.promises.access(environmentsDir, fs.constants.F_OK);
    } catch {
      return null;
    }

    for (const extension of ENV_FILE_EXTENSIONS) {
      const environmentFilePath = path.join(environmentsDir, `${environmentName}.${extension}`);
      try {
        await fs.promises.access(environmentFilePath, fs.constants.F_OK);
        return path.normalize(environmentFilePath);
      } catch {
        // keep checking other supported extensions
      }
    }

    return null;
  }

  _normalizeActiveTab(activeTab) {
    if (!isObject(activeTab)) {
      return null;
    }

    if (!['pathname', 'pathname::exampleName', 'type'].includes(activeTab.accessor) || typeof activeTab.value !== 'string') {
      return null;
    }

    return {
      accessor: activeTab.accessor,
      value: activeTab.value
    };
  }

  _buildLookupMaps(snapshot = {}) {
    const normalizedSnapshot = this._normalizeSnapshot(snapshot);
    const workspacesByPath = {};
    const collectionsByPath = {};
    const tabsByCollectionPath = {};
    const tabsByWorkspaceAndCollectionPath = {};

    normalizedSnapshot.workspaces.forEach((workspace) => {
      const normalizedPath = normalizeLookupKey(workspace.pathname);
      if (!normalizedPath) {
        return;
      }

      workspacesByPath[normalizedPath] = workspace;
    });

    normalizedSnapshot.collections.forEach((collection) => {
      const normalizedPath = normalizeLookupKey(collection.pathname);
      if (!normalizedPath) {
        return;
      }

      collectionsByPath[normalizedPath] = collection;
      tabsByCollectionPath[normalizedPath] = {
        activeTab: collection.activeTab,
        tabs: collection.tabs
      };

      const workspaceCollectionKey = buildWorkspaceCollectionLookupKey(collection.workspacePathname, collection.pathname);
      if (workspaceCollectionKey) {
        tabsByWorkspaceAndCollectionPath[workspaceCollectionKey] = {
          activeTab: collection.activeTab,
          tabs: collection.tabs
        };
      }
    });

    return {
      workspacesByPath,
      collectionsByPath,
      tabsByCollectionPath,
      tabsByWorkspaceAndCollectionPath
    };
  }
}

module.exports = new SnapshotManager();
