const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { getResponseBodiesDirectoryBase, ensureResponseBodiesDirectory } = require('./paths');

describe('response-body paths adapter', () => {
  test('resolves under userData/tmp/response-bodies', () => {
    expect(getResponseBodiesDirectoryBase({ getUserDataPath: () => '/mock-user-data' })).toBe(
      path.join('/mock-user-data', 'tmp', 'response-bodies')
    );
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
