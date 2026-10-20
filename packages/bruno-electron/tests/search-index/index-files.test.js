const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

jest.mock('../../src/services/pool', () => ({
  JobType: { ParseFile: 'ParseFile' },
  getPool: () => ({
    runOnce: async (_type, { relativePath }) => ({
      relativePath,
      mtime: 2n,
      hash: `${relativePath}-hash`,
      data: {
        meta: { name: String(relativePath).replace(/\.bru$/, ''), type: 'http', seq: 1 },
        http: { method: 'get', url: `https://example.com/${relativePath}` }
      }
    })
  })
}));

const { indexFiles } = require('../../src/services/search-index/indexer');

const makeSearchIndex = () => {
  const requests = new Map();
  let revision = 0;
  return {
    get revision() {
      return revision;
    },
    collectionNameFor: () => 'Col',
    entriesFor: () => requests,
    metaEntriesFor: () => new Map(),
    addFolders: () => {},
    upsert: (entry) => {
      requests.set(entry.requestPath, {
        mtime: entry.mtime,
        hash: entry.hash,
        name: entry.requestName
      });
      revision += 1;
      return true;
    },
    upsertMeta: () => {
      revision += 1;
      return true;
    },
    remove: (collectionPath, requestPath) => {
      if (!requests.has(requestPath)) return false;
      requests.delete(requestPath);
      revision += 1;
      return true;
    }
  };
};

const writeCollection = (root, name) => {
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, 'bruno.json'), JSON.stringify({ version: '1', name, type: 'collection' }));
};

const writeRequest = (root, fileName, requestName) => {
  fs.writeFileSync(
    path.join(root, fileName),
    `meta {\n  name: ${requestName}\n  type: http\n  seq: 1\n}\n\nget {\n  url: https://example.com/${requestName}\n}\n`
  );
};

describe('indexFiles', () => {
  it('indexes hit requests without removing unrelated rows', async () => {
    const collectionPath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-index-files-'));
    writeCollection(collectionPath, 'Col');
    writeRequest(collectionPath, 'keep.bru', 'keep');
    writeRequest(collectionPath, 'hit.bru', 'hit');

    const searchIndex = makeSearchIndex();
    searchIndex.upsert({
      collectionPath,
      collectionName: 'Col',
      requestPath: 'keep.bru',
      requestName: 'keep',
      requestType: 'GET',
      requestUrl: 'https://example.com/keep',
      requestProtocol: 'http-request',
      requestSeq: 1,
      mtime: 1n,
      hash: 'keep-hash'
    });

    await indexFiles(searchIndex, {
      collectionPath,
      collectionName: 'Col',
      relativePaths: ['hit.bru'],
      workspacePath: null,
      fileIndex: null,
      onWrite: () => {}
    });

    const rows = searchIndex.entriesFor();
    expect(rows.has('hit.bru')).toBe(true);
    expect(rows.has('keep.bru')).toBe(true);
  });
});
