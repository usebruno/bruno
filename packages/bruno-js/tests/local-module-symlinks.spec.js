const { describe, it, expect, afterAll } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { executeQuickJsVmAsync } = require('../src/sandbox/quickjs');
const { OUTSIDE_COLLECTION_ERROR, moduleNotFoundError } = require('../src/sandbox/quickjs/shims/local-module');

const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-local-module-')));
const collection = path.join(root, 'collection');
const collectionLink = path.join(root, 'collection-link');
const outside = path.join(root, 'outside');

const createFixture = () => {
  fs.mkdirSync(collection);
  fs.mkdirSync(outside);

  fs.writeFileSync(path.join(outside, 'secret.js'), 'module.exports = "SECRET FROM OUTSIDE";');
  fs.writeFileSync(path.join(collection, 'helper.js'), 'module.exports = "helper inside collection";');

  fs.symlinkSync('../outside/secret.js', path.join(collection, 'link.js'), 'file');
  fs.symlinkSync('../outside', path.join(collection, 'linkdir'), 'dir');
  fs.symlinkSync('./helper.js', path.join(collection, 'inside-link.js'), 'file');

  // The collection opened through a symlinked path
  fs.symlinkSync(collection, collectionLink, 'dir');
};

// Windows needs admin or Developer Mode to create symlinks. CI runners have it,
// local accounts often do not, so skip when the fixture cannot be built.
const fixtureCreated = (() => {
  try {
    createFixture();
    return true;
  } catch (e) {
    fs.rmSync(root, { recursive: true, force: true });
    if (e.code === 'EPERM') return false;
    throw e;
  }
})();

const describeIfSymlinks = fixtureCreated ? describe : describe.skip;

describeIfSymlinks('local module loader with symlinks', () => {
  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  const requireFrom = async (collectionPath, specifier) => {
    let value;
    const bru = {
      cwd: () => collectionPath,
      setVar: (_name, loaded) => {
        value = loaded;
      }
    };

    try {
      await executeQuickJsVmAsync({
        script: `bru.setVar('loaded', require(${JSON.stringify(specifier)}))`,
        context: { bru },
        collectionPath
      });
      return { value };
    } catch (e) {
      return { error: e.message };
    }
  };

  describe('when the collection path is a real directory', () => {
    it('rejects a file symlink whose target is outside the collection', async () => {
      expect((await requireFrom(collection, './link.js')).error).toBe(OUTSIDE_COLLECTION_ERROR);
    });

    it('rejects a file reached through a directory symlink whose target is outside the collection', async () => {
      expect((await requireFrom(collection, './linkdir/secret')).error).toBe(OUTSIDE_COLLECTION_ERROR);
    });

    it('rejects a relative path that traverses out of the collection', async () => {
      expect((await requireFrom(collection, '../outside/secret.js')).error).toBe(OUTSIDE_COLLECTION_ERROR);
    });

    it('reports a missing module with the existing message', async () => {
      expect((await requireFrom(collection, './does-not-exist')).error).toBe(moduleNotFoundError('./does-not-exist'));
    });

    it('loads a real file inside the collection', async () => {
      expect((await requireFrom(collection, './helper')).value).toBe('helper inside collection');
    });

    it('loads a file symlink whose target is inside the collection', async () => {
      expect((await requireFrom(collection, './inside-link.js')).value).toBe('helper inside collection');
    });
  });

  describe('when the collection path is itself a symlink', () => {
    it('loads a real file inside the collection', async () => {
      expect((await requireFrom(collectionLink, './helper')).value).toBe('helper inside collection');
    });

    it('rejects a file symlink whose target is outside the collection', async () => {
      expect((await requireFrom(collectionLink, './link.js')).error).toBe(OUTSIDE_COLLECTION_ERROR);
    });
  });
});
