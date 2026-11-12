const path = require('node:path');

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
  beforeEach(() => {
    jest.clearAllMocks();
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

    await expect(findInFolders({ requestId: 'search-1', paths: [pickedFolder] })).resolves.toBe(result);
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
    await expect(findInFolders(request)).rejects.toThrow('A folder search needs');
    expect(findCollectionsInFolders).not.toHaveBeenCalled();
  });

  it('resolves with nothing when the search is cancelled', async () => {
    findCollectionsInFolders.mockImplementation((_paths, { signal }) => waitForAbort(signal));

    const search = findInFolders({ requestId: 'search-2', paths: [pickedFolder] });
    cancelSearch({ requestId: 'search-2' });

    await expect(search).resolves.toBeNull();
  });

  it('refuses a second search with an id that is still running', async () => {
    findCollectionsInFolders.mockImplementation((_paths, { signal }) => waitForAbort(signal));

    const first = findInFolders({ requestId: 'search-3', paths: [pickedFolder] });
    await expect(findInFolders({ requestId: 'search-3', paths: [pickedFolder] })).rejects.toThrow('already running');

    cancelSearch({ requestId: 'search-3' });
    await expect(first).resolves.toBeNull();
  });

  it('lets an id be used again once its search has ended', async () => {
    findCollectionsInFolders.mockResolvedValue({ folders: [] });

    await findInFolders({ requestId: 'search-4', paths: [pickedFolder] });

    await expect(findInFolders({ requestId: 'search-4', paths: [pickedFolder] })).resolves.toEqual({ folders: [] });
  });

  it('ignores a cancel for a search that is not running', () => {
    expect(() => cancelSearch({ requestId: 'unknown' })).not.toThrow();
    expect(() => cancelSearch(undefined)).not.toThrow();
  });

  it('passes on errors that are not a cancel', async () => {
    findCollectionsInFolders.mockRejectedValue(new Error('disk failure'));

    await expect(findInFolders({ requestId: 'search-5', paths: [pickedFolder] })).rejects.toThrow('disk failure');
  });
});
