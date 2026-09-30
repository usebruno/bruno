const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  getResponseBodiesDirectoryBase,
  ensureResponseBodiesDirectory,
  purgeResponseBodiesDirectory
} = require('./paths');

describe('response-body paths adapter', () => {
  test('resolves under userData/tmp/response-bodies', () => {
    expect(getResponseBodiesDirectoryBase({ getUserDataPath: () => '/mock-user-data' })).toBe(
      path.join('/mock-user-data', 'tmp', 'response-bodies')
    );
  });

  test('purgeResponseBodiesDirectory removes prior files and recreates empty dir', () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-rb-purge-'));
    const base = path.join(tmpRoot, 'tmp', 'response-bodies');
    fs.mkdirSync(base, { recursive: true });
    fs.writeFileSync(path.join(base, 'old-body'), 'stale');

    const dir = purgeResponseBodiesDirectory({ getUserDataPath: () => tmpRoot });
    expect(dir).toBe(base);
    expect(fs.existsSync(dir)).toBe(true);
    expect(fs.readdirSync(dir)).toEqual([]);

    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  test('ensureResponseBodiesDirectory creates the directory', () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-rb-paths-'));
    const dir = ensureResponseBodiesDirectory({ getUserDataPath: () => tmpRoot });
    expect(dir).toBe(path.join(tmpRoot, 'tmp', 'response-bodies'));
    expect(fs.existsSync(dir)).toBe(true);
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  test('does not import collection transient helpers', () => {
    const src = fs.readFileSync(require.resolve('./paths'), 'utf8');
    expect(src).not.toMatch(/require\(['"].*collection/);
    expect(src).not.toMatch(/\bgetTransientDirectory\b/);
    expect(src).not.toMatch(/\bensureTransientDirectory\b/);
    expect(src).not.toMatch(/\bgetTransientPath\b/);
  });
});
