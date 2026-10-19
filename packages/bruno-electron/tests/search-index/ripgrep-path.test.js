const { spawnSync } = require('node:child_process');
const { getRipgrepPath, unpackAsarPath } = require('../../src/services/search-index/ripgrep-path');

describe('ripgrep-path', () => {
  it('rewrites app.asar to app.asar.unpacked', () => {
    expect(unpackAsarPath('/app/app.asar/node_modules/rg')).toBe('/app/app.asar.unpacked/node_modules/rg');
  });

  it('resolves a packaged ripgrep binary that runs --version', () => {
    const rgPath = getRipgrepPath();
    expect(rgPath).toBeTruthy();
    const result = spawnSync(rgPath, ['--version'], { encoding: 'utf8' });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/ripgrep/i);
  });
});
