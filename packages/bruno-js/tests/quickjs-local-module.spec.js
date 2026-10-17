const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { executeQuickJsVmAsync } = require('../src/sandbox/quickjs');

const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-local-module-')));
const collection = path.join(root, 'collection');

describe('quickjs compiles a local module with its own module, exports and require', () => {
  beforeAll(() => {
    fs.mkdirSync(path.join(collection, 'nested'), { recursive: true });
    fs.writeFileSync(path.join(collection, 'helper.js'), 'module.exports = "helper value";');
    fs.writeFileSync(path.join(root, 'outside.js'), 'module.exports = "outside the collection";');
    fs.writeFileSync(path.join(collection, 'nested', 'wraps-helper.js'), 'module.exports = require("../helper");');
    fs.writeFileSync(
      path.join(collection, 'exports-style.js'),
      'exports.value = "via exports"; exports.sameObject = exports === module.exports;'
    );
    fs.writeFileSync(
      path.join(collection, 'counter.js'),
      'globalThis.loadCount = (globalThis.loadCount || 0) + 1; module.exports = { loads: globalThis.loadCount };'
    );
  });

  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  const runScript = async (script) => {
    let value;
    const bru = {
      cwd: () => collection,
      setVar: (_name, loaded) => {
        value = loaded;
      }
    };

    await executeQuickJsVmAsync({ script, context: { bru }, collectionPath: collection });
    return value;
  };

  it('resolves a module that requires a sibling through a relative path', async () => {
    const loaded = await runScript(`bru.setVar('v', require('./nested/wraps-helper'))`);
    expect(loaded).toBe('helper value');
  });

  it('gives a module an exports alias pointing at the same object as module.exports', async () => {
    const loaded = await runScript(`bru.setVar('v', JSON.stringify(require('./exports-style')))`);
    expect(JSON.parse(loaded)).toEqual({ value: 'via exports', sameObject: true });
  });

  it('caches a module so repeated requires share one exports object and run the body once', async () => {
    const loaded = await runScript(`
      const first = require('./counter');
      const second = require('./counter');
      first.mutated = true;
      bru.setVar('v', JSON.stringify({ sameObject: first === second, loads: second.loads, mutated: second.mutated }));
    `);
    expect(JSON.parse(loaded)).toEqual({ sameObject: true, loads: 1, mutated: true });
  });

  it('rejects requiring a path outside the collection', async () => {
    await expect(
      executeQuickJsVmAsync({
        script: `require('../outside')`,
        context: { bru: { cwd: () => collection, setVar: () => {} } },
        collectionPath: collection
      })
    ).rejects.toThrow('Access to files outside of the collectionPath is not allowed');
  });

  it('rejects requiring a missing local module', async () => {
    await expect(
      executeQuickJsVmAsync({
        script: `require('./does-not-exist')`,
        context: { bru: { cwd: () => collection, setVar: () => {} } },
        collectionPath: collection
      })
    ).rejects.toThrow('Cannot find module');
  });

  it('appends .js when the local path has no extension', async () => {
    const loaded = await runScript(`bru.setVar('v', require('./helper'))`);
    expect(loaded).toBe('helper value');
  });

  it('resolves an absolute path under bru.cwd()', async () => {
    const loaded = await runScript(`bru.setVar('v', require(bru.cwd() + '/helper.js'))`);
    expect(loaded).toBe('helper value');
  });

  it('lets a local module require a library name from requireObject', async () => {
    fs.writeFileSync(
      path.join(collection, 'uses-lib.js'),
      'module.exports = require("fake-lib").ok;'
    );
    const loaded = await runScript(`
      globalThis.requireObject['fake-lib'] = { ok: true };
      bru.setVar('v', require('./uses-lib'));
    `);
    expect(loaded).toBe(true);
  });

  it('resolves a local path that already includes the .js extension', async () => {
    const loaded = await runScript(`bru.setVar('v', require('./helper.js'))`);
    expect(loaded).toBe('helper value');
  });
});
