const { ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const jsyaml = require('js-yaml');

jest.mock('electron', () => {
  const handlers = {};
  return {
    ipcMain: {
      handle: jest.fn((channel, handler) => {
        handlers[channel] = handler;
      }),
      on: jest.fn(),
      _getHandler: (channel) => handlers[channel]
    },
    app: {
      getPath: jest.fn(() => require('node:os').tmpdir()),
      getVersion: jest.fn(() => '2.0.0')
    },
    dialog: {}
  };
});

jest.mock('../app/collection-watcher', () => ({
  removeWatcher: jest.fn()
}));

jest.mock('./mount', () => ({
  unmount: jest.fn(async () => {}),
  clearCollectionIndex: jest.fn()
}));

jest.mock('./recent-collections', () => ({
  forgetRecentCollections: jest.fn()
}));

const registerWorkspaceIpc = require('./workspace');
const { forgetRecentCollections } = require('./recent-collections');

describe('IPC workspace handlers', () => {
  let mainWindow;

  beforeEach(() => {
    jest.clearAllMocks();
    mainWindow = { webContents: { send: jest.fn() } };
    registerWorkspaceIpc(mainWindow, null);
  });

  describe('renderer:remove-collection-from-workspace', () => {
    let workspacePath;
    let ordersCollection;
    let removeCollectionFromWorkspaceHandler;

    beforeEach(() => {
      workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-workspace-'));
      ordersCollection = path.join(workspacePath, 'collections', 'orders');
      fs.mkdirSync(ordersCollection, { recursive: true });
      fs.writeFileSync(path.join(ordersCollection, 'bruno.json'), JSON.stringify({ version: '1', name: 'Orders API', type: 'collection' }));
      fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), jsyaml.dump({
        opencollection: '1.0.0',
        info: { name: 'Team', type: 'workspace' },
        collections: [{ name: 'Orders API', path: 'collections/orders' }]
      }));
      removeCollectionFromWorkspaceHandler = ipcMain._getHandler('renderer:remove-collection-from-workspace');
    });

    afterEach(() => {
      fs.rmSync(workspacePath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    });

    it('forgets the Recents row of a collection whose files it deletes', async () => {
      await removeCollectionFromWorkspaceHandler({}, 'team-uid', workspacePath, ordersCollection, { deleteFiles: true });

      expect(fs.existsSync(ordersCollection)).toBe(false);
      expect(forgetRecentCollections).toHaveBeenCalledWith([ordersCollection]);
    });

    it('keeps the Recents row of a collection it only removes from the workspace', async () => {
      await removeCollectionFromWorkspaceHandler({}, 'team-uid', workspacePath, ordersCollection);

      expect(fs.existsSync(ordersCollection)).toBe(true);
      expect(forgetRecentCollections).not.toHaveBeenCalled();
    });
  });
});
