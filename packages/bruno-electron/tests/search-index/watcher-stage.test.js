const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

jest.mock('../../src/store/preferences', () => ({
  preferencesUtil: { isSearchIndexEnabled: jest.fn(() => true) }
}));

jest.mock('../../src/utils/mount', () => ({
  hashFile: jest.fn(() => 'hash-1')
}));

const mockIngest = jest.fn();
const mockRemove = jest.fn();
jest.mock('../../src/services/search-index/ingest', () => ({
  ingestParsedFile: (...args) => mockIngest(...args),
  removeFromSearchIndex: (...args) => mockRemove(...args)
}));

const mockSearchIndex = { id: 'index' };
jest.mock('../../src/services/search-index', () => ({
  getSearchIndex: () => mockSearchIndex
}));

const { preferencesUtil } = require('../../src/store/preferences');
const { stageParsedToSearchIndex, removeFromSearchIndexPath } = require('../../src/services/search-index/watcher-stage');

describe('watcher-stage search index', () => {
  let collectionPath;
  let requestPath;

  beforeEach(() => {
    jest.clearAllMocks();
    preferencesUtil.isSearchIndexEnabled.mockReturnValue(true);
    collectionPath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-watcher-'));
    requestPath = path.join(collectionPath, 'req.bru');
    fs.writeFileSync(requestPath, 'meta { name: Test }');
    jest.spyOn(fs, 'statSync').mockReturnValue({ mtimeNs: 100n });
  });

  afterEach(() => {
    fs.rmSync(collectionPath, { recursive: true, force: true });
    fs.statSync.mockRestore?.();
  });

  it('ingests parsed watcher data into search_index', () => {
    stageParsedToSearchIndex(collectionPath, requestPath, {
      name: 'Test',
      type: 'http-request',
      request: { method: 'GET', url: 'https://example.com' }
    });

    expect(mockIngest).toHaveBeenCalledWith(expect.objectContaining({
      searchIndex: mockSearchIndex,
      collectionPath,
      result: expect.objectContaining({
        relativePath: 'req.bru',
        mtime: 100n,
        hash: 'hash-1'
      })
    }));
  });

  it('removes search_index rows on unlink', () => {
    removeFromSearchIndexPath(collectionPath, requestPath);
    expect(mockRemove).toHaveBeenCalledWith({
      searchIndex: mockSearchIndex,
      collectionPath,
      relativePath: 'req.bru'
    });
  });
});
