let mockStoreData = {};

jest.mock('electron-store', () => {
  return jest.fn().mockImplementation((opts = {}) => {
    mockStoreData = { ...(opts.defaults || {}) };
    return {
      get store() {
        return mockStoreData;
      },
      set store(value) {
        mockStoreData = value;
      },
      get: (key, fallback) => (key in mockStoreData ? mockStoreData[key] : fallback),
      set: (key, value) => {
        mockStoreData[key] = value;
      },
      delete: (key) => {
        delete mockStoreData[key];
      }
    };
  });
});

const snapshotManager = require('../../src/services/snapshot');

const workspacePath = '/workspaces/my-workspace';
const petstore = `${workspacePath}/petstore.yaml`;
const orders = `${workspacePath}/orders.yaml`;

const save = (workspace) =>
  snapshotManager.saveSnapshot({
    version: '0.0.1',
    activeWorkspacePath: workspacePath,
    extras: { devTools: { open: false, activeTab: '', tabs: {} } },
    workspaces: [
      {
        pathname: workspacePath,
        environment: '',
        lastActiveCollectionPathname: null,
        activeWorkspaceTabType: null,
        sorting: 'default',
        collections: [],
        ...workspace
      }
    ],
    collections: []
  });

const savedWorkspace = () => snapshotManager.getSnapshot().workspaces[0];

describe('workspace snapshot: open API specs', () => {
  beforeEach(() => {
    mockStoreData = { workspaces: [], collections: [] };
    snapshotManager._lookupCache = null;
  });

  it('remembers which API specs were open so they come back on the next launch', () => {
    expect(save({ apiSpecTabs: [petstore, orders], activeApiSpecTabPathname: orders })).toBe(true);

    expect(savedWorkspace().apiSpecTabs).toEqual([petstore, orders]);
    expect(savedWorkspace().activeApiSpecTabPathname).toBe(orders);
  });

  it('keeps one entry per spec when the same spec is listed twice', () => {
    save({ apiSpecTabs: [petstore, petstore, orders] });

    expect(savedWorkspace().apiSpecTabs).toEqual([petstore, orders]);
  });

  it('throws away entries that are not file paths', () => {
    save({ apiSpecTabs: [petstore, 123, null, '', orders] });

    expect(savedWorkspace().apiSpecTabs).toEqual([petstore, orders]);
  });

  it('records no open specs when a workspace has none', () => {
    save({});

    expect(savedWorkspace().apiSpecTabs).toEqual([]);
    expect(savedWorkspace().activeApiSpecTabPathname).toBeNull();
  });

  it('records no active spec when the value handed in is not a path', () => {
    save({ apiSpecTabs: [petstore], activeApiSpecTabPathname: 42 });

    expect(savedWorkspace().activeApiSpecTabPathname).toBeNull();
  });

  it('forgets the open specs when the snapshot is reset', () => {
    save({ apiSpecTabs: [petstore, orders], activeApiSpecTabPathname: orders });

    snapshotManager.resetSnapshot();

    expect(savedWorkspace().apiSpecTabs).toEqual([]);
    expect(savedWorkspace().activeApiSpecTabPathname).toBeNull();
  });
});
