const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

jest.mock('electron', () => ({
  ipcMain: { emit: jest.fn() }
}));

jest.mock('../ipc/recent-collections', () => ({
  recordRecentCollections: jest.fn()
}));

const { recordRecentCollections } = require('../ipc/recent-collections');
const { openCollectionFromRecentMenu } = require('./collections');

describe('openCollectionFromRecentMenu', () => {
  const watcher = { hasWatcher: () => false };
  let collectionsFolder;
  let win;

  const writeCollection = (folderName, name) => {
    const collectionPath = path.join(collectionsFolder, folderName);
    fs.mkdirSync(collectionPath);
    fs.writeFileSync(path.join(collectionPath, 'bruno.json'), JSON.stringify({ version: '1', name, type: 'collection' }));
    return collectionPath;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    collectionsFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-recent-menu-'));
    win = { webContents: { send: jest.fn() } };
  });

  afterEach(() => {
    fs.rmSync(collectionsFolder, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  it('opens the collection and records it in Recents', async () => {
    const ordersCollection = writeCollection('orders', 'Orders API');

    await openCollectionFromRecentMenu(win, watcher, ordersCollection);

    expect(win.webContents.send).toHaveBeenCalledWith('main:collection-opened', ordersCollection, expect.any(String), expect.objectContaining({ name: 'Orders API' }), { silent: false });
    expect(recordRecentCollections).toHaveBeenCalledWith([{ path: ordersCollection, name: 'Orders API' }], 'opened');
  });

  it('records nothing when the folder holds no collection', async () => {
    const notesFolder = path.join(collectionsFolder, 'notes');
    fs.mkdirSync(notesFolder);

    await openCollectionFromRecentMenu(win, watcher, notesFolder);

    expect(recordRecentCollections).not.toHaveBeenCalled();
  });

  it('opens a link to a collection folder without recording the link', async () => {
    const ordersCollection = writeCollection('orders', 'Orders API');
    const ordersLink = path.join(collectionsFolder, 'orders-link');
    fs.symlinkSync(ordersCollection, ordersLink, 'junction');

    await openCollectionFromRecentMenu(win, watcher, ordersLink);

    expect(win.webContents.send).toHaveBeenCalledWith('main:collection-opened', ordersLink, expect.any(String), expect.objectContaining({ name: 'Orders API' }), { silent: false });
    expect(recordRecentCollections).not.toHaveBeenCalled();
  });
});
