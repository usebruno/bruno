/**
 * This file exists because the current implementation of the `brunoToOpenapi` (former exportOpenApi) is moved from `@usebruno/app`
 * to `@usebruno/converters` and the scope of the ticket `BRU-3523` is to have the same implementation of
 * `brunoToOpenApi` currently present in the app.
 *
 * This file is part of copying the implementation of
 * [readCollectionForApiSpec](https://github.com/usebruno/bruno/blob/main/packages/bruno-electron/src/utils/collection-reader.js#L31),
 * which is the original function present in `@usebruno/electron` being used by `@usebruno/app`.
 *
 * @author @vasharma05-bruno
 */

const { isDenied, resolveDenylist } = require('../../src/utils/collection-walk');

describe('collection walk denylist', () => {
  test('plain folder paths deny the folder and its descendants without matching prefixes', () => {
    const denylist = resolveDenylist(['parent/child']);

    expect(isDenied('parent/child', denylist)).toBe(true);
    expect(isDenied('parent/child/request.bru', denylist)).toBe(true);
    expect(isDenied('parent/children/request.bru', denylist)).toBe(false);
  });

  test('preserves glob matching for default denylist entries', () => {
    expect(isDenied('nested/.DS_Store', resolveDenylist())).toBe(true);
  });

  test('folder entries with a trailing separator deny the folder and its descendants', () => {
    const denylist = resolveDenylist(['hidden/']);

    expect(isDenied('hidden', denylist)).toBe(true);
    expect(isDenied('hidden/request.bru', denylist)).toBe(true);
    expect(isDenied('hidden-other/request.bru', denylist)).toBe(false);
  });

  test('a glob denies the path it matches and not files beneath that directory', () => {
    const denylist = resolveDenylist(['**/hidden']);

    expect(isDenied('nested/hidden', denylist)).toBe(true);
    expect(isDenied('nested/hidden/request.bru', denylist)).toBe(false);
    expect(isDenied('nested/visible/request.bru', denylist)).toBe(false);
  });

  test('a trailing slash on a glob does not match every path', () => {
    expect(isDenied('foo/bar.bru', resolveDenylist(['**/']))).toBe(false);
    expect(isDenied('visible.bru', resolveDenylist(['*/']))).toBe(false);
    expect(isDenied('dir/file.bru', resolveDenylist(['*/']))).toBe(false);
  });

  test('skips empty and slash-only plain patterns', () => {
    const denylist = resolveDenylist(['', '/', '//', 'hidden']);

    expect(isDenied('hidden/request.bru', denylist)).toBe(true);
    expect(isDenied('visible.bru', denylist)).toBe(false);
  });

  test('walk prunes plain ignored directories without descending', () => {
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');
    const { walk } = require('../../src/utils/collection-walk');
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-walk-deny-'));

    try {
      fs.mkdirSync(path.join(root, 'hidden'));
      fs.writeFileSync(path.join(root, 'hidden', 'request.bru'), 'hidden');
      fs.writeFileSync(path.join(root, 'visible.bru'), 'visible');

      const files = walk(root, resolveDenylist(['hidden'])).map((f) => f.relativePath);
      expect(files).toEqual(['visible.bru']);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('walk still lists files under a directory that only matches a non-cascading glob', () => {
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');
    const { walk } = require('../../src/utils/collection-walk');
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-walk-glob-'));

    try {
      fs.mkdirSync(path.join(root, 'nested', 'hidden'), { recursive: true });
      fs.writeFileSync(path.join(root, 'nested', 'hidden', 'request.bru'), 'nested-hidden');
      fs.writeFileSync(path.join(root, 'visible.bru'), 'visible');

      const files = walk(root, resolveDenylist(['**/hidden'])).map((f) => f.relativePath).sort();
      expect(files).toEqual([
        path.join('nested', 'hidden', 'request.bru'),
        'visible.bru'
      ].sort());
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('walk lists each folder\'s entries in name order, whatever order the file system returns them in', () => {
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');
    const { walk } = require('../../src/utils/collection-walk');
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-walk-order-'));
    const realReaddirSync = fs.readdirSync;
    const readdirSpy = jest.spyOn(fs, 'readdirSync').mockImplementation((...args) => realReaddirSync(...args).reverse());

    try {
      fs.writeFileSync(path.join(root, 'dev.bru'), 'dev');
      fs.writeFileSync(path.join(root, 'Local.bru'), 'local');
      fs.writeFileSync(path.join(root, 'Prod.bru'), 'prod');
      fs.mkdirSync(path.join(root, 'Users'));
      fs.writeFileSync(path.join(root, 'Users', 'list.bru'), 'list');
      fs.writeFileSync(path.join(root, 'Users', 'create.bru'), 'create');

      const files = walk(root, resolveDenylist()).map((f) => f.relativePath);
      expect(files).toEqual([
        'Local.bru',
        'Prod.bru',
        path.join('Users', 'create.bru'),
        path.join('Users', 'list.bru'),
        'dev.bru'
      ]);
    } finally {
      readdirSpy.mockRestore();
      fs.rmSync(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    }
  });
});
