const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { executeQuickJsVmAsync } = require('../src/sandbox/quickjs');
const { OUTSIDE_COLLECTION_ERROR, moduleNotFoundError } = require('../src/sandbox/quickjs/shims/local-module');

const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-local-module-boundary-')));
const collection = path.join(root, 'collection');
const siblingSharingPrefix = path.join(root, 'collection-sibling');
const outsideModule = path.join(root, 'outside.js');
const deletedCollection = path.join(root, 'deleted-collection');
const lockedDirectory = path.join(collection, 'locked');

// chmod is a no-op on NTFS, so a locked directory cannot be produced there
const itWherePermissionsApply = process.platform === 'win32' ? it.skip : it;

const widenCwdToParent = `const parent = path.resolve(bru.cwd(), '..'); bru.cwd = () => parent;`;

describe('local module loader keeps the collection boundary whatever a script passes in', () => {
  beforeAll(() => {
    fs.mkdirSync(collection, { recursive: true });
    fs.mkdirSync(siblingSharingPrefix);

    fs.mkdirSync(path.join(collection, 'nested'), { recursive: true });
    fs.mkdirSync(lockedDirectory);
    fs.mkdirSync(deletedCollection);
    fs.rmSync(deletedCollection, { recursive: true });

    fs.writeFileSync(path.join(collection, 'helper.js'), 'module.exports = "helper inside collection";');
    fs.writeFileSync(path.join(collection, 'nested', 'deep.js'), 'module.exports = "file nested inside collection";');
    fs.writeFileSync(path.join(lockedDirectory, 'unreadable.js'), 'module.exports = "file behind a locked directory";');
    fs.writeFileSync(path.join(siblingSharingPrefix, 'helper.js'), 'module.exports = "file in the sibling directory";');
    fs.writeFileSync(outsideModule, 'module.exports = "file outside the collection";');
  });

  afterAll(() => {
    fs.chmodSync(lockedDirectory, 0o755);
    fs.rmSync(root, { recursive: true, force: true });
  });

  const runScript = async (script, collectionPath = collection) => {
    let value;
    const bru = {
      cwd: () => collectionPath,
      setVar: (_name, loaded) => {
        value = loaded;
      }
    };

    await executeQuickJsVmAsync({
      script: `try { bru.setVar('v', ${script}); } catch (e) { bru.setVar('v', e.message); }`,
      context: { bru },
      collectionPath
    });

    return value;
  };

  describe('when a script passes a path that leaves the collection', () => {
    it('rejects a sibling directory whose name merely shares the collection prefix', async () => {
      expect(await runScript(`require('../collection-sibling/helper')`)).toBe(OUTSIDE_COLLECTION_ERROR);
    });

    it('rejects a relative path that traverses out of the collection', async () => {
      expect(await runScript(`require('../outside.js')`)).toBe(OUTSIDE_COLLECTION_ERROR);
    });

    it('rejects a path that starts inside the collection and then climbs out of it', async () => {
      expect(await runScript(`require(bru.cwd() + '/../outside.js')`)).toBe(OUTSIDE_COLLECTION_ERROR);
    });

    it('stops at a null byte rather than following the escaping segments after it', async () => {
      const loaded = await runScript(`require('./helper.js' + String.fromCharCode(0) + '/../../outside.js')`);
      expect(loaded).toBe('helper inside collection');
    });
  });

  describe('when a script passes a path that stays inside the collection', () => {
    it('loads a file nested below the collection root', async () => {
      expect(await runScript(`require('./nested/deep')`)).toBe('file nested inside collection');
    });

    it('loads an absolute path that resolves inside the collection', async () => {
      expect(await runScript(`require(bru.cwd() + '/helper.js')`)).toBe('helper inside collection');
    });
  });

  describe('when the collection root itself cannot be resolved', () => {
    it('reports a missing module when the collection directory has been deleted', async () => {
      expect(await runScript(`require('./helper')`, deletedCollection)).toBe(moduleNotFoundError('./helper'));
    });
  });

  describe('when resolving the file fails for a reason other than a missing path', () => {
    itWherePermissionsApply('reports a file behind a directory without search permission as a missing module', async () => {
      fs.chmodSync(lockedDirectory, 0o000);
      try {
        expect(await runScript(`require('./locked/unreadable')`)).toBe(moduleNotFoundError('./locked/unreadable'));
      } finally {
        fs.chmodSync(lockedDirectory, 0o755);
      }
    });
  });

  describe('when a script reassigns bru.cwd to widen what reaches the loader', () => {
    it('lets the script change bru.cwd for its own code', async () => {
      expect(await runScript(`(() => { ${widenCwdToParent} return bru.cwd(); })()`)).toBe(root);
    });

    it('still rejects an outside path that only reached the loader because bru.cwd was widened', async () => {
      const loaded = await runScript(
        `(() => { ${widenCwdToParent} return require(path.resolve(parent, 'outside.js')); })()`
      );
      expect(loaded).toBe(OUTSIDE_COLLECTION_ERROR);
    });

    it('still rejects a file elsewhere on the machine when bru.cwd is widened to the filesystem root', async () => {
      const filesystemRoot = path.parse(__filename).root;
      const loaded = await runScript(
        `(() => { bru.cwd = () => ${JSON.stringify(filesystemRoot)}; return require(${JSON.stringify(__filename)}); })()`
      );
      expect(loaded).toBe(OUTSIDE_COLLECTION_ERROR);
    });

    it('still rejects an outside path when a local module is the one widening bru.cwd', async () => {
      fs.writeFileSync(
        path.join(collection, 'widens-cwd.js'),
        `${widenCwdToParent} module.exports = require(path.resolve(parent, 'outside.js'));`
      );

      expect(await runScript(`require('./widens-cwd')`)).toBe(OUTSIDE_COLLECTION_ERROR);
    });
  });
});
