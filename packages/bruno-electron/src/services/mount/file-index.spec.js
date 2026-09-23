const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { FileIndex } = require('./file-index');

describe('FileIndex denylist', () => {
  let collectionPath;
  let dbPath;
  let index;

  beforeEach(() => {
    collectionPath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-file-index-'));
    dbPath = path.join(collectionPath, 'index.db');
    index = new FileIndex({ dbPath });

    fs.mkdirSync(path.join(collectionPath, 'hidden'));
    fs.writeFileSync(path.join(collectionPath, 'hidden', 'request.bru'), 'hidden');
    fs.writeFileSync(path.join(collectionPath, 'visible.bru'), 'visible');
    index.stageParsed(collectionPath, path.join(collectionPath, 'hidden', 'request.bru'), { name: 'Hidden' });
    index.stageParsed(collectionPath, path.join(collectionPath, 'visible.bru'), { name: 'Visible' });
  });

  afterEach(() => {
    index.close();
    fs.rmSync(collectionPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  test('does not return denied rows from the cache', () => {
    const entries = index.entries(collectionPath, { denylist: ['hidden'] });

    expect([...entries.keys()]).toEqual(['visible.bru']);
  });

  test('marks previously cached denied rows for removal', async () => {
    const { removed } = await index.status(collectionPath, { denylist: ['hidden'] });

    expect(removed.map(({ relativePath }) => relativePath)).toContain(path.join('hidden', 'request.bru'));
  });
});
