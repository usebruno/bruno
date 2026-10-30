const { ipcMain, app } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const crypto = require('node:crypto');
const jsyaml = require('js-yaml');

jest.mock('electron', () => {
  const handlers = {};
  return {
    ipcMain: {
      handle: jest.fn((channel, handler) => {
        handlers[channel] = handler;
      }),
      on: jest.fn(),
      emit: jest.fn(),
      _getHandler: (channel) => handlers[channel]
    },
    app: {
      getPath: jest.fn(() => require('node:os').tmpdir()),
      getVersion: jest.fn(() => '2.0.0')
    },
    dialog: {
      showOpenDialog: jest.fn()
    }
  };
});

jest.mock('../utils/filesystem', () => ({
  ...jest.requireActual('../utils/filesystem'),
  copyPathTo: jest.fn(),
  removePath: jest.fn(),
  getPaths: jest.fn(async (src) => [src]),
  withDirLock: jest.fn((dir, cb) => cb()),
  getUniqueRenamePath: jest.fn((p) => p)
}));

jest.mock('../cache/requestUids', () => ({
  moveRequestUid: jest.fn(),
  deleteRequestUid: jest.fn(),
  syncExampleUidsCache: jest.fn()
}));

jest.mock('../utils/constants', () => ({
  REQUEST_TYPES: ['http-request', 'graphql-request', 'grpc-request', 'ws-request']
}));

jest.mock('../app/collection-watcher', () => {
  const path = require('node:path');
  const os = require('node:os');
  return {
    getAllWatcherPaths: jest.fn(() => [
      path.join(os.tmpdir(), 'fake', 'source'),
      path.join(os.tmpdir(), 'fake', 'target')
    ])
  };
});

jest.mock('@usebruno/filestore', () => ({
  parseRequest: jest.fn(() => ({})),
  stringifyRequest: jest.fn(() => 'mock-content-stringified'),
  stringifyCollection: jest.fn(async () => 'mock-collection-stringified')
}));

const fsPromises = require('node:fs').promises;
jest.spyOn(fsPromises, 'writeFile').mockImplementation(async () => {});
jest.spyOn(fsPromises, 'readFile').mockImplementation(async () => 'mock-content');

// Load collection.js to register IPC handlers
const registerCollectionsIpc = require('./collection');

const { copyPathTo } = require('../utils/filesystem');
const { moveRequestUid } = require('../cache/requestUids');

describe('IPC collection handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    registerCollectionsIpc({ webContents: { send: jest.fn() } }, {});
  });

  describe('renderer:move-item', () => {
    beforeEach(() => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    });

    afterEach(() => {
      fs.existsSync.mockRestore();
    });

    it('calls moveRequestUid before copyPathTo to prevent observed uid mismatches', async () => {
      const moveItemHandler = ipcMain._getHandler('renderer:move-item');

      let callOrder = [];
      moveRequestUid.mockImplementation(() => callOrder.push('moveRequestUid'));
      copyPathTo.mockImplementation(async () => callOrder.push('copyPathTo'));

      await moveItemHandler({}, {
        targetDirname: path.join(os.tmpdir(), 'fake', 'target'),
        sourcePathname: path.join(os.tmpdir(), 'fake', 'source', 'request.bru')
      });

      expect(callOrder).toEqual(['moveRequestUid', 'copyPathTo']);
    });
  });

  describe('renderer:move-item-cross-format', () => {
    beforeEach(() => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    });

    afterEach(() => {
      fs.existsSync.mockRestore();
    });

    it('calls moveRequestUid before writing the target file', async () => {
      const moveItemCrossFormatHandler = ipcMain._getHandler('renderer:move-item-cross-format');

      let callOrder = [];
      moveRequestUid.mockImplementation(() => callOrder.push('moveRequestUid'));
      fsPromises.writeFile.mockImplementation(async () => callOrder.push('writeFile'));

      await moveItemCrossFormatHandler({}, {
        targetDirname: path.join(os.tmpdir(), 'fake', 'target'),
        sourcePathname: path.join(os.tmpdir(), 'fake', 'source', 'request.bru'),
        sourceFormat: 'bru',
        targetFormat: 'yml'
      });

      expect(callOrder).toEqual(['moveRequestUid', 'writeFile']);
    });
  });

  describe('renderer:import-collection', () => {
    let collectionLocation;
    let userDataPath;
    let importCollectionHandler;

    beforeEach(() => {
      collectionLocation = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-import-'));
      userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-user-data-'));
      app.getPath.mockReturnValue(userDataPath);
      importCollectionHandler = ipcMain._getHandler('renderer:import-collection');
    });

    afterEach(() => {
      app.getPath.mockReturnValue(os.tmpdir());
      fs.rmSync(collectionLocation, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      fs.rmSync(userDataPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    });

    const ordersSpec = 'openapi: 3.0.0\ninfo:\n  title: Orders API\n';
    const usersSpec = 'openapi: 3.0.0\ninfo:\n  title: Users API\n';
    const specHashOf = (spec) => crypto.createHash('md5').update(JSON.stringify(jsyaml.load(spec))).digest('hex');

    const openApiCollection = (uid, name) => ({
      uid,
      name,
      items: [],
      environments: [],
      brunoConfig: { name, type: 'collection', openapi: [{ sourceUrl: path.join(collectionLocation, `${uid}.yaml`), groupBy: 'tags' }] }
    });

    const readSyncConfig = (collectionName) => {
      return JSON.parse(fs.readFileSync(path.join(collectionLocation, collectionName, 'bruno.json'), 'utf8')).openapi;
    };

    const readStoredSpecs = () => {
      const specsDir = path.join(userDataPath, 'specs');
      const metadata = JSON.parse(fs.readFileSync(path.join(specsDir, 'metadata.json'), 'utf8'));
      return Object.fromEntries(Object.entries(metadata).map(([collectionPath, entries]) => [
        collectionPath,
        entries.map(({ filename, sourceUrl }) => ({ sourceUrl, content: fs.readFileSync(path.join(specsDir, filename), 'utf8') }))
      ]));
    };

    it('saves each synced collection with its own spec', async () => {
      await importCollectionHandler({}, [
        openApiCollection('orders', 'Orders API'),
        openApiCollection('users', 'Users API'),
        { uid: 'postman', name: 'Postman Collection', items: [], environments: [] }
      ], collectionLocation, {
        format: 'bru',
        rawOpenAPISpecs: { orders: ordersSpec, users: usersSpec, postman: 'openapi: 3.0.0\n' }
      });

      expect(readStoredSpecs()).toEqual({
        [path.join(collectionLocation, 'Orders API')]: [{ sourceUrl: path.join(collectionLocation, 'orders.yaml'), content: ordersSpec }],
        [path.join(collectionLocation, 'Users API')]: [{ sourceUrl: path.join(collectionLocation, 'users.yaml'), content: usersSpec }]
      });
      expect(readSyncConfig('Orders API')).toEqual([
        { sourceUrl: '../orders.yaml', groupBy: 'tags', lastSyncDate: expect.any(String), specHash: specHashOf(ordersSpec) }
      ]);
      expect(readSyncConfig('Users API')).toEqual([
        { sourceUrl: '../users.yaml', groupBy: 'tags', lastSyncDate: expect.any(String), specHash: specHashOf(usersSpec) }
      ]);
      expect(readSyncConfig('Postman Collection')).toBeUndefined();
    });

    it('saves a spec passed as an object as JSON', async () => {
      const specContent = JSON.stringify({ openapi: '3.0.0' }, null, 2);

      await importCollectionHandler({}, openApiCollection('orders', 'Orders API'), collectionLocation, {
        format: 'bru',
        rawOpenAPISpecs: { orders: { openapi: '3.0.0' } }
      });

      expect(readStoredSpecs()).toEqual({
        [path.join(collectionLocation, 'Orders API')]: [{ sourceUrl: path.join(collectionLocation, 'orders.yaml'), content: specContent }]
      });
      expect(readSyncConfig('Orders API')).toEqual([
        { sourceUrl: '../orders.yaml', groupBy: 'tags', lastSyncDate: expect.any(String), specHash: specHashOf(specContent) }
      ]);
    });
  });
});
