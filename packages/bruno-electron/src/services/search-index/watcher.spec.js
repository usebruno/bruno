const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const mockUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-search-index-watch-userdata-'));
jest.mock('electron', () => ({
  app: { getPath: jest.fn(() => mockUserDataDir) }
}));

const mockRun = jest.fn(async (type, args) => ({
  data: { name: path.basename(args.relativePath, '.bru'), request: { method: 'GET', url: 'https://x.test' } }
}));
jest.mock('../pool', () => ({
  JobType: { ParseFile: 'parse-file' },
  getPool: () => ({ run: mockRun })
}));

const { ensureWatching, closeAll } = require('./watcher');
const { getSearchIndex } = require('./indexer');

const makeCollection = () => fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-search-index-watch-collection-'));

const waitFor = async (assertion, { timeout = 2000, interval = 20 } = {}) => {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeout) {
    try {
      assertion();
      return;
    } catch (err) {
      lastError = err;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }
  throw lastError;
};

afterEach(async () => {
  await closeAll();
});

const startWatching = async (options) => {
  const watcher = ensureWatching(options);
  await new Promise((resolve) => watcher.once('ready', resolve));
  return watcher;
};

describe('search-index watcher', () => {
  it('adds a row when a request file is created after watching starts', async () => {
    const collectionPath = makeCollection();
    await startWatching({ collectionPath, collectionUid: 'col-1', collectionName: 'One' });

    fs.writeFileSync(path.join(collectionPath, 'get.bru'), 'meta {\n  name: Get\n  type: http\n  seq: 1\n}\n\nget {\n  url: https://x.test\n}\n');

    await waitFor(() => {
      const results = getSearchIndex().search({ terms: ['get'], collectionPaths: [collectionPath] });
      expect(results).toHaveLength(1);
    });
  });

  it('does not index a folder.bru file', async () => {
    const collectionPath = makeCollection();
    await startWatching({ collectionPath, collectionUid: 'col-1', collectionName: 'One' });

    fs.writeFileSync(path.join(collectionPath, 'folder.bru'), 'meta {\n  name: Folder\n  seq: 1\n}\n');
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(getSearchIndex().search({ terms: ['folder'], collectionPaths: [collectionPath] })).toHaveLength(0);
  });

  it('updates the row when the file changes', async () => {
    const collectionPath = makeCollection();
    const filePath = path.join(collectionPath, 'get.bru');
    await startWatching({ collectionPath, collectionUid: 'col-1', collectionName: 'One' });
    fs.writeFileSync(filePath, 'meta {\n  name: Get\n  type: http\n  seq: 1\n}\n\nget {\n  url: https://x.test\n}\n');
    await waitFor(() => {
      expect(getSearchIndex().search({ terms: ['get'], collectionPaths: [collectionPath] })).toHaveLength(1);
    });

    mockRun.mockResolvedValueOnce({ data: { name: 'Fetch V2', request: { method: 'GET', url: 'https://x.test' } } });
    fs.writeFileSync(filePath, 'meta {\n  name: Fetch V2\n  type: http\n  seq: 1\n}\n\nget {\n  url: https://x.test\n}\n');

    await waitFor(() => {
      const results = getSearchIndex().search({ terms: ['fetch'], collectionPaths: [collectionPath] });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Fetch V2');
    });
  });

  it('removes the row when the file is deleted', async () => {
    const collectionPath = makeCollection();
    const filePath = path.join(collectionPath, 'get.bru');
    await startWatching({ collectionPath, collectionUid: 'col-1', collectionName: 'One' });
    fs.writeFileSync(filePath, 'meta {\n  name: Get\n  type: http\n  seq: 1\n}\n\nget {\n  url: https://x.test\n}\n');
    await waitFor(() => {
      expect(getSearchIndex().search({ terms: ['get'], collectionPaths: [collectionPath] })).toHaveLength(1);
    });

    fs.unlinkSync(filePath);

    await waitFor(() => {
      expect(getSearchIndex().search({ terms: ['get'], collectionPaths: [collectionPath] })).toHaveLength(0);
    });
  });

  it('does not start a second watcher for the same collection', () => {
    const collectionPath = makeCollection();
    ensureWatching({ collectionPath, collectionUid: 'col-1', collectionName: 'One' });
    const chokidar = require('chokidar');
    const watchSpy = jest.spyOn(chokidar, 'watch');

    ensureWatching({ collectionPath, collectionUid: 'col-1', collectionName: 'One' });

    expect(watchSpy).not.toHaveBeenCalled();
    watchSpy.mockRestore();
  });
});
