const path = require('node:path');
const { EventEmitter } = require('node:events');

jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn() }
}));
jest.mock('../services/transient', () => ({
  transientManager: { getRootDirectory: () => '/app-data/tmp/transient' }
}));
jest.mock('../services/collection-search/find-in-folders', () => ({
  findCollectionsInFolders: jest.fn()
}));

const { ipcMain } = require('electron');
const { findCollectionsInFolders } = require('../services/collection-search/find-in-folders');
const { findInFolders, cancelSearch, registerCollectionSearchIpc } = require('./collection-search');

const pickedFolder = path.resolve('picked');

const waitForAbort = (signal) =>
  new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason));
  });

describe('collection search IPC', () => {
  let sender;

  beforeEach(() => {
    jest.clearAllMocks();
    sender = new EventEmitter();
  });

  it('registers the search and cancel channels', () => {
    registerCollectionSearchIpc();

    expect(ipcMain.handle.mock.calls.map(([channel]) => channel)).toEqual([
      'renderer:collection-search:find-in-folders',
      'renderer:collection-search:cancel'
    ]);
  });

  it('searches the picked folders and leaves out the transient folder', async () => {
    const result = { folders: [], collections: [], brokenCollectionPaths: [], unreadableFolderCount: 0, stoppedEarly: false };
    findCollectionsInFolders.mockResolvedValue(result);

    await expect(findInFolders({ requestId: 'search-1', paths: [pickedFolder] }, sender)).resolves.toBe(result);
    expect(findCollectionsInFolders).toHaveBeenCalledWith([pickedFolder], {
      signal: expect.any(AbortSignal),
      excludedFolders: ['/app-data/tmp/transient']
    });
  });

  it.each([
    ['no request', undefined],
    ['no request id', { paths: [pickedFolder] }],
    ['a request id that is not a string', { requestId: 7, paths: [pickedFolder] }],
    ['an overlong request id', { requestId: 'x'.repeat(101), paths: [pickedFolder] }],
    ['no folders', { requestId: 'search-1', paths: [] }],
    ['folders that are not a list', { requestId: 'search-1', paths: pickedFolder }],
    ['a relative folder', { requestId: 'search-1', paths: ['picked'] }],
    ['a folder that is not a string', { requestId: 'search-1', paths: [42] }],
    ['too many folders', { requestId: 'search-1', paths: Array.from({ length: 1001 }, () => pickedFolder) }]
  ])('rejects a request with %s', async (_label, request) => {
    await expect(findInFolders(request, sender)).rejects.toThrow('A folder search needs');
    expect(findCollectionsInFolders).not.toHaveBeenCalled();
  });

  it('resolves with nothing when the search is cancelled', async () => {
    findCollectionsInFolders.mockImplementation((_paths, { signal }) => waitForAbort(signal));

    const search = findInFolders({ requestId: 'search-2', paths: [pickedFolder] }, sender);
    cancelSearch({ requestId: 'search-2' });

    await expect(search).resolves.toBeNull();
  });

  it.each([
    ['reloads', 'did-navigate'],
    ['crashes', 'render-process-gone'],
    ['closes', 'destroyed']
  ])('resolves with nothing when the window %s during the search', async (_label, eventName) => {
    findCollectionsInFolders.mockImplementation((_paths, { signal }) => waitForAbort(signal));

    const search = findInFolders({ requestId: 'search-6', paths: [pickedFolder] }, sender);
    sender.emit(eventName);

    await expect(search).resolves.toBeNull();
  });

  it('stops listening to the window once the search has ended', async () => {
    findCollectionsInFolders.mockResolvedValue({ folders: [] });

    await findInFolders({ requestId: 'search-7', paths: [pickedFolder] }, sender);

    expect(sender.eventNames()).toEqual([]);
  });

  it('ties a search to the window that asked for it', async () => {
    findCollectionsInFolders.mockImplementation((_paths, { signal }) => waitForAbort(signal));
    registerCollectionSearchIpc();
    const [, handleSearch] = ipcMain.handle.mock.calls.find(([channel]) => channel === 'renderer:collection-search:find-in-folders');

    const search = handleSearch({ sender }, { requestId: 'search-8', paths: [pickedFolder] });
    sender.emit('did-navigate');

    await expect(search).resolves.toBeNull();
  });

  it('refuses a second search with an id that is still running', async () => {
    findCollectionsInFolders.mockImplementation((_paths, { signal }) => waitForAbort(signal));

    const first = findInFolders({ requestId: 'search-3', paths: [pickedFolder] }, sender);
    await expect(findInFolders({ requestId: 'search-3', paths: [pickedFolder] }, sender)).rejects.toThrow('already running');

    cancelSearch({ requestId: 'search-3' });
    await expect(first).resolves.toBeNull();
  });

  it('lets an id be used again once its search has ended', async () => {
    findCollectionsInFolders.mockResolvedValue({ folders: [] });

    await findInFolders({ requestId: 'search-4', paths: [pickedFolder] }, sender);

    await expect(findInFolders({ requestId: 'search-4', paths: [pickedFolder] }, sender)).resolves.toEqual({ folders: [] });
  });

  it('ignores a cancel for a search that is not running', () => {
    expect(() => cancelSearch({ requestId: 'unknown' })).not.toThrow();
    expect(() => cancelSearch(undefined)).not.toThrow();
  });

  it('passes on errors that are not a cancel', async () => {
    findCollectionsInFolders.mockRejectedValue(new Error('disk failure'));

    await expect(findInFolders({ requestId: 'search-5', paths: [pickedFolder] }, sender)).rejects.toThrow('disk failure');
  });
});
