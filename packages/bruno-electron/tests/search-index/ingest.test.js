const { ingestParsedFile, removeFromSearchIndex } = require('../../src/services/search-index/ingest');

const makeSearchIndex = () => {
  const rows = new Map();
  let revision = 0;
  return {
    get revision() {
      return revision;
    },
    collectionNameFor: () => 'Collection',
    upsert: (entry) => {
      const prior = rows.get(entry.requestPath);
      if (prior && prior.mtime > entry.mtime) return false;
      if (prior && prior.mtime === entry.mtime && prior.hash === entry.hash) return false;
      rows.set(entry.requestPath, { mtime: entry.mtime, hash: entry.hash, name: entry.requestName });
      revision += 1;
      return true;
    },
    upsertMeta: () => false,
    remove: (collectionPath, requestPath) => {
      if (!rows.has(requestPath)) return false;
      rows.delete(requestPath);
      revision += 1;
      return true;
    },
    removeMeta: () => false,
    get: (requestPath) => rows.get(requestPath)
  };
};

describe('search-index ingest', () => {
  it('skips stale bulk writes when a newer row exists', () => {
    const searchIndex = makeSearchIndex();
    const ctx = {
      searchIndex,
      fileIndex: null,
      collectionPath: '/tmp/collection',
      collectionName: 'Collection',
      workspacePath: '/tmp/workspace'
    };

    ingestParsedFile({
      ...ctx,
      result: {
        relativePath: 'req.bru',
        mtime: 200n,
        hash: 'new',
        data: { name: 'New', type: 'http-request', request: { method: 'GET', url: '/' } }
      }
    });

    const stale = ingestParsedFile({
      ...ctx,
      result: {
        relativePath: 'req.bru',
        mtime: 100n,
        hash: 'old',
        data: { name: 'Old', type: 'http-request', request: { method: 'GET', url: '/' } }
      }
    });

    expect(stale).toBe(false);
    expect(searchIndex.get('req.bru').name).toBe('New');
  });

  it('does not rewrite unchanged entries', () => {
    const searchIndex = makeSearchIndex();
    const ctx = {
      searchIndex,
      fileIndex: null,
      collectionPath: '/tmp/collection',
      collectionName: 'Collection',
      workspacePath: null
    };
    const result = {
      relativePath: 'req.bru',
      mtime: 10n,
      hash: 'h1',
      data: { name: 'One', type: 'http-request', request: { method: 'GET', url: '/' } }
    };
    ingestParsedFile({ ...ctx, result });
    const revision = searchIndex.revision;
    const changed = ingestParsedFile({ ...ctx, result: { ...result } });
    expect(changed).toBe(false);
    expect(searchIndex.revision).toBe(revision);
  });

  it('removes request rows', () => {
    const searchIndex = makeSearchIndex();
    ingestParsedFile({
      searchIndex,
      fileIndex: null,
      collectionPath: '/tmp/collection',
      collectionName: 'Collection',
      workspacePath: null,
      result: {
        relativePath: 'req.bru',
        mtime: 1n,
        hash: 'h',
        data: { name: 'One', type: 'http-request', request: { method: 'GET', url: '/' } }
      }
    });
    expect(removeFromSearchIndex({ searchIndex, collectionPath: '/tmp/collection', relativePath: 'req.bru' })).toBe(true);
    expect(searchIndex.get('req.bru')).toBeUndefined();
  });
});
