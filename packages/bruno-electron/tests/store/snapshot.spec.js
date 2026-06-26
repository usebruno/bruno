jest.mock('electron-store', () => {
  return jest.fn().mockImplementation((opts = {}) => {
    const data = { ...(opts.defaults || {}) };

    return {
      get: (key, fallback) => (key in data ? data[key] : fallback),
      set: (key, value) => {
        data[key] = value;
      },
      delete: (key) => {
        delete data[key];
      },
      get store() {
        return data;
      },
      set store(value) {
        Object.keys(data).forEach((key) => delete data[key]);
        if (value && typeof value === 'object') {
          Object.assign(data, value);
        }
      }
    };
  });
});

describe('SnapshotManager legacy mode', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('setCollection persists only legacy collection fields', () => {
    const snapshotManager = require('../../src/services/snapshot');

    snapshotManager.setCollection('/tmp/collection', {
      selectedEnvironment: 'dev',
      tabs: [{ type: 'http-request' }],
      activeTab: { accessor: 'type', value: 'http-request' },
      environmentPath: '/tmp/collection/environments/dev.bru',
      isOpen: true,
      workspacePathname: '/tmp/workspace'
    });

    const snapshot = snapshotManager.getSnapshot();
    expect(snapshot.version).toBe('0.0.0');
    expect(snapshot.collections).toEqual([
      {
        pathname: '/tmp/collection',
        selectedEnvironment: 'dev'
      }
    ]);
    expect(snapshot.activeWorkspacePath).toBeUndefined();
    expect(snapshot.workspaces).toBeUndefined();
  });
});
