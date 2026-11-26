const { ipcMain, app } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const fsExtra = require('fs-extra');
const os = require('node:os');
const crypto = require('node:crypto');
const jsyaml = require('js-yaml');
const AdmZip = require('adm-zip');

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
  stringifyRequestViaWorker: jest.fn(async () => 'mock-request-stringified'),
  stringifyCollection: jest.fn(async () => 'mock-collection-stringified')
}));

jest.mock('../app/recent-collections', () => ({
  recordRecentCollections: jest.fn(),
  recordRecentCollectionClose: jest.fn(),
  forgetMissingRecentCollections: jest.fn(),
  moveRecentCollection: jest.fn(),
  renameRecentCollection: jest.fn()
}));

const fsPromises = require('node:fs').promises;
jest.spyOn(fsPromises, 'writeFile').mockImplementation(async () => {});
jest.spyOn(fsPromises, 'readFile').mockImplementation(async () => 'mock-content');

// Load collection.js to register IPC handlers
const registerCollectionsIpc = require('./collection');

const { copyPathTo, posixifyPath } = require('../utils/filesystem');
const { moveRequestUid } = require('../cache/requestUids');
const { recordRecentCollections, recordRecentCollectionClose, forgetMissingRecentCollections, moveRecentCollection, renameRecentCollection } = require('../app/recent-collections');

describe('IPC collection handlers', () => {
  let mainWindow;

  beforeEach(() => {
    jest.clearAllMocks();
    mainWindow = { webContents: { send: jest.fn() } };
    registerCollectionsIpc(mainWindow, {});
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

    it('opens the collection with the sync config it saved, including specHash and lastSyncDate', async () => {
      await importCollectionHandler({}, openApiCollection('orders', 'Orders API'), collectionLocation, {
        format: 'bru',
        rawOpenAPISpecs: { orders: ordersSpec }
      });

      const [, , , brunoConfig] = mainWindow.webContents.send.mock.calls.find(([channel]) => channel === 'main:collection-opened');
      const sentConfig = brunoConfig.openapi.map((entry) => ({ ...entry, sourceUrl: posixifyPath(entry.sourceUrl) }));
      expect(sentConfig).toEqual(readSyncConfig('Orders API'));
    });

    it('records the imported collections in Recents once, under the names they were saved with', async () => {
      fs.mkdirSync(path.join(collectionLocation, 'Orders API'));

      await importCollectionHandler({}, [
        openApiCollection('orders', 'Orders API'),
        { uid: 'postman', name: 'Postman Collection', items: [], environments: [] }
      ], collectionLocation, { format: 'bru' });

      expect(recordRecentCollections.mock.calls).toEqual([[
        [
          { path: path.join(collectionLocation, 'Orders API - 1'), name: 'Orders API' },
          { path: path.join(collectionLocation, 'Postman Collection'), name: 'Postman Collection' }
        ],
        'opened'
      ]]);
    });

    describe('request files', () => {
      const requestItem = (name, method, filename) => ({
        uid: `${method} ${name}`,
        type: 'http-request',
        name,
        ...(filename && { filename }),
        request: { method, url: `https://api.example.com${name}` }
      });

      const importItems = (items, format) => importCollectionHandler({}, { uid: 'requests', name: 'Requests', items, environments: [] }, collectionLocation, { format });

      const requestFilesIn = (...folders) => fs.readdirSync(path.join(collectionLocation, 'Requests', ...folders))
        .filter((file) => /\.(bru|yml)$/.test(file) && !['opencollection.yml', 'collection.bru'].includes(file))
        .sort();

      it.each(['bru', 'yml'])('writes each request\'s file name in %s, also when its path ends in a slash or holds .bru', async (format) => {
        await importItems([
          requestItem('/', 'GET', 'GET /.bru'),
          requestItem('/users/', 'GET', 'GET /users/.bru'),
          requestItem('/export.bru', 'GET', 'GET /export.bru.bru'),
          requestItem('/pets', 'GET', 'GET /pets.bru')
        ], format);

        expect(requestFilesIn()).toEqual([`GET -.${format}`, `GET -export.bru.${format}`, `GET -pets.${format}`, `GET -users-.${format}`]);
      });

      it.each(['bru', 'yml'])('adds the format extension to a file name that has none, in %s', async (format) => {
        await importItems([requestItem('/users', 'GET', 'get-users')], format);

        expect(requestFilesIn()).toEqual([`get-users.${format}`]);
      });

      it.each(['bru', 'yml'])('writes requests that share a name to the files the converter gave them, in %s', async (format) => {
        await importItems([
          requestItem('List pets', 'GET'),
          requestItem('List pets', 'POST', 'List pets (POST).bru')
        ], format);

        expect(requestFilesIn()).toEqual([`List pets (POST).${format}`, `List pets.${format}`]);
      });

      it('keeps requests that share a name in one folder in their own files', async () => {
        await importItems([{
          uid: 'pet',
          type: 'folder',
          name: 'pet',
          items: [
            requestItem('/pet/{petId}', 'GET'),
            requestItem('/pet/{petId}', 'POST'),
            requestItem('/Pet/{petId}', 'DELETE')
          ]
        }], 'yml');

        expect(requestFilesIn('pet')).toEqual(['Pet-{petId} (2).yml', 'pet-{petId} (1).yml', 'pet-{petId}.yml']);
      });
    });
  });

  describe('renderer:open-multiple-collections', () => {
    let collectionsFolder;
    let ordersCollection;
    let folderWithoutCollection;
    let deletedFolder;
    let watcher;
    let openMultipleCollectionsHandler;
    let consoleError;

    beforeEach(() => {
      collectionsFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-open-multiple-'));
      ordersCollection = path.join(collectionsFolder, 'orders');
      fs.mkdirSync(ordersCollection);
      fs.writeFileSync(path.join(ordersCollection, 'bruno.json'), JSON.stringify({ version: '1', name: 'Orders API', type: 'collection' }));
      folderWithoutCollection = path.join(collectionsFolder, 'notes');
      fs.mkdirSync(folderWithoutCollection);
      deletedFolder = path.join(collectionsFolder, 'deleted');
      watcher = { hasWatcher: jest.fn(() => false) };
      registerCollectionsIpc(mainWindow, watcher);
      openMultipleCollectionsHandler = ipcMain._getHandler('renderer:open-multiple-collections');
      consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleError.mockRestore();
      fs.rmSync(collectionsFolder, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    });

    it('records what the user opened and forgets missing folders, keeping ones that failed to load', async () => {
      const result = await openMultipleCollectionsHandler({}, [ordersCollection, folderWithoutCollection, deletedFolder], {
        silent: true,
        recordRecent: true
      });

      expect(result).toEqual({
        opened: [ordersCollection],
        failed: [{ path: folderWithoutCollection, error: 'The collection is not valid (neither bruno.json nor opencollection.yml found)' }],
        invalid: [deletedFolder]
      });
      expect(recordRecentCollections).toHaveBeenCalledWith([{ path: ordersCollection, name: 'Orders API' }], 'opened');
      expect(forgetMissingRecentCollections).toHaveBeenCalledWith([deletedFolder]);
    });

    it('replies without waiting for Recents to check the volumes of missing folders', async () => {
      forgetMissingRecentCollections.mockReturnValueOnce(new Promise(() => {}));

      await expect(openMultipleCollectionsHandler({}, [deletedFolder], { recordRecent: true })).resolves.toEqual({
        opened: [],
        failed: [],
        invalid: [deletedFolder]
      });
    });

    it('records a collection the user opened that is already loaded for another workspace', async () => {
      watcher.hasWatcher.mockReturnValue(true);

      await openMultipleCollectionsHandler({}, [ordersCollection], { recordRecent: true });

      expect(recordRecentCollections).toHaveBeenCalledWith([{ path: ordersCollection, name: 'Orders API' }], 'opened');
    });

    it.each([
      ['an open without options', undefined],
      ['a workspace load', { workspacePath: '/workspaces/team', dontSendDisplayErrors: true }],
      ['a recordRecent flag that is not true', { recordRecent: 'true' }]
    ])('records and forgets nothing for %s', async (_label, options) => {
      await openMultipleCollectionsHandler({}, [ordersCollection, deletedFolder], options);

      expect(recordRecentCollections).not.toHaveBeenCalled();
      expect(forgetMissingRecentCollections).not.toHaveBeenCalled();
    });
  });

  describe('renderer:remove-collection', () => {
    const collectionPath = path.join(os.tmpdir(), 'fake', 'orders');
    let watcher;
    let removeCollectionHandler;

    beforeEach(() => {
      watcher = { removeWatcher: jest.fn() };
      registerCollectionsIpc(mainWindow, watcher);
      removeCollectionHandler = ipcMain._getHandler('renderer:remove-collection');
    });

    it('hands the close to Recents before the rest of the close runs, with the collection name the window sends', async () => {
      await removeCollectionHandler({}, collectionPath, 'orders-uid', 'default', 'Orders');

      expect(recordRecentCollectionClose).toHaveBeenCalledWith(collectionPath, 'Orders');
      expect(recordRecentCollectionClose.mock.invocationCallOrder[0]).toBeLessThan(watcher.removeWatcher.mock.invocationCallOrder[0]);
    });

    it('closes without waiting for Recents, so a share that stops answering cannot hold up the close', async () => {
      recordRecentCollectionClose.mockReturnValueOnce(new Promise(() => {}));

      await removeCollectionHandler({}, collectionPath, 'orders-uid', 'default', 'Orders');

      expect(watcher.removeWatcher).toHaveBeenCalledWith(collectionPath, mainWindow, 'orders-uid');
    });

    it('never reads the collection folder synchronously, so a share that stops answering cannot freeze the app', async () => {
      const syncReads = [fs, fsExtra].flatMap((fsModule) => ['existsSync', 'lstatSync', 'statSync'].map((name) => jest.spyOn(fsModule, name)));

      await removeCollectionHandler({}, collectionPath, 'orders-uid', 'default', 'Orders');
      const pathsReadSynchronously = syncReads.flatMap((syncRead) => syncRead.mock.calls.map(([filePath]) => filePath));
      syncReads.forEach((syncRead) => syncRead.mockRestore());

      expect(pathsReadSynchronously).not.toContain(collectionPath);
    });

    it('passes along whatever name the window sends, leaving names that are not strings to Recents', async () => {
      await removeCollectionHandler({}, collectionPath, 'orders-uid', 'default', 42);

      expect(recordRecentCollectionClose).toHaveBeenCalledWith(collectionPath, 42);
    });
  });

  describe('Recents', () => {
    let collectionsFolder;

    const writeCollection = (folderName, name) => {
      const collectionPath = path.join(collectionsFolder, folderName);
      fs.mkdirSync(collectionPath);
      fs.writeFileSync(path.join(collectionPath, 'bruno.json'), JSON.stringify({ version: '1', name, type: 'collection' }));
      return collectionPath;
    };

    beforeEach(() => {
      collectionsFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-recents-hooks-'));
    });

    afterEach(() => {
      app.getPath.mockReturnValue(os.tmpdir());
      fs.rmSync(collectionsFolder, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    });

    it('records a collection it creates', async () => {
      await ipcMain._getHandler('renderer:create-collection')({}, 'Orders API', 'orders', collectionsFolder, { format: 'bru' });

      expect(recordRecentCollections).toHaveBeenCalledWith([{ path: path.join(collectionsFolder, 'orders'), name: 'Orders API' }], 'opened');
    });

    it('records a collection it clones under the new name', async () => {
      const ordersCollection = writeCollection('orders', 'Orders API');

      await ipcMain._getHandler('renderer:clone-collection')({}, 'Orders API copy', 'orders copy', collectionsFolder, ordersCollection);

      expect(recordRecentCollections).toHaveBeenCalledWith([{ path: path.join(collectionsFolder, 'orders copy'), name: 'Orders API copy' }], 'opened');
    });

    it('records a collection it imports from a ZIP file', async () => {
      const zipPath = path.join(collectionsFolder, 'orders.zip');
      const zip = new AdmZip();
      zip.addFile('orders/bruno.json', Buffer.from(JSON.stringify({ version: '1', name: 'Orders API', type: 'collection' })));
      zip.writeZip(zipPath);

      await ipcMain._getHandler('renderer:import-collection-zip')({}, zipPath, collectionsFolder);

      expect(recordRecentCollections).toHaveBeenCalledWith([{ path: path.join(collectionsFolder, 'Orders API'), name: 'Orders API' }], 'opened');
    });

    it('renames the row of a collection it renames', async () => {
      const ordersCollection = writeCollection('orders', 'Orders API');

      await ipcMain._getHandler('renderer:rename-collection')({}, 'Orders', ordersCollection);

      expect(renameRecentCollection).toHaveBeenCalledWith(ordersCollection, 'Orders');
    });

    it('points the row of a collection it moves into a workspace at the new folder', async () => {
      const workspacePath = path.join(collectionsFolder, 'team');
      fs.mkdirSync(workspacePath);
      fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), jsyaml.dump({
        opencollection: '1.0.0',
        info: { name: 'Team', type: 'workspace' },
        collections: []
      }));
      const ordersCollection = writeCollection('orders', 'Orders API');
      app.getPath.mockReturnValue(collectionsFolder);
      registerCollectionsIpc(mainWindow, { removeWatcher: jest.fn() });

      await ipcMain._getHandler('renderer:move-collection-to-workspace')({}, {
        workspacePath,
        collectionPath: ordersCollection,
        collectionUid: 'orders-uid',
        collectionName: 'Orders API'
      });

      expect(moveRecentCollection).toHaveBeenCalledWith(ordersCollection, path.join(workspacePath, 'collections', 'orders'));
    });

    describe('when the change cannot be saved', () => {
      let consoleError;
      let outputFileSync;

      beforeEach(() => {
        consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        outputFileSync = jest.spyOn(fsExtra, 'outputFileSync');
      });

      afterEach(() => {
        consoleError.mockRestore();
        outputFileSync.mockRestore();
      });

      it('keeps the row name of a collection whose new name cannot be written', async () => {
        const ordersCollection = writeCollection('orders', 'Orders API');
        outputFileSync.mockImplementationOnce(() => {
          throw new Error('EACCES: permission denied');
        });

        await expect(ipcMain._getHandler('renderer:rename-collection')({}, 'Orders', ordersCollection)).rejects.toThrow('EACCES');

        expect(renameRecentCollection).not.toHaveBeenCalled();
      });

      it('keeps the row on the old folder when a move into a workspace is rolled back', async () => {
        const workspacePath = path.join(collectionsFolder, 'team');
        fs.mkdirSync(workspacePath);
        fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), jsyaml.dump({
          opencollection: '1.0.0',
          info: { name: 'Team', type: 'workspace' },
          collections: []
        }));
        const ordersCollection = writeCollection('orders', 'Orders API');
        app.getPath.mockReturnValue(collectionsFolder);
        registerCollectionsIpc(mainWindow, { removeWatcher: jest.fn() });

        await expect(ipcMain._getHandler('renderer:move-collection-to-workspace')({}, {
          workspacePath,
          collectionPath: ordersCollection,
          collectionUid: 'orders-uid',
          collectionName: ''
        })).rejects.toThrow('Invalid collection');

        expect(fs.existsSync(ordersCollection)).toBe(true);
        expect(moveRecentCollection).not.toHaveBeenCalled();
      });
    });
  });
});
