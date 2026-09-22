const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { SearchIndex } = require('./index');

const makeIndex = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-search-index-'));
  return new SearchIndex({ dbPath: path.join(dir, 'search-index.db') });
};

const row = (overrides = {}) => ({
  relativePath: 'users/get.bru',
  absolutePath: '/c/users/get.bru',
  name: 'Get Users',
  method: 'GET',
  url: 'https://api.test/users',
  collectionUid: 'col-1',
  collectionName: 'My Collection',
  mtime: 1n,
  hash: 'h1',
  ...overrides
});

describe('SearchIndex', () => {
  it('finds a request by a substring of its name', () => {
    const index = makeIndex();
    index.apply('/c', { upsert: [row()] });

    const results = index.search({ terms: ['user'], collectionPaths: ['/c'] });

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Get Users');
    index.close();
  });

  it('matches camelCase-style substrings the way .includes() does', () => {
    const index = makeIndex();
    index.apply('/c', { upsert: [row({ relativePath: 'up.bru', absolutePath: '/c/up.bru', name: 'UserProfile' })] });

    const results = index.search({ terms: ['profile'], collectionPaths: ['/c'] });

    expect(results).toHaveLength(1);
    index.close();
  });

  it('requires every term to match, possibly in different fields', () => {
    const index = makeIndex();
    index.apply('/c', { upsert: [row()] });

    expect(index.search({ terms: ['get', 'users'], collectionPaths: ['/c'] })).toHaveLength(1);
    expect(index.search({ terms: ['get', 'orders'], collectionPaths: ['/c'] })).toHaveLength(0);
    index.close();
  });

  it('matches on url as well as name', () => {
    const index = makeIndex();
    index.apply('/c', { upsert: [row()] });

    const results = index.search({ terms: ['api.test'], collectionPaths: ['/c'] });

    expect(results).toHaveLength(1);
    index.close();
  });

  it('treats % and _ in the query as literal characters, not wildcards', () => {
    const index = makeIndex();
    index.apply('/c', { upsert: [row({ name: '100% Done' })] });

    expect(index.search({ terms: ['100% done'], collectionPaths: ['/c'] })).toHaveLength(1);
    expect(index.search({ terms: ['100x done'], collectionPaths: ['/c'] })).toHaveLength(0);
    index.close();
  });

  it('scopes results to the requested collections only', () => {
    const index = makeIndex();
    index.apply('/c1', { upsert: [row({ absolutePath: '/c1/users/get.bru' })] });
    index.apply('/c2', { upsert: [row({ absolutePath: '/c2/users/get.bru' })] });

    expect(index.search({ terms: ['users'], collectionPaths: ['/c1'] })).toHaveLength(1);
    expect(index.search({ terms: ['users'], collectionPaths: ['/c1', '/c2'] })).toHaveLength(2);
    index.close();
  });

  it('bounds the result count', () => {
    const index = makeIndex();
    const rows = Array.from({ length: 10 }, (_, i) => row({
      relativePath: `r${i}.bru`,
      absolutePath: `/c/r${i}.bru`,
      name: `Request ${i}`
    }));
    index.apply('/c', { upsert: rows });

    expect(index.search({ terms: ['request'], collectionPaths: ['/c'], limit: 3 })).toHaveLength(3);
    index.close();
  });

  it('updates an existing row on re-index rather than duplicating it', () => {
    const index = makeIndex();
    index.apply('/c', { upsert: [row()] });
    index.apply('/c', { upsert: [row({ name: 'Fetch Users V2', mtime: 2n, hash: 'h2' })] });

    const results = index.search({ terms: ['users'], collectionPaths: ['/c'] });

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Fetch Users V2');
    index.close();
  });

  it('removes a row by id', () => {
    const index = makeIndex();
    index.apply('/c', { upsert: [row()] });
    const [{ id }] = index.search({ terms: ['users'], collectionPaths: ['/c'] });

    index.apply('/c', { removeIds: [id] });

    expect(index.search({ terms: ['users'], collectionPaths: ['/c'] })).toHaveLength(0);
    index.close();
  });

  describe('getFolderTree', () => {
    const folderRow = (overrides = {}) => row({
      relativePath: 'users/folder.bru',
      absolutePath: '/c/users/folder.bru',
      itemPath: 'users',
      type: 'folder',
      seq: 2,
      name: 'Users',
      method: null,
      url: null,
      ...overrides
    });

    it('returns seq as a plain Number, not the BigInt the underlying connection reads by default', () => {
      const index = makeIndex();
      index.apply('/c', { upsert: [folderRow()] });

      const [folder] = index.getFolderTree('/c');

      expect(folder.seq).toBe(2);
      expect(typeof folder.seq).toBe('number');
      index.close();
    });

    it('leaves seq as null for a folder/request that never set one', () => {
      const index = makeIndex();
      index.apply('/c', { upsert: [folderRow({ seq: null })] });

      const [folder] = index.getFolderTree('/c');

      expect(folder.seq).toBeNull();
      index.close();
    });
  });

  it('status reports every file as added against an empty index', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-search-index-collection-'));
    fs.mkdirSync(path.join(dir, 'users'));
    fs.writeFileSync(path.join(dir, 'users', 'get.bru'), 'meta { name: Get }');

    const index = makeIndex();
    const { added, updated, removed } = await index.status(dir);

    expect(added).toHaveLength(1);
    expect(added[0].relativePath).toBe(path.join('users', 'get.bru'));
    expect(updated).toHaveLength(0);
    expect(removed).toHaveLength(0);
    index.close();
  });

  it('status reports nothing changed once the file is indexed and untouched', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-search-index-collection-'));
    fs.writeFileSync(path.join(dir, 'get.bru'), 'meta { name: Get }');

    const index = makeIndex();
    const first = await index.status(dir);
    index.apply(dir, {
      upsert: first.added.map((entry) => ({
        ...entry,
        name: 'Get',
        method: 'GET',
        url: '',
        collectionUid: 'col-1',
        collectionName: 'C'
      }))
    });

    const second = await index.status(dir);

    expect(second.added).toHaveLength(0);
    expect(second.updated).toHaveLength(0);
    expect(second.removed).toHaveLength(0);
    index.close();
  });
});
