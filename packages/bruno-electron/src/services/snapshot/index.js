const Store = require('electron-store');
const fs = require('fs');
const path = require('path');
const yup = require('yup');

const ENV_FILE_EXTENSIONS = ['bru', 'yml', 'yaml'];

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

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

const tabsEntrySchema = yup.object({
  activeTab: activeTabSchema.nullable(),
  tabs: yup.array().of(tabSchema).required()
});

const collectionSchema = yup.object({
  workspacePathname: yup.string().required(),
  environment: yup.object({
    collection: yup.string(),
    global: yup.string()
  }).required(),
  isOpen: yup.boolean().required(),
  isMounted: yup.boolean().required()
});

const workspaceSchema = yup.object({
  lastActiveCollectionPathname: yup.string().nullable(),
  sorting: yup.string().defined(),
  collectionPathnames: yup.array().of(yup.string()).required()
});

const devToolsSchema = yup.object({
  open: yup.boolean().required(),
  height: yup.number().required(),
  tab: yup.string().required(),
  tabData: yup.object()
});

const snapshotSchema = yup.object({
  activeWorkspacePath: yup.string().nullable(),
  extras: yup.object({
    devTools: devToolsSchema.required()
  }).required(),
  workspaces: yup.lazy((value) =>
    yup.object(
      Object.keys(value || {}).reduce((acc, key) => {
        acc[key] = workspaceSchema;
        return acc;
      }, {})
    )
  ),
  collections: yup.lazy((value) =>
    yup.object(
      Object.keys(value || {}).reduce((acc, key) => {
        acc[key] = collectionSchema;
        return acc;
      }, {})
    )
  ),
  tabs: yup.lazy((value) =>
    yup.object(
      Object.keys(value || {}).reduce((acc, key) => {
        acc[key] = tabsEntrySchema;
        return acc;
      }, {})
    )
  )
});

const emptySnapshot = {
  activeWorkspacePath: null,
  extras: {
    devTools: {
      open: false,
      height: 300,
      tab: 'console',
      tabData: {}
    }
  },
  workspaces: {},
  collections: {},
  tabs: {}
};

class SnapshotManager {
  constructor() {
    this.store = new Store({
      name: 'ui-state-snapshot',
      clearInvalidConfig: true,
      defaults: emptySnapshot
    });

    this._migrateLegacySnapshot();
  }

  // --- Reads ---

  getSnapshot() {
    return this.store.store;
  }

  getActiveWorkspacePath() {
    return this.store.get('activeWorkspacePath', null);
  }

  getWorkspace(pathname) {
    return this._getByPathWithNormalizedFallback('workspaces', pathname);
  }

  getCollection(pathname) {
    return this._getByPathWithNormalizedFallback('collections', pathname);
  }

  getTabs(collectionPathname) {
    return this._getByPathWithNormalizedFallback('tabs', collectionPathname);
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
    this.store.set('activeWorkspacePath', pathname);
  }

  setWorkspace(pathname, data) {
    if (typeof pathname !== 'string' || !pathname) {
      return;
    }

    this.store.set(`workspaces.${this._escapeKey(pathname)}`, data);
  }

  setCollection(pathname, data) {
    if (typeof pathname !== 'string' || !pathname) {
      return;
    }

    this.store.set(`collections.${this._escapeKey(pathname)}`, data);
  }

  setTabs(collectionPathname, data) {
    if (typeof collectionPathname !== 'string' || !collectionPathname) {
      return;
    }

    this.store.set(`tabs.${this._escapeKey(collectionPathname)}`, data);
  }

  removeWorkspace(pathname) {
    this._deleteByPathWithNormalizedFallback('workspaces', pathname);
  }

  removeCollection(pathname) {
    this._deleteByPathWithNormalizedFallback('collections', pathname);
    this._deleteByPathWithNormalizedFallback('tabs', pathname);
  }

  update({ type, data }) {
    switch (type) {
      case 'COLLECTION_ENVIRONMENT':
        this.updateCollectionEnvironment(data || {});
        break;
      default:
        break;
    }
  }

  updateCollectionEnvironment({ collectionPath, environmentPath, selectedEnvironment }) {
    if (!collectionPath) {
      return;
    }

    const existingCollection = this.getCollection(collectionPath) || {};
    const existingEnvironment = isObject(existingCollection.environment) ? existingCollection.environment : {};
    const incomingEnvironmentRef = environmentPath === undefined ? selectedEnvironment : environmentPath;
    const normalizedEnvironmentPath = this._normalizeCollectionEnvironmentRef(collectionPath, incomingEnvironmentRef);

    this.setCollection(collectionPath, {
      workspacePathname: typeof existingCollection.workspacePathname === 'string' ? existingCollection.workspacePathname : '',
      environment: {
        collection: normalizedEnvironmentPath,
        global: typeof existingEnvironment.global === 'string' ? existingEnvironment.global : ''
      },
      isOpen: typeof existingCollection.isOpen === 'boolean' ? existingCollection.isOpen : false,
      isMounted: typeof existingCollection.isMounted === 'boolean' ? existingCollection.isMounted : false
    });
  }

  _migrateLegacySnapshot() {
    try {
      const currentSnapshot = this.store.store || {};
      const normalizedSnapshot = this._normalizeSnapshot(currentSnapshot);

      if (JSON.stringify(currentSnapshot) !== JSON.stringify(normalizedSnapshot)) {
        this.store.store = normalizedSnapshot;
      }
    } catch (error) {
      console.error('Failed to migrate snapshot:', error.message);
    }
  }

  _normalizeSnapshot(snapshot = {}) {
    return {
      activeWorkspacePath: typeof snapshot.activeWorkspacePath === 'string' ? snapshot.activeWorkspacePath : null,
      extras: {
        devTools: this._normalizeDevTools(snapshot?.extras?.devTools)
      },
      workspaces: this._normalizeWorkspaceMap(snapshot.workspaces),
      collections: this._normalizeCollectionMap(snapshot.collections),
      tabs: this._normalizeTabsMap(snapshot.tabs)
    };
  }

  _normalizeDevTools(devTools = {}) {
    return {
      open: typeof devTools?.open === 'boolean' ? devTools.open : false,
      height: typeof devTools?.height === 'number' ? devTools.height : 300,
      tab: typeof devTools?.tab === 'string' ? devTools.tab : 'console',
      tabData: isObject(devTools?.tabData) ? devTools.tabData : {}
    };
  }

  _normalizeWorkspaceMap(workspaces) {
    if (!isObject(workspaces)) {
      return {};
    }

    return Object.entries(workspaces).reduce((acc, [workspacePath, workspace]) => {
      if (!workspacePath || !isObject(workspace)) {
        return acc;
      }

      const collectionPathnames = Array.isArray(workspace.collectionPathnames)
        ? workspace.collectionPathnames.filter((collectionPath) => typeof collectionPath === 'string')
        : [];

      acc[workspacePath] = {
        lastActiveCollectionPathname: typeof workspace.lastActiveCollectionPathname === 'string'
          ? workspace.lastActiveCollectionPathname
          : null,
        sorting: typeof workspace.sorting === 'string' ? workspace.sorting : 'az',
        collectionPathnames
      };

      return acc;
    }, {});
  }

  _normalizeCollectionMap(collections) {
    if (Array.isArray(collections)) {
      return this._migrateLegacyCollectionsArray(collections);
    }

    if (!isObject(collections)) {
      return {};
    }

    return Object.entries(collections).reduce((acc, [collectionPath, collection]) => {
      if (!collectionPath || !isObject(collection)) {
        return acc;
      }

      acc[collectionPath] = this._normalizeCollectionEntry(collectionPath, collection);
      return acc;
    }, {});
  }

  _migrateLegacyCollectionsArray(collectionsArray = []) {
    return collectionsArray.reduce((acc, collection) => {
      if (!isObject(collection) || typeof collection.pathname !== 'string') {
        return acc;
      }

      const collectionPath = collection.pathname;
      const environmentRef = collection.environmentPath ?? collection.selectedEnvironment;

      acc[collectionPath] = this._normalizeCollectionEntry(collectionPath, {
        workspacePathname: '',
        environment: {
          collection: environmentRef,
          global: ''
        },
        isOpen: false,
        isMounted: false
      });

      return acc;
    }, {});
  }

  _normalizeCollectionEntry(collectionPath, collection) {
    const environment = isObject(collection.environment) ? collection.environment : {};
    const collectionEnvironmentRef = environment.collection ?? collection.environmentPath ?? collection.selectedEnvironment;

    return {
      workspacePathname: typeof collection.workspacePathname === 'string' ? collection.workspacePathname : '',
      environment: {
        collection: this._normalizeCollectionEnvironmentRef(collectionPath, collectionEnvironmentRef),
        global: typeof environment.global === 'string' ? environment.global : ''
      },
      isOpen: typeof collection.isOpen === 'boolean' ? collection.isOpen : false,
      isMounted: typeof collection.isMounted === 'boolean' ? collection.isMounted : false
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

    const resolvedEnvironmentPath = this._resolveEnvironmentPathByName(collectionPath, trimmedRef);
    if (resolvedEnvironmentPath) {
      return resolvedEnvironmentPath;
    }

    return trimmedRef;
  }

  _resolveEnvironmentPathByName(collectionPath, environmentName) {
    if (typeof collectionPath !== 'string' || !collectionPath || typeof environmentName !== 'string' || !environmentName) {
      return null;
    }

    const environmentsDir = path.join(collectionPath, 'environments');
    if (!fs.existsSync(environmentsDir)) {
      return null;
    }

    for (const extension of ENV_FILE_EXTENSIONS) {
      const environmentFilePath = path.join(environmentsDir, `${environmentName}.${extension}`);
      if (fs.existsSync(environmentFilePath)) {
        return path.normalize(environmentFilePath);
      }
    }

    return null;
  }

  _normalizeTabsMap(tabs) {
    if (!isObject(tabs)) {
      return {};
    }

    return Object.entries(tabs).reduce((acc, [collectionPath, entry]) => {
      if (!collectionPath || !isObject(entry)) {
        return acc;
      }

      acc[collectionPath] = {
        activeTab: this._normalizeActiveTab(entry.activeTab),
        tabs: Array.isArray(entry.tabs) ? entry.tabs.filter((tab) => isObject(tab)) : []
      };

      return acc;
    }, {});
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

  _getByPathWithNormalizedFallback(rootKey, pathname) {
    if (typeof pathname !== 'string' || !pathname) {
      return null;
    }

    const entry = this.store.get(`${rootKey}.${this._escapeKey(pathname)}`, undefined);
    if (entry !== undefined) {
      return entry;
    }

    const rootValue = this.store.get(rootKey, {});
    if (!isObject(rootValue)) {
      return null;
    }

    const normalizedPath = path.normalize(pathname);
    const matchingKey = Object.keys(rootValue).find((key) => path.normalize(key) === normalizedPath);

    if (!matchingKey) {
      return null;
    }

    return rootValue[matchingKey] ?? null;
  }

  _deleteByPathWithNormalizedFallback(rootKey, pathname) {
    if (typeof pathname !== 'string' || !pathname) {
      return;
    }

    this.store.delete(`${rootKey}.${this._escapeKey(pathname)}`);

    const rootValue = this.store.get(rootKey, {});
    if (!isObject(rootValue)) {
      return;
    }

    const normalizedPath = path.normalize(pathname);
    const matchingKey = Object.keys(rootValue).find((key) => key !== pathname && path.normalize(key) === normalizedPath);

    if (matchingKey) {
      this.store.delete(`${rootKey}.${this._escapeKey(matchingKey)}`);
    }
  }

  // electron-store uses dot notation for nested paths, so we need to escape dots in pathnames
  _escapeKey(pathname) {
    if (typeof pathname !== 'string') {
      return '';
    }

    return pathname.replace(/\./g, '\\.');
  }
}

module.exports = new SnapshotManager();
