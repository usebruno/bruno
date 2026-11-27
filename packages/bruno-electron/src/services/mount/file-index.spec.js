const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

jest.mock('electron', () => ({
  app: { getVersion: () => '0.0.0-test' }
}));

jest.mock('../sqlite', () => ({
  getStatements: jest.fn(),
  transaction: jest.fn()
}));

const { createDatabase } = require('@usebruno/sqlite');
const { getStatements, transaction } = require('../sqlite');
const { FileIndex } = require('./file-index');
const { idForAbsolutePath } = require('../../utils/mount');

describe('FileIndex denylist', () => {
  let collectionPath;
  let index;
  let db;

  beforeEach(() => {
    collectionPath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-file-index-'));
    const opened = createDatabase(':memory:');
    db = opened.db;
    getStatements.mockReturnValue(opened.statements);
    transaction.mockImplementation((callback) => opened.db._transaction(callback));
    index = new FileIndex();

    fs.mkdirSync(path.join(collectionPath, 'hidden'));
    fs.writeFileSync(path.join(collectionPath, 'hidden', 'request.bru'), 'hidden');
    fs.writeFileSync(path.join(collectionPath, 'visible.bru'), 'visible');
    index.stageParsed(collectionPath, path.join(collectionPath, 'hidden', 'request.bru'), { name: 'Hidden' });
    index.stageParsed(collectionPath, path.join(collectionPath, 'visible.bru'), { name: 'Visible' });
  });

  afterEach(() => {
    db.close();
    fs.rmSync(collectionPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  test('does not return denied rows from the cache', () => {
    const entries = index.entries(collectionPath, { denylist: ['hidden'] });

    expect([...entries.keys()]).toEqual(['visible.bru']);
  });

  test('does not return rows denied by a folder entry with a trailing separator', () => {
    const entries = index.entries(collectionPath, { denylist: ['hidden/'] });

    expect([...entries.keys()]).toEqual(['visible.bru']);
  });

  test('does not return a row whose path matches a glob', () => {
    const entries = index.entries(collectionPath, { denylist: ['hidden/**'] });

    expect([...entries.keys()]).toEqual(['visible.bru']);
  });

  test('returns a cached file when only an ancestor directory matches the glob', () => {
    const nestedHidden = path.join(collectionPath, 'nested', 'hidden');
    fs.mkdirSync(nestedHidden, { recursive: true });
    fs.writeFileSync(path.join(nestedHidden, 'request.bru'), 'nested-hidden');
    index.stageParsed(collectionPath, path.join(nestedHidden, 'request.bru'), { name: 'Nested Hidden' });

    const entries = index.entries(collectionPath, { denylist: ['**/hidden'] });

    expect([...entries.keys()].sort()).toEqual([
      'visible.bru',
      path.join('hidden', 'request.bru'),
      path.join('nested', 'hidden', 'request.bru')
    ].sort());
  });

  test('does not remove cached rows for a trailing-slash glob', async () => {
    const { removed } = await index.status(collectionPath, { denylist: ['**/'] });
    const removedPaths = removed.map(({ relativePath }) => relativePath);

    expect(removedPaths).not.toContain('visible.bru');
    expect(removedPaths).not.toContain(path.join('hidden', 'request.bru'));
  });

  test('marks previously cached denied rows for removal', async () => {
    const { removed } = await index.status(collectionPath, { denylist: ['hidden'] });

    expect(removed.map(({ relativePath }) => relativePath)).toContain(path.join('hidden', 'request.bru'));
  });

  test('returns denied rows when no denylist is passed', () => {
    const entries = index.entries(collectionPath);

    expect([...entries.keys()].sort()).toEqual([
      path.join('hidden', 'request.bru'),
      'visible.bru'
    ].sort());
  });
});

describe('FileIndex stale collection cleanup', () => {
  let rootPath;
  let index;
  let db;

  const makeCollection = (name, files) => {
    const collectionPath = path.join(rootPath, name);
    fs.mkdirSync(collectionPath, { recursive: true });
    for (const [relativePath, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(collectionPath, relativePath), content);
      index.stageParsed(collectionPath, path.join(collectionPath, relativePath), { name: relativePath });
    }
    return collectionPath;
  };

  const ids = (collectionPath) =>
    db._db
      .prepare('SELECT relative_path AS relativePath, id FROM file_index_entries WHERE collection_path = ? ORDER BY relative_path')
      .all(collectionPath)
      .map((row) => ({ ...row }));

  beforeEach(() => {
    rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-file-index-cleanup-'));
    const opened = createDatabase(':memory:');
    db = opened.db;
    getStatements.mockReturnValue(opened.statements);
    transaction.mockImplementation((callback) => opened.db._transaction(callback));
    index = new FileIndex();
  });

  afterEach(() => {
    db.close();
    fs.rmSync(rootPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  describe('pruneMissingCollections', () => {
    test('clears rows only for collections whose folder no longer exists', async () => {
      const kept = makeCollection('kept', { 'a.bru': 'a' });
      const deleted = makeCollection('deleted', { 'b.bru': 'b' });
      fs.rmSync(deleted, { recursive: true, force: true });

      const pruned = await index.pruneMissingCollections();

      expect(pruned).toEqual([deleted]);
      expect([...index.entries(kept).keys()]).toEqual(['a.bru']);
      expect(index.entries(deleted).size).toBe(0);
    });

    test('clears rows for a collection path that is now a file', async () => {
      const replaced = makeCollection('replaced', { 'a.bru': 'a' });
      fs.rmSync(replaced, { recursive: true, force: true });
      fs.writeFileSync(replaced, 'not a directory');

      expect(await index.pruneMissingCollections()).toEqual([replaced]);
      expect(index.entries(replaced).size).toBe(0);
    });

    test('keeps rows when the folder cannot be checked for a reason other than being missing', async () => {
      const unreadable = makeCollection('unreadable', { 'a.bru': 'a' });
      const realStat = fs.promises.stat;
      const statSpy = jest.spyOn(fs.promises, 'stat').mockImplementation((target, ...rest) => {
        if (target === unreadable) {
          return Promise.reject(Object.assign(new Error('permission denied'), { code: 'EACCES' }));
        }
        return realStat(target, ...rest);
      });

      try {
        expect(await index.pruneMissingCollections()).toEqual([]);
      } finally {
        statSpy.mockRestore();
      }
      expect([...index.entries(unreadable).keys()]).toEqual(['a.bru']);
    });
  });

  describe('moveCollection', () => {
    test('moves every row to the new path and recomputes ids from it', () => {
      const from = makeCollection('from', { 'a.bru': 'a', 'b.bru': 'b' });
      const to = path.join(rootPath, 'to');

      index.moveCollection(from, to);

      expect(index.entries(from).size).toBe(0);
      expect([...index.entries(to).keys()].sort()).toEqual(['a.bru', 'b.bru']);
      expect(ids(to)).toEqual([
        { relativePath: 'a.bru', id: idForAbsolutePath(path.join(to, 'a.bru')) },
        { relativePath: 'b.bru', id: idForAbsolutePath(path.join(to, 'b.bru')) }
      ]);
    });

    test('replaces rows already stored under the new path', () => {
      const from = makeCollection('from', { 'a.bru': 'a' });
      const to = makeCollection('to', { 'stale.bru': 'stale', 'a.bru': 'old' });

      index.moveCollection(from, to);

      expect([...index.entries(to).keys()]).toEqual(['a.bru']);
      expect(index.entries(to).get('a.bru').raw).toBe('a');
    });

    test('lets a mount at the new path reuse the moved rows without reparsing', async () => {
      const from = makeCollection('from', { 'a.bru': 'a', 'b.bru': 'b' });
      const to = path.join(rootPath, 'to');
      fs.renameSync(from, to);

      index.moveCollection(from, to);
      const { added, updated, removed } = await index.status(to);

      expect({ added, updated, removed }).toEqual({ added: [], updated: [], removed: [] });
    });

    test('leaves rows untouched when both paths are the same', () => {
      const same = makeCollection('same', { 'a.bru': 'a' });

      index.moveCollection(same, same);

      expect([...index.entries(same).keys()]).toEqual(['a.bru']);
    });
  });
});
