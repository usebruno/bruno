const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ScriptRuntime = require('../src/runtime/script-runtime');

describe('quickjs - local modules', () => {
  let testDir;
  let collectionPath;

  const baseRequest = {
    method: 'GET',
    url: 'http://localhost:3000/',
    headers: {}
  };

  const runScript = (script) => {
    const runtime = new ScriptRuntime({ runtime: 'quickjs' });
    // The bundled libraries evaluated inside the VM at startup (chai, jwt shim)
    // reference `console`, and the console shim is only installed when an
    // onConsoleLog callback is provided
    const onConsoleLog = () => {};
    return runtime.runRequestScript(script, { ...baseRequest }, {}, {}, collectionPath, onConsoleLog, process.env);
  };

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-quickjs-test-'));
    collectionPath = path.join(testDir, 'collection');
    fs.mkdirSync(collectionPath);
  });

  afterEach(() => {
    // maxRetries/retryDelay: Windows can hold transient locks (antivirus, indexing)
    fs.rmSync(testDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  it('should load a local JS module', async () => {
    fs.writeFileSync(path.join(collectionPath, 'helper.js'), 'module.exports = { value: 42 };');

    const result = await runScript(`
      const helper = require('./helper');
      bru.setVar('result', helper.value);
    `);

    expect(result.runtimeVariables.result).toBe(42);
  });

  it('should load a local JS module using the exports binding', async () => {
    fs.writeFileSync(path.join(collectionPath, 'named.js'), 'exports.value = "named";');

    const result = await runScript(`
      const named = require('./named.js');
      bru.setVar('result', named.value);
    `);

    expect(result.runtimeVariables.result).toBe('named');
  });

  it('should load a TypeScript module with explicit .ts extension', async () => {
    fs.writeFileSync(
      path.join(collectionPath, 'helper.ts'),
      `
        interface Payload {
          value: number;
        }
        const payload: Payload = { value: 42 };
        module.exports = { getValue: (): number => payload.value };
      `
    );

    const result = await runScript(`
      const helper = require('./helper.ts');
      bru.setVar('result', helper.getValue());
    `);

    expect(result.runtimeVariables.result).toBe(42);
  });

  it('should resolve extensionless require to a .ts file', async () => {
    fs.writeFileSync(path.join(collectionPath, 'helper.ts'), 'export const value: number = 7;');

    const result = await runScript(`
      const helper = require('./helper');
      bru.setVar('result', helper.value);
    `);

    expect(result.runtimeVariables.result).toBe(7);
  });

  it('should prefer .js over .ts when both exist', async () => {
    fs.writeFileSync(path.join(collectionPath, 'dual.js'), 'module.exports = { source: "js" };');
    fs.writeFileSync(path.join(collectionPath, 'dual.ts'), 'export const source: string = "ts";');

    const result = await runScript(`
      const dual = require('./dual');
      bru.setVar('result', dual.source);
    `);

    expect(result.runtimeVariables.result).toBe('js');
  });

  it('should append extensions to a require whose basename contains a dot', async () => {
    fs.writeFileSync(path.join(collectionPath, 'config.helper.ts'), 'export const value: string = "dotted";');

    const result = await runScript(`
      const helper = require('./config.helper');
      bru.setVar('result', helper.value);
    `);

    expect(result.runtimeVariables.result).toBe('dotted');
  });

  it('should evaluate a module once across repeated requires', async () => {
    fs.writeFileSync(
      path.join(collectionPath, 'once.js'),
      'globalThis.__loadCount = (globalThis.__loadCount || 0) + 1; module.exports = { loads: globalThis.__loadCount };'
    );

    const result = await runScript(`
      const first = require('./once');
      const second = require('./once');
      const third = require('./once.js');
      bru.setVar('result', [first === second, first === third, third.loads].join(','));
    `);

    expect(result.runtimeVariables.result).toBe('true,true,1');
  });

  it('should resolve circular requires with partial exports', async () => {
    fs.writeFileSync(
      path.join(collectionPath, 'circular-a.js'),
      `
        exports.name = 'a';
        const b = require('./circular-b');
        exports.fromB = b.name;
      `
    );
    fs.writeFileSync(
      path.join(collectionPath, 'circular-b.js'),
      `
        const a = require('./circular-a');
        exports.name = 'b';
        exports.fromA = a.name;
      `
    );

    const result = await runScript(`
      const a = require('./circular-a');
      const b = require('./circular-b');
      bru.setVar('result', a.fromB + ':' + b.fromA);
    `);

    expect(result.runtimeVariables.result).toBe('b:a');
  });

  it('should allow a module to be required again after its body threw', async () => {
    fs.writeFileSync(
      path.join(collectionPath, 'throws-once.js'),
      `
        exports.partial = true;
        if (!globalThis.__attempted) {
          globalThis.__attempted = true;
          throw new Error('first load fails');
        }
        exports.loaded = true;
      `
    );

    const result = await runScript(`
      try {
        require('./throws-once');
      } catch (error) {
        // the failed module must not stay cached with its partial exports
      }
      const retried = require('./throws-once');
      bru.setVar('result', retried.loaded === true);
    `);

    expect(result.runtimeVariables.result).toBe(true);
  });

  it('should resolve a directory with index.ts', async () => {
    const libDir = path.join(collectionPath, 'lib');
    fs.mkdirSync(libDir);
    fs.writeFileSync(path.join(libDir, 'index.ts'), 'export const name: string = "lib-index";');

    const result = await runScript(`
      const lib = require('./lib');
      bru.setVar('result', lib.name);
    `);

    expect(result.runtimeVariables.result).toBe('lib-index');
  });

  it('should resolve nested imports relative to a directory-index module', async () => {
    const libDir = path.join(collectionPath, 'lib');
    fs.mkdirSync(libDir);
    fs.writeFileSync(path.join(libDir, 'util.ts'), 'export const value: number = 99;');
    fs.writeFileSync(
      path.join(libDir, 'index.ts'),
      `
        import { value } from './util';
        export const result: number = value;
      `
    );

    const result = await runScript(`
      const lib = require('./lib');
      bru.setVar('result', lib.result);
    `);

    expect(result.runtimeVariables.result).toBe(99);
  });

  it('should load a module that redeclares var exports (UMD-style)', async () => {
    fs.writeFileSync(
      path.join(collectionPath, 'umd.js'),
      'var exports = module.exports; exports.kind = "umd";'
    );

    const result = await runScript(`
      const umd = require('./umd');
      bru.setVar('result', umd.kind);
    `);

    expect(result.runtimeVariables.result).toBe('umd');
  });

  it('should not honor package.json main in the safe sandbox', async () => {
    const pkgDir = path.join(collectionPath, 'pkg');
    fs.mkdirSync(pkgDir);
    fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify({ main: './entry.js' }));
    fs.writeFileSync(path.join(pkgDir, 'entry.js'), 'module.exports = { from: "main" };');

    await expect(
      runScript(`
        require('./pkg');
      `)
    ).rejects.toThrow(/Cannot find module/);
  });

  it('should report Cannot find module for a directory without an index file', async () => {
    fs.mkdirSync(path.join(collectionPath, 'no-index'));
    fs.writeFileSync(path.join(collectionPath, 'no-index', 'other.txt'), 'not a module');

    await expect(
      runScript(`
        require('./no-index');
      `)
    ).rejects.toThrow(/Cannot find module/);
  });

  it('should handle ESM import/export between TypeScript modules', async () => {
    fs.writeFileSync(
      path.join(collectionPath, 'math.ts'),
      'export const double = (n: number): number => n * 2;'
    );
    fs.writeFileSync(
      path.join(collectionPath, 'consumer.ts'),
      `
        import { double } from './math';
        export const result: number = double(21);
      `
    );

    const result = await runScript(`
      const consumer = require('./consumer.ts');
      bru.setVar('result', consumer.result);
    `);

    expect(result.runtimeVariables.result).toBe(42);
  });

  it('should expose export default via .default', async () => {
    fs.writeFileSync(path.join(collectionPath, 'default-export.ts'), 'export default { kind: "default" };');

    const result = await runScript(`
      const mod = require('./default-export.ts');
      bru.setVar('result', mod.default.kind);
    `);

    expect(result.runtimeVariables.result).toBe('default');
  });

  it('should report a clear error for invalid TypeScript syntax', async () => {
    fs.writeFileSync(path.join(collectionPath, 'broken.ts'), 'const x: = 5;');

    await expect(
      runScript(`
        require('./broken.ts');
      `)
    ).rejects.toThrow(/Failed to transpile TypeScript file/);
  });

  it('should block TypeScript modules outside the collection path', async () => {
    fs.writeFileSync(path.join(testDir, 'outside.ts'), 'export const secret: string = "nope";');

    await expect(
      runScript(`
        require('../outside.ts');
      `)
    ).rejects.toThrow(/Access to files outside of the collectionPath is not allowed/);
  });
});
