const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn() },
  utilityProcess: { fork: jest.fn() },
  app: { getPath: jest.fn() }
}));
jest.mock('../store/preferences', () => ({
  getPreferences: jest.fn()
}));
jest.mock('../store/default-workspace', () => ({
  defaultWorkspaceManager: { getDefaultWorkspacePath: jest.fn() }
}));
jest.mock('../store/last-opened-workspaces', () => jest.fn());
jest.mock('../services/recent-collections', () => ({
  list: jest.fn()
}));
jest.mock('../services/transient', () => ({
  transientManager: { getRootDirectory: () => '/app-data/tmp/transient' }
}));

const { ipcMain, utilityProcess, app } = require('electron');
const { getPreferences } = require('../store/preferences');
const { defaultWorkspaceManager } = require('../store/default-workspace');
const LastOpenedWorkspaces = require('../store/last-opened-workspaces');
const recentCollections = require('../services/recent-collections');
const { SCANNER_ENTRY } = require('../services/collection-scan');
const { startCollectionScan, cancelCollectionScan, stopCollectionScan, registerCollectionScanIpc } = require('./collection-scan');

const idOf = (folderPath) => (process.platform === 'win32' ? folderPath.toLowerCase() : folderPath);

const toLocation = (folderPath, kind) => ({ id: idOf(path.resolve(folderPath)), path: path.resolve(folderPath), kind });

const createChild = () => Object.assign(new EventEmitter(), { postMessage: jest.fn(), kill: jest.fn(() => true) });

const createWindow = () => ({
  isDestroyed: jest.fn(() => false),
  webContents: Object.assign(new EventEmitter(), { send: jest.fn() })
});

const payments = { path: '/work/payments', name: 'Payments', mtime: 1, locationId: '/work' };

describe('collection scan IPC', () => {
  let tempRoot;
  let at;
  let child;
  let mainWindow;

  beforeAll(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-collection-scan-ipc-'));
    at = (...segments) => path.join(tempRoot, ...segments);
    [['bruno'], ['documents', 'bruno'], ['workspaces', 'default'], ['workspaces', 'team']].forEach((segments) => {
      fs.mkdirSync(at(...segments), { recursive: true });
    });
    fs.writeFileSync(at('workspaces', 'notes.txt'), '');
  });

  afterAll(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    child = createChild();
    utilityProcess.fork.mockReturnValue(child);
    app.getPath.mockImplementation((name) => (name === 'documents' ? at('documents') : undefined));
    getPreferences.mockReturnValue({
      general: { defaultLocation: at('bruno') },
      openCollection: { searchFolders: [at('projects')], searchWholeComputer: true }
    });
    defaultWorkspaceManager.getDefaultWorkspacePath.mockReturnValue(at('workspaces', 'default'));
    LastOpenedWorkspaces.mockImplementation(() => ({
      getAll: () => [at('workspaces', 'team'), at('workspaces', 'gone'), at('workspaces', 'notes.txt')]
    }));
    recentCollections.list.mockReturnValue([{ path: '/elsewhere/api', name: 'API', usedAt: 1700000000000, lastEvent: 'opened' }]);
    mainWindow = createWindow();
    registerCollectionScanIpc(mainWindow);
  });

  it('registers start and cancel channels that start and cancel a scan', async () => {
    expect(ipcMain.handle.mock.calls.map(([channel]) => channel)).toEqual([
      'renderer:collection-scan:start',
      'renderer:collection-scan:cancel'
    ]);

    const [[, start], [, cancel]] = ipcMain.handle.mock.calls;
    await expect(start({}, { scanId: 'scan-1' })).resolves.toEqual({ locations: expect.any(Array) });
    cancel({}, { scanId: 'scan-1' });

    expect(utilityProcess.fork).toHaveBeenCalledTimes(1);
    expect(child.kill).toHaveBeenCalledTimes(1);
  });

  it('forks the scanner entry with its service name, inherited output and eight libuv threads', async () => {
    await startCollectionScan({ scanId: 'scan-1' });

    expect(utilityProcess.fork).toHaveBeenCalledWith(SCANNER_ENTRY, [], {
      serviceName: 'Bruno collection scan',
      stdio: 'inherit',
      env: { ...process.env, UV_THREADPOOL_SIZE: '8' }
    });
  });

  it('scans the default location, Documents, the workspace folders that exist, the search folders and home', async () => {
    const locations = [
      toLocation(at('bruno'), 'default-location'),
      toLocation(at('documents', 'bruno'), 'documents'),
      toLocation(at('workspaces', 'default'), 'workspace'),
      toLocation(at('workspaces', 'team'), 'workspace'),
      toLocation(at('projects'), 'user'),
      toLocation(os.homedir(), 'home')
    ];

    await expect(startCollectionScan({ scanId: 'scan-1' })).resolves.toEqual({ locations });

    expect(child.postMessage).toHaveBeenCalledWith({
      locations: locations.map(({ id, path: locationPath }) => ({ id, path: locationPath })),
      recents: [{ path: '/elsewhere/api', name: 'API' }],
      excludedPaths: ['/app-data/tmp/transient']
    });
  });

  it('scans without recents when the database cannot be read', async () => {
    recentCollections.list.mockImplementation(() => {
      throw new Error('The database is unavailable');
    });

    await expect(startCollectionScan({ scanId: 'scan-1' })).resolves.toEqual({ locations: expect.any(Array) });

    expect(child.postMessage).toHaveBeenCalledWith(expect.objectContaining({ recents: [] }));
  });

  it.each([
    ['no request', undefined],
    ['no scan id', {}],
    ['a scan id that is not a string', { scanId: ['scan-1'] }],
    ['an empty scan id', { scanId: '' }],
    ['an overlong scan id', { scanId: 'x'.repeat(101) }]
  ])('refuses a start with %s', async (_label, request) => {
    await expect(startCollectionScan(request)).rejects.toThrow('A collection scan needs a scan id');

    expect(utilityProcess.fork).not.toHaveBeenCalled();
  });

  it('relays the scan to the window, and sends nothing once the window is destroyed', async () => {
    await startCollectionScan({ scanId: 'scan-1' });

    child.emit('message', { type: 'batch', collections: [payments] });
    mainWindow.isDestroyed.mockReturnValue(true);
    child.emit('message', { type: 'done', locations: [] });

    expect(mainWindow.webContents.send.mock.calls).toEqual([
      ['main:collection-scan:batch', { scanId: 'scan-1', collections: [payments] }]
    ]);
  });

  it.each([
    ['navigates', 'did-navigate', [{}, 'http://localhost:3000/', 200, 'OK']],
    ['loses its renderer', 'render-process-gone', [{}, { reason: 'crashed', exitCode: 1 }]]
  ])('stops the scan when the window %s', async (_label, event, args) => {
    await startCollectionScan({ scanId: 'scan-1' });

    mainWindow.webContents.emit(event, ...args);

    expect(child.kill).toHaveBeenCalledTimes(1);
    child.emit('exit', 0);
    expect(mainWindow.webContents.send).not.toHaveBeenCalled();
  });

  it('cancels only the scan that is running', async () => {
    await startCollectionScan({ scanId: 'scan-1' });

    cancelCollectionScan({ scanId: 'scan-2' });
    cancelCollectionScan(undefined);
    expect(child.kill).not.toHaveBeenCalled();

    cancelCollectionScan({ scanId: 'scan-1' });
    expect(child.kill).toHaveBeenCalledTimes(1);
  });

  it('stops the running scan on quit', async () => {
    await startCollectionScan({ scanId: 'scan-1' });

    stopCollectionScan();

    expect(child.kill).toHaveBeenCalledTimes(1);
  });

  it('does nothing on quit before the scan IPC is registered', () => {
    jest.isolateModules(() => {
      const { stopCollectionScan: stopBeforeRegistering } = require('./collection-scan');

      expect(() => stopBeforeRegistering()).not.toThrow();
    });
  });
});
