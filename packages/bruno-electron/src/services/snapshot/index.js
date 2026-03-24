const Store = require('electron-store');
const yup = require('yup');

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
      name: 'app-snapshot',
      clearInvalidConfig: true,
      defaults: emptySnapshot
    });
  }

  // --- Reads ---

  getSnapshot() {
    return this.store.store;
  }

  getActiveWorkspacePath() {
    return this.store.get('activeWorkspacePath', null);
  }

  getWorkspace(pathname) {
    return this.store.get(`workspaces.${this._escapeKey(pathname)}`, null);
  }

  getCollection(pathname) {
    return this.store.get(`collections.${this._escapeKey(pathname)}`, null);
  }

  getTabs(collectionPathname) {
    return this.store.get(`tabs.${this._escapeKey(collectionPathname)}`, null);
  }

  // --- Writes ---

  saveSnapshot(data) {
    try {
      snapshotSchema.validateSync(data, { strict: false });
      this.store.store = data;
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
    this.store.set(`workspaces.${this._escapeKey(pathname)}`, data);
  }

  setCollection(pathname, data) {
    this.store.set(`collections.${this._escapeKey(pathname)}`, data);
  }

  setTabs(collectionPathname, data) {
    this.store.set(`tabs.${this._escapeKey(collectionPathname)}`, data);
  }

  removeWorkspace(pathname) {
    this.store.delete(`workspaces.${this._escapeKey(pathname)}`);
  }

  removeCollection(pathname) {
    this.store.delete(`collections.${this._escapeKey(pathname)}`);
    this.store.delete(`tabs.${this._escapeKey(pathname)}`);
  }

  // electron-store uses dot notation for nested paths, so we need to escape dots in pathnames
  _escapeKey(pathname) {
    return pathname.replace(/\./g, '\\.');
  }
}

module.exports = new SnapshotManager();
