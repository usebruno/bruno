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

const collectionSchema = yup.object({
  pathname: yup.string().required(),
  environment: yup.object({
    collection: yup.string(),
    global: yup.string()
  }).required(),
  isOpen: yup.boolean().required(),
  isMounted: yup.boolean().required(),
  activeTab: activeTabSchema.nullable(),
  tabs: yup.array().of(tabSchema).required()
});

const workspaceSchema = yup.object({
  pathname: yup.string().required(),
  activeCollectionUid: yup.string().nullable(),
  environment: yup.string().defined(),
  sorting: yup.string().defined(),
  collections: yup.array().of(yup.string()).required()
});

const devToolsSchema = yup.object({
  open: yup.boolean().required(),
  height: yup.number().required(),
  tab: yup.string().required(),
  tabData: yup.object()
});

const snapshotSchema = yup.object({
  version: yup.number().required(),
  activeWorkspacePath: yup.string().nullable(),
  extras: yup.object({
    devTools: devToolsSchema.required()
  }).required(),
  workspaces: yup.array().of(workspaceSchema).required(),
  collections: yup.array().of(collectionSchema).required()
});

const emptySnapshot = {
  version: 1,
  activeWorkspacePath: null,
  extras: {
    devTools: {
      open: false,
      height: 300,
      tab: 'console',
      tabData: {}
    }
  },
  workspaces: [],
  collections: []
};

class SnapshotManager {
  constructor() {
    this.store = new Store({
      name: 'app-snapshot',
      clearInvalidConfig: true,
      defaults: emptySnapshot
    });
  }

  getSnapshot() {
    return this.store.store;
  }

  saveSnapshot(data) {
    try {
      snapshotSchema.validateSync(data, { strict: true });
      this.store.store = data;
      return true;
    } catch (err) {
      console.error('Failed to save snapshot:', err.message);
      return false;
    }
  }

  getWorkspace(pathname) {
    const workspaces = this.store.get('workspaces', []);
    return workspaces.find((w) => w.pathname === pathname) || null;
  }

  getCollection(pathname) {
    const collections = this.store.get('collections', []);
    return collections.find((c) => c.pathname === pathname) || null;
  }
}

module.exports = new SnapshotManager();
