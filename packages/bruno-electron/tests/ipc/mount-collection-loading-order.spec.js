const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const deferred = () => {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const collectionPathA = path.join(os.tmpdir(), 'bruno-mount-order-a');
const collectionPathB = path.join(os.tmpdir(), 'bruno-mount-order-b');

const mockIpcHandlers = {};

jest.mock('../../src/utils/constants', () => ({
  REQUEST_TYPES: ['http-request', 'graphql-request', 'grpc-request', 'ws-request']
}));

jest.mock('electron', () => ({
  app: {
    getPath: () => require('node:os').tmpdir(),
    getVersion: () => '0.0.0-test'
  },
  ipcMain: {
    handle: (channel, fn) => {
      mockIpcHandlers[channel] = fn;
    },
    on: jest.fn()
  },
  shell: {},
  dialog: {}
}));

jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn()
  }));
});

jest.mock('../../src/app/collection-watcher', () => ({
  startCollectionDiscovery: jest.fn((win, collectionUid) => {
    win.webContents.send('main:collection-loading-state-updated', {
      collectionUid,
      isLoading: true
    });
  }),
  completeCollectionDiscovery: jest.fn((win, collectionUid) => {
    win.webContents.send('main:collection-loading-state-updated', {
      collectionUid,
      isLoading: false
    });
  }),
  addWatcher: jest.fn(),
  addTempDirectoryWatcher: jest.fn()
}));

const mockGetCollectionStats = jest.fn();
jest.mock('../../src/utils/filesystem', () => {
  const actual = jest.requireActual('../../src/utils/filesystem');
  return {
    ...actual,
    getCollectionStats: (...args) => mockGetCollectionStats(...args)
  };
});

const collectionWatcher = require('../../src/app/collection-watcher');
const registerCollectionsIpc = require('../../src/ipc/collection');

const mountCollection = (win, payload) => {
  registerCollectionsIpc(win, collectionWatcher);
  return mockIpcHandlers['renderer:mount-collection']({}, payload);
};

describe('renderer:mount-collection loading order', () => {
  beforeAll(() => {
    fs.mkdirSync(collectionPathA, { recursive: true });
    fs.mkdirSync(collectionPathB, { recursive: true });
    fs.writeFileSync(path.join(collectionPathA, 'bruno.json'), JSON.stringify({ version: '1', name: 'A' }));
    fs.writeFileSync(path.join(collectionPathB, 'bruno.json'), JSON.stringify({ version: '1', name: 'B' }));
  });

  beforeEach(() => {
    mockGetCollectionStats.mockReset();
    collectionWatcher.startCollectionDiscovery.mockClear();
    collectionWatcher.completeCollectionDiscovery.mockClear();
    collectionWatcher.addWatcher.mockClear();
    collectionWatcher.addTempDirectoryWatcher.mockClear();
  });

  it('emits loading for collection B before collection A finishes stats', async () => {
    const gateA = deferred();
    mockGetCollectionStats.mockImplementation(async (dir) => {
      if (dir === collectionPathA) {
        await gateA.promise;
      }
      return { size: 0, filesCount: 7000, maxFileSize: 0 };
    });

    const loadingEvents = [];
    const win = {
      webContents: {
        send: (channel, payload) => {
          if (channel === 'main:collection-loading-state-updated') {
            loadingEvents.push(payload);
          }
        }
      }
    };

    const mountA = mountCollection(win, {
      collectionUid: 'uid-a',
      collectionPathname: collectionPathA,
      brunoConfig: {}
    });
    const mountB = mountCollection(win, {
      collectionUid: 'uid-b',
      collectionPathname: collectionPathB,
      brunoConfig: {}
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(loadingEvents.some((e) => e.collectionUid === 'uid-b' && e.isLoading === true)).toBe(true);

    gateA.resolve();
    await Promise.all([mountA, mountB]);

    expect(mockGetCollectionStats).toHaveBeenCalled();
    expect(collectionWatcher.addWatcher).toHaveBeenCalledTimes(2);
    expect(collectionWatcher.addTempDirectoryWatcher).toHaveBeenCalledTimes(2);
  });

  it('emits loading false if stats fail after loading start', async () => {
    mockGetCollectionStats.mockRejectedValue(new Error('stats failed'));

    const loadingEvents = [];
    const win = {
      webContents: {
        send: (channel, payload) => {
          if (channel === 'main:collection-loading-state-updated') {
            loadingEvents.push(payload);
          }
        }
      }
    };

    await expect(mountCollection(win, {
      collectionUid: 'uid-a',
      collectionPathname: collectionPathA,
      brunoConfig: {}
    })).rejects.toThrow('stats failed');

    expect(loadingEvents).toEqual([
      { collectionUid: 'uid-a', isLoading: true },
      { collectionUid: 'uid-a', isLoading: false }
    ]);
    expect(collectionWatcher.addWatcher).not.toHaveBeenCalled();
  });
});
