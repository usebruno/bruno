import { uuid } from './index';

const pkg = require('../../package.json');

describe('uuid()', () => {
  // uuid() is built on nanoid's customAlphabet and is called from ~20 sites on
  // the yml parse path, so it runs during ordinary collection reads.
  const URL_ALPHABET = 'useandom26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict';

  it('returns a 21 character id', () => {
    expect(uuid()).toHaveLength(21);
  });

  it('only uses characters from the url alphabet', () => {
    for (const char of uuid()) {
      expect(URL_ALPHABET).toContain(char);
    }
  });

  it('does not repeat', () => {
    const ids = new Set(Array.from({ length: 500 }, () => uuid()));

    expect(ids.size).toBe(500);
  });
});

describe('packaging', () => {
  /**
   * nanoid is imported at runtime by uuid() above, and it is not bundled - it
   * is listed in rollup's externalDeps, so the published bundles reference it
   * by name. Declaring it as a devDependency leaves it out of the installed
   * tree, where it then resolves only when a consumer happens to hoist it.
   */
  it('declares nanoid as a runtime dependency', () => {
    expect(pkg.dependencies).toHaveProperty('nanoid');
    expect(pkg.devDependencies).not.toHaveProperty('nanoid');
  });
});
