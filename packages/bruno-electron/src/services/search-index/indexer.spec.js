const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const mockUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-search-index-userdata-'));
jest.mock('electron', () => ({
  app: { getPath: jest.fn(() => mockUserDataDir) }
}));

const mockRun = jest.fn(async (type, args) => {
  if (args.relativePath.endsWith('get.bru')) {
    return { data: { name: 'Get Users', request: { method: 'GET', url: 'https://api.test/users' } } };
  }
  return { data: { name: path.basename(args.relativePath, '.bru') } };
});
jest.mock('../pool', () => ({
  JobType: { ParseFile: 'parse-file' },
  getPool: () => ({ run: mockRun })
}));

const { indexCollection, getSearchIndex } = require('./indexer');

const makeCollection = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-search-index-collection-'));
  fs.mkdirSync(path.join(dir, 'users'));
  fs.writeFileSync(path.join(dir, 'users', 'get.bru'), 'meta {\n  name: Get Users\n  type: http\n  seq: 1\n}\n\nget {\n  url: https://api.test/users\n}\n');
  fs.writeFileSync(path.join(dir, 'users', 'folder.bru'), 'meta {\n  name: Users\n  seq: 1\n}\n');
  return dir;
};

afterEach(() => {
  mockRun.mockClear();
});

describe('indexCollection', () => {
  it('indexes request files and makes them searchable', async () => {
    const collectionPath = makeCollection();

    await indexCollection({ collectionPath, collectionUid: 'col-1', collectionName: 'My Collection' });

    const results = getSearchIndex().search({ terms: ['users'], collectionPaths: [collectionPath] });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Get Users');
    expect(results[0].method).toBe('GET');
  });

  it('does not index folder.bru as a searchable request', async () => {
    const collectionPath = makeCollection();

    await indexCollection({ collectionPath, collectionUid: 'col-1', collectionName: 'My Collection' });

    expect(mockRun).toHaveBeenCalledTimes(1);
    expect(mockRun).toHaveBeenCalledWith('parse-file', expect.objectContaining({ relativePath: path.join('users', 'get.bru') }));
  });

  it('does not re-index or re-parse a file that has not changed', async () => {
    const collectionPath = makeCollection();
    await indexCollection({ collectionPath, collectionUid: 'col-1', collectionName: 'My Collection' });
    mockRun.mockClear();

    const result = await indexCollection({ collectionPath, collectionUid: 'col-1', collectionName: 'My Collection' });

    expect(result).toEqual({ indexed: 0, removed: 0 });
    expect(mockRun).not.toHaveBeenCalled();
  });

  it('removes a row once its file is deleted from disk', async () => {
    const collectionPath = makeCollection();
    await indexCollection({ collectionPath, collectionUid: 'col-1', collectionName: 'My Collection' });
    fs.unlinkSync(path.join(collectionPath, 'users', 'get.bru'));

    await indexCollection({ collectionPath, collectionUid: 'col-1', collectionName: 'My Collection' });

    expect(getSearchIndex().search({ terms: ['users'], collectionPaths: [collectionPath] })).toHaveLength(0);
  });

  it('re-indexes a file after its content changes', async () => {
    const collectionPath = makeCollection();
    await indexCollection({ collectionPath, collectionUid: 'col-1', collectionName: 'My Collection' });

    const getBruPath = path.join(collectionPath, 'users', 'get.bru');
    fs.writeFileSync(getBruPath, 'meta {\n  name: Fetch Users V2\n  type: http\n  seq: 1\n}\n\nget {\n  url: https://api.test/users\n}\n');
    const bumped = new Date(fs.statSync(getBruPath).mtime.getTime() + 1000);
    fs.utimesSync(getBruPath, bumped, bumped);
    mockRun.mockImplementationOnce(async () => ({
      data: { name: 'Fetch Users V2', request: { method: 'GET', url: 'https://api.test/users' } }
    }));

    await indexCollection({ collectionPath, collectionUid: 'col-1', collectionName: 'My Collection' });

    const results = getSearchIndex().search({ terms: ['fetch'], collectionPaths: [collectionPath] });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Fetch Users V2');
  });
});
