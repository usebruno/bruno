jest.mock('electron', () => ({ ipcMain: { handle: jest.fn() } }));

const mockIndexCollection = jest.fn(async () => {});
const mockSearch = jest.fn(() => [{
  id: 'r1',
  name: 'Get Users',
  method: 'GET',
  url: 'https://api.test/users',
  request_path: '/c1/users/get.bru',
  folder_path: 'users',
  collection_uid: 'c1',
  collection_path: '/c1',
  collection_name: 'One'
}]);
const mockGetFolderTree = jest.fn(() => []);
jest.mock('../services/search-index/indexer', () => ({
  indexCollection: (...args) => mockIndexCollection(...args),
  getSearchIndex: () => ({ search: (...args) => mockSearch(...args), getFolderTree: (...args) => mockGetFolderTree(...args) })
}));
jest.mock('../cache/requestUids', () => ({
  getRequestUid: (pathname) => `uid-for-${pathname}`
}));

const mockEnsureWatching = jest.fn();
jest.mock('../services/search-index/watcher', () => ({
  ensureWatching: (...args) => mockEnsureWatching(...args)
}));

const mockBuildFolderTree = jest.fn(() => [{ uid: 'req-1', name: 'Get Users', type: 'http-request' }]);
jest.mock('../services/search-index/build-tree', () => ({
  buildFolderTree: (...args) => mockBuildFolderTree(...args)
}));

const { searchIndex, warmSearchIndex, getCollectionTree, indexedCollections } = require('./search-index');

const expectedResult = [{
  uid: 'uid-for-/c1/users/get.bru',
  name: 'Get Users',
  method: 'GET',
  url: 'https://api.test/users',
  pathname: '/c1/users/get.bru',
  folderPath: 'users',
  collectionUid: 'c1',
  collectionName: 'One'
}];

beforeEach(() => {
  indexedCollections.clear();
  mockIndexCollection.mockClear();
  mockSearch.mockClear();
  mockEnsureWatching.mockClear();
  mockGetFolderTree.mockClear();
  mockBuildFolderTree.mockClear();
});

describe('searchIndex handler', () => {
  it('indexes each collection once and then searches across all of them', async () => {
    const collections = [
      { uid: 'c1', pathname: '/c1', name: 'One' },
      { uid: 'c2', pathname: '/c2', name: 'Two' }
    ];

    const results = await searchIndex(null, { collections, terms: ['users'], limit: 10 });

    expect(mockIndexCollection).toHaveBeenCalledTimes(2);
    expect(mockSearch).toHaveBeenCalledWith({ terms: ['users'], collectionPaths: ['/c1', '/c2'], limit: 10 });
    expect(results).toEqual(expectedResult);
  });

  it('does not re-index a collection already indexed this session', async () => {
    const collections = [{ uid: 'c1', pathname: '/c1', name: 'One' }];
    await searchIndex(null, { collections, terms: ['a'] });

    await searchIndex(null, { collections, terms: ['b'] });

    expect(mockIndexCollection).toHaveBeenCalledTimes(1);
  });

  it('does not let one collection failing to index block searching the rest', async () => {
    mockIndexCollection.mockImplementationOnce(async () => { throw new Error('boom'); });
    const collections = [
      { uid: 'c1', pathname: '/c1', name: 'One' },
      { uid: 'c2', pathname: '/c2', name: 'Two' }
    ];

    const results = await searchIndex(null, { collections, terms: ['users'] });

    expect(results).toEqual(expectedResult);
    expect(indexedCollections.has('/c2')).toBe(true);
    expect(indexedCollections.has('/c1')).toBe(false);
  });

  it('skips collections with no pathname', async () => {
    const results = await searchIndex(null, { collections: [{ uid: 'c1' }], terms: ['x'] });

    expect(mockIndexCollection).not.toHaveBeenCalled();
    expect(mockSearch).toHaveBeenCalledWith({ terms: ['x'], collectionPaths: [], limit: undefined });
    expect(results).toEqual(expectedResult);
  });

  it('starts watching each collection once it is indexed', async () => {
    await searchIndex(null, { collections: [{ uid: 'c1', pathname: '/c1', name: 'One', ignore: ['dist'] }], terms: ['x'] });

    expect(mockEnsureWatching).toHaveBeenCalledWith({
      collectionPath: '/c1',
      collectionUid: 'c1',
      collectionName: 'One',
      denylist: ['dist']
    });
  });
});

describe('warmSearchIndex handler', () => {
  it('indexes every collection without running a search', async () => {
    const collections = [
      { uid: 'c1', pathname: '/c1', name: 'One' },
      { uid: 'c2', pathname: '/c2', name: 'Two' }
    ];

    await warmSearchIndex(null, { collections });

    expect(mockIndexCollection).toHaveBeenCalledTimes(2);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('does not re-index a collection the search handler already indexed this session', async () => {
    await searchIndex(null, { collections: [{ uid: 'c1', pathname: '/c1', name: 'One' }], terms: ['a'] });
    mockIndexCollection.mockClear();

    await warmSearchIndex(null, { collections: [{ uid: 'c1', pathname: '/c1', name: 'One' }] });

    expect(mockIndexCollection).not.toHaveBeenCalled();
  });
});

describe('getCollectionTree handler', () => {
  it('indexes the collection, then builds its tree from the index rows', async () => {
    const collection = { uid: 'c1', pathname: '/c1', name: 'One', ignore: ['dist'] };

    const result = await getCollectionTree(null, { collection });

    expect(mockIndexCollection).toHaveBeenCalledWith(expect.objectContaining({ collectionPath: '/c1' }));
    expect(mockGetFolderTree).toHaveBeenCalledWith('/c1');
    expect(mockBuildFolderTree).toHaveBeenCalledWith('/c1', []);
    expect(result).toEqual({ items: [{ uid: 'req-1', name: 'Get Users', type: 'http-request' }] });
  });

  it('returns an empty tree without touching the index when the collection has no pathname', async () => {
    const result = await getCollectionTree(null, { collection: { uid: 'c1' } });

    expect(mockIndexCollection).not.toHaveBeenCalled();
    expect(mockBuildFolderTree).not.toHaveBeenCalled();
    expect(result).toEqual({ items: [] });
  });
});
