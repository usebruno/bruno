const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const mockHost = {
  postMessage: jest.fn(),
  on: jest.fn(),
  kill: jest.fn()
};

jest.mock('electron', () => ({
  utilityProcess: {
    fork: jest.fn(() => mockHost)
  }
}));

const mockPrefs = { isFileCacheEnabled: false, isSearchIndexEnabled: false };
const mockSearchIndex = {
  entriesFor: jest.fn(() => new Map()),
  countRequestsInCollection: jest.fn(() => 0),
  rowsForCollection: jest.fn(() => []),
  foldersFor: jest.fn(() => []),
  transaction: (fn) => fn()
};

const mockJobs = [];
const mockPool = {
  run: jest.fn((type, args, options) => {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    mockJobs.push({ args, options, promise, resolve, reject });
    return promise;
  }),
  cancelQueued: jest.fn(() => 0),
  prioritize: jest.fn(() => 1)
};

jest.mock('../pool', () => ({
  getPool: () => mockPool,
  JobType: { ParseFile: 'parse-file' },
  JobPriority: { search: 1, index: 3, mount: 5 }
}));

jest.mock('../../store/preferences', () => ({
  preferencesUtil: {
    isFileCacheEnabled: () => mockPrefs.isFileCacheEnabled,
    isSearchIndexEnabled: () => mockPrefs.isSearchIndexEnabled
  }
}));

jest.mock('../mount/file-index', () => ({
  FileIndex: jest.fn()
}));

jest.mock('../search-index', () => ({
  getSearchIndex: () => mockSearchIndex
}));

const mockIngest = jest.fn();
jest.mock('../search-index/ingest', () => ({
  ingestParsedFile: (...args) => mockIngest(...args)
}));

jest.mock('../../cache/requestUids', () => ({
  getRequestUid: (pathname) => pathname
}));

const { SearchService } = require('./index');

// backfill does real fs I/O before queueing jobs, so wait on effects instead of a fixed number of ticks
const waitFor = async (assertion, { timeout = 2000 } = {}) => {
  const start = Date.now();
  for (;;) {
    try {
      return assertion();
    } catch (err) {
      if (Date.now() - start > timeout) throw err;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }
};

const hostMessage = (message) => {
  const [, listener] = mockHost.on.mock.calls.filter(([event]) => event === 'message').pop();
  listener(message);
};

const lastStatus = (onMessage) => onMessage.mock.calls.map(([message]) => message).filter((message) => message.type === 'status').pop();

describe('SearchService', () => {
  let collectionPath;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJobs.length = 0;
    mockPrefs.isSearchIndexEnabled = true;
    mockPrefs.isFileCacheEnabled = false;
    mockSearchIndex.entriesFor.mockReturnValue(new Map());
    mockSearchIndex.countRequestsInCollection.mockReturnValue(0);
    mockSearchIndex.rowsForCollection.mockReturnValue([]);
    mockSearchIndex.foldersFor.mockReturnValue([]);
    collectionPath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-search-'));
    fs.writeFileSync(path.join(collectionPath, 'hit.bru'), 'meta { name: Hit }');
    fs.writeFileSync(path.join(collectionPath, 'other.bru'), 'meta { name: Other }');
  });

  afterEach(() => {
    fs.rmSync(collectionPath, { recursive: true, force: true });
  });

  it('reports indexing while ripgrep runs for the active search', () => {
    const onMessage = jest.fn();
    const service = new SearchService();
    const id = service.search({ roots: ['/indexed', '/cold'], query: 'hit' }, onMessage);

    expect(lastStatus(onMessage)).toEqual({ type: 'status', id, indexing: true, matchCount: 0 });
    expect(mockHost.postMessage).toHaveBeenCalledWith({ type: 'search', id, roots: ['/indexed', '/cold'], query: 'hit' });

    hostMessage({ type: 'done', id });
    expect(lastStatus(onMessage)).toEqual({ type: 'status', id, indexing: false, matchCount: 0 });
  });

  it('ignores ripgrep messages from a superseded search', () => {
    const onMessage = jest.fn();
    const service = new SearchService();
    const first = service.search({ roots: ['/c'], query: 'a' }, onMessage);
    const second = service.search({ roots: ['/c'], query: 'ab' }, onMessage);
    onMessage.mockClear();

    hostMessage({ type: 'done', id: first });
    hostMessage({ type: 'batch', id: first, root: '/c', paths: ['a.bru'] });

    expect(onMessage).not.toHaveBeenCalled();
    expect(mockPool.run).not.toHaveBeenCalled();
    expect(second).toBe(first + 1);
  });

  it('backfills unindexed candidates at index priority and converges the match count', async () => {
    const hitStat = fs.statSync(path.join(collectionPath, 'hit.bru'), { bigint: true });
    mockSearchIndex.entriesFor.mockReturnValue(new Map([['hit.bru', { mtime: hitStat.mtimeNs, hash: 'h' }]]));
    const onMessage = jest.fn();
    const service = new SearchService();
    const id = service.search({ roots: [collectionPath], query: 'hit' }, onMessage);

    hostMessage({ type: 'batch', id, root: collectionPath, paths: ['hit.bru', 'other.bru'] });
    hostMessage({ type: 'done', id });
    expect(onMessage).toHaveBeenCalledWith({ type: 'batch', id, root: collectionPath, paths: ['hit.bru', 'other.bru'] });
    await waitFor(() => expect(mockPool.run).toHaveBeenCalledTimes(1));
    expect(mockJobs[0].args).toEqual(expect.objectContaining({ collectionPath, relativePath: 'other.bru', type: 'request' }));
    expect(mockJobs[0].options).toEqual({ priority: 3 });
    expect(lastStatus(onMessage)).toEqual(expect.objectContaining({ id, indexing: true }));

    mockSearchIndex.countRequestsInCollection.mockReturnValue(2);
    mockJobs[0].resolve({ relativePath: 'other.bru', mtime: 1n, hash: 'x', data: { name: 'Other hit' } });
    await waitFor(() => expect(mockIngest).toHaveBeenCalledWith(expect.objectContaining({
      collectionPath,
      result: expect.objectContaining({ relativePath: 'other.bru' })
    })));
    await waitFor(() => expect(lastStatus(onMessage)).toEqual({ type: 'status', id, indexing: false, matchCount: 2 }));
  });

  it('cancels only the previous search queued jobs when the query changes', async () => {
    const service = new SearchService();
    const id = service.search({ roots: [collectionPath], query: 'a' }, jest.fn());
    hostMessage({ type: 'batch', id, root: collectionPath, paths: ['hit.bru'] });
    await waitFor(() => expect(mockJobs).toHaveLength(1));

    service.search({ roots: [collectionPath], query: 'ab' }, jest.fn());
    expect(mockPool.cancelQueued).toHaveBeenCalledWith([mockJobs[0].promise]);

    mockJobs[0].resolve({ relativePath: 'hit.bru', mtime: 1n, hash: 'x', data: { name: 'Hit' } });
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(mockIngest).toHaveBeenCalledWith(expect.objectContaining({ result: expect.objectContaining({ relativePath: 'hit.bru' }) }));
  });

  it('promotes a queued backfill job to search priority instead of parsing it twice', async () => {
    const service = new SearchService();
    const id = service.search({ roots: [collectionPath], query: 'hit' }, jest.fn());
    hostMessage({ type: 'batch', id, root: collectionPath, paths: ['hit.bru'] });
    await waitFor(() => expect(mockJobs).toHaveLength(1));

    const windowPromise = service.resolveWindow({ id, collectionPath, relativePaths: ['hit.bru'] });
    await waitFor(() => expect(mockPool.prioritize).toHaveBeenCalledWith([mockJobs[0].promise], 1));
    expect(mockPool.run).toHaveBeenCalledTimes(1);

    mockJobs[0].resolve({ relativePath: 'hit.bru', mtime: 1n, hash: 'x', data: { name: 'Hit', type: 'http-request' } });
    const result = await windowPromise;
    expect(result.items).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'Hit' })]));
  });

  it('returns stale for a window whose search was superseded', async () => {
    const service = new SearchService();
    const id = service.search({ roots: [collectionPath], query: 'a' }, jest.fn());
    const windowPromise = service.resolveWindow({ id, collectionPath, relativePaths: ['hit.bru'] });
    await waitFor(() => expect(mockJobs).toHaveLength(1));
    service.search({ roots: [collectionPath], query: 'b' }, jest.fn());
    mockJobs[0].reject(new Error('cancelled'));

    await expect(windowPromise).resolves.toEqual({ stale: true });
    await expect(service.resolveWindow({ id, collectionPath, relativePaths: [] })).resolves.toEqual({ stale: true });
  });

  it('cancel stops ripgrep and cancels queued jobs', async () => {
    const service = new SearchService();
    service.search({ roots: [collectionPath], query: 'a' }, jest.fn());
    service.resolveWindow({ id: 1, collectionPath, relativePaths: ['hit.bru'] });
    await waitFor(() => expect(mockJobs).toHaveLength(1));
    service.cancel();

    expect(mockPool.cancelQueued).toHaveBeenCalledWith([mockJobs[0].promise]);
    expect(mockHost.postMessage).toHaveBeenCalledWith({ type: 'cancel' });
  });

  it('hydrates resolveWindow from search_index rows without parsing indexed paths', async () => {
    mockSearchIndex.rowsForCollection.mockReturnValue([{
      requestPath: 'hit.bru',
      requestName: 'Hit',
      requestProtocol: 'http-request',
      requestSeq: 1,
      requestType: 'GET',
      requestUrl: 'https://example.com/hit'
    }]);

    const service = new SearchService();
    const id = service.search({ roots: ['/c'], query: 'hit' }, () => {});
    const result = await service.resolveWindow({ id, collectionPath: '/c', relativePaths: ['hit.bru'] });

    expect(result.stale).toBeFalsy();
    expect(result.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Hit', type: 'http-request' })
    ]));
    expect(mockPool.run).not.toHaveBeenCalled();
  });
});
