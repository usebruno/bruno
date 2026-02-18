const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { runScriptInNodeVm } = require('./index');

describe('node-vm sandbox', () => {
  let testDir;
  let collectionPath;

  beforeEach(() => {
    // Create a temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-test-'));
    collectionPath = path.join(testDir, 'collection');
    fs.mkdirSync(collectionPath);
  });

  afterEach(() => {
    // Clean up test directory
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('createCustomRequire - local modules', () => {
    it('should load local module with ./ path', async () => {
      // Create a local module
      fs.writeFileSync(
        path.join(collectionPath, 'helper.js'),
        'module.exports = { value: 42 };'
      );

      const script = `
        const helper = require('./helper');
        bru.setVar('result', helper.value);
      `;

      const context = {
        bru: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.bru.setVar).toHaveBeenCalledWith('result', 42);
    });

    it('should load local module with ../ path', async () => {
      // Create a subdirectory and modules
      const subDir = path.join(collectionPath, 'subdir');
      fs.mkdirSync(subDir);
      fs.writeFileSync(
        path.join(collectionPath, 'parent.js'),
        'module.exports = { name: "parent" };'
      );
      fs.writeFileSync(
        path.join(subDir, 'child.js'),
        'const parent = require("../parent"); module.exports = parent;'
      );

      const script = `
        const child = require('./subdir/child');
        bru.setVar('result', child.name);
      `;

      const context = {
        bru: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.bru.setVar).toHaveBeenCalledWith('result', 'parent');
    });

    it('should handle backslashes on Windows', async () => {
      const subDir = path.join(collectionPath, 'utils');
      fs.mkdirSync(subDir);
      fs.writeFileSync(
        path.join(subDir, 'module.js'),
        'module.exports = { platform: "cross-platform" };'
      );

      // Simulate Windows-style path with backslashes
      const script = `
        const mod = require('.\\\\utils\\\\module');
        bru.setVar('result', mod.platform);
      `;

      const context = {
        bru: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.bru.setVar).toHaveBeenCalledWith('result', 'cross-platform');
    });

    it('should block access outside collection path', async () => {
      const script = `
        const outside = require('../../outside');
      `;

      const context = { console: console };

      await expect(
        runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} })
      ).rejects.toThrow('Access to files outside of the allowed context roots is not allowed');
    });

    it('should block absolute paths outside allowed roots', async () => {
      // Try to require an absolute path outside the collection
      const script = `
        const secret = require('/etc/passwd');
      `;

      const context = { console: console };

      await expect(
        runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} })
      ).rejects.toThrow('Access to files outside of the allowed context roots is not allowed');
    });

    it('should allow absolute paths within allowed roots', async () => {
      // Create a module in the collection
      fs.writeFileSync(
        path.join(collectionPath, 'absolute-test.js'),
        'module.exports = { loaded: true };'
      );

      // Use absolute path to require it
      const absolutePath = path.join(collectionPath, 'absolute-test.js');
      const script = `
        const mod = require('${absolutePath.replace(/\\/g, '\\\\')}');
        bru.setVar('result', mod.loaded);
      `;

      const context = {
        bru: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.bru.setVar).toHaveBeenCalledWith('result', true);
    });
  });

  describe('createCustomRequire - additionalContextRoots', () => {
    it('should allow module access from additionalContextRoots', async () => {
      // Create an additional context root at same level as collection
      const additionalRoot = path.join(testDir, 'shared');
      fs.mkdirSync(additionalRoot);
      fs.writeFileSync(
        path.join(additionalRoot, 'shared.js'),
        'module.exports = { shared: true };'
      );

      // From collection, traverse up to testDir, then into shared directory
      const script = `
        const shared = require('../shared/shared');
        bru.setVar('result', shared.shared);
      `;

      const context = {
        bru: { setVar: jest.fn() },
        console: console
      };

      const scriptingConfig = {
        additionalContextRoots: [additionalRoot]
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig });

      expect(context.bru.setVar).toHaveBeenCalledWith('result', true);
    });

    it('should handle relative additionalContextRoots path', async () => {
      // Create a sibling directory to collection
      const libsDir = path.join(testDir, 'libs');
      fs.mkdirSync(libsDir);
      fs.writeFileSync(
        path.join(libsDir, 'lib.js'),
        'module.exports = { fromLib: "yes" };'
      );

      const script = `
        const lib = require('../libs/lib');
        bru.setVar('result', lib.fromLib);
      `;

      const context = {
        bru: { setVar: jest.fn() },
        console: console
      };

      const scriptingConfig = {
        additionalContextRoots: ['../libs']
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig });

      expect(context.bru.setVar).toHaveBeenCalledWith('result', 'yes');
    });

    it('should handle nested additional context roots modules', async () => {
      // Create an additional context root
      const additionalRoot = path.join(testDir, 'shared');
      fs.mkdirSync(additionalRoot);
      fs.writeFileSync(
        path.join(additionalRoot, 'allowed.js'),
        'module.exports = { allowed: true };'
      );

      // Create a nested module that tries to require from additional root
      fs.writeFileSync(
        path.join(collectionPath, 'parent.js'),
        `
          const allowed = require('../shared/allowed');
          module.exports = { nestedAccess: allowed.allowed };
          `
      );

      const script = `
          const parent = require('./parent');
          bru.setVar('result', parent.nestedAccess);
        `;

      const context = {
        bru: { setVar: jest.fn() },
        console: console
      };

      const scriptingConfig = {
        additionalContextRoots: [additionalRoot]
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig });

      // Nested module should successfully access the additional root
      expect(context.bru.setVar).toHaveBeenCalledWith('result', true);
    });

    it('should resolve npm module from additionalContextRoots node_modules', async () => {
      const additionalRoot = path.join(testDir, 'shared');
      fs.mkdirSync(additionalRoot);

      // Create a fake npm module inside shared/node_modules
      const sharedNodeModulesDir = path.join(additionalRoot, 'node_modules', 'shared-package');
      fs.mkdirSync(sharedNodeModulesDir, { recursive: true });
      fs.writeFileSync(
        path.join(sharedNodeModulesDir, 'index.js'),
        'module.exports = { fromShared: true, version: "1.0.0" };'
      );

      const script = `
        const pkg = require('shared-package');
        bru.setVar('fromShared', pkg.fromShared);
        bru.setVar('version', pkg.version);
      `;

      const context = {
        bru: { setVar: jest.fn() },
        console: console
      };

      const scriptingConfig = {
        additionalContextRoots: [additionalRoot]
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig });

      expect(context.bru.setVar).toHaveBeenCalledWith('fromShared', true);
      expect(context.bru.setVar).toHaveBeenCalledWith('version', '1.0.0');
    });

    it('should resolve npm module required by a shared script in additionalContextRoots', async () => {
      const additionalRoot = path.join(testDir, 'shared');
      fs.mkdirSync(additionalRoot);

      // Create an npm dependency inside shared/node_modules
      const sharedNodeModulesDir = path.join(additionalRoot, 'node_modules', 'shared-util');
      fs.mkdirSync(sharedNodeModulesDir, { recursive: true });
      fs.writeFileSync(
        path.join(sharedNodeModulesDir, 'index.js'),
        'module.exports = { parse: function(s) { return JSON.parse(s); } };'
      );

      // Create a shared script that requires the npm module
      fs.writeFileSync(
        path.join(additionalRoot, 'parser.js'),
        'const sharedUtil = require("shared-util"); module.exports = { parse: sharedUtil.parse };'
      );

      // Collection script requires the shared local script, which internally
      // requires an npm package from the shared root's node_modules
      const script = `
        const parser = require('../shared/parser');
        const result = parser.parse('{"ok":true}');
        bru.setVar('result', result.ok);
      `;

      const context = {
        bru: { setVar: jest.fn() },
        console: console
      };

      const scriptingConfig = {
        additionalContextRoots: [additionalRoot]
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig });

      expect(context.bru.setVar).toHaveBeenCalledWith('result', true);
    });
  });

  describe('createCustomRequire - npm modules', () => {
    it('should load npm module', async () => {
      const script = `
        const lodash = require('lodash');
        bru.setVar('result', typeof lodash.get);
      `;

      const context = {
        bru: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.bru.setVar).toHaveBeenCalledWith('result', 'function');
    });
  });

  describe('createCustomRequire - module caching', () => {
    it('should cache loaded modules', async () => {
      // Module increments a counter each time it's executed
      // If caching works, counter should only be 1 after multiple requires
      fs.writeFileSync(
        path.join(collectionPath, 'cached.js'),
        `
        if (!global._cacheTestCount) global._cacheTestCount = 0;
        global._cacheTestCount++;
        module.exports = { id: Date.now() };
        `
      );

      const script = `
        const mod1 = require('./cached');
        const mod2 = require('./cached');
        const mod3 = require('./cached');
        bru.setVar('sameInstance', mod1 === mod2 && mod2 === mod3);
        bru.setVar('loadCount', global._cacheTestCount);
      `;

      const context = {
        bru: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      // All requires should return the same cached instance
      expect(context.bru.setVar).toHaveBeenCalledWith('sameInstance', true);
      // Module should only be executed once
      expect(context.bru.setVar).toHaveBeenCalledWith('loadCount', 1);
    });

    it('should handle circular dependencies', async () => {
      // Create two modules that require each other
      fs.writeFileSync(
        path.join(collectionPath, 'circularA.js'),
        `
        exports.name = 'A';
        const B = require('./circularB');
        exports.fromB = B.name;
        `
      );
      fs.writeFileSync(
        path.join(collectionPath, 'circularB.js'),
        `
        exports.name = 'B';
        const A = require('./circularA');
        exports.fromA = A.name;
        `
      );

      const script = `
        const A = require('./circularA');
        // A loads first, sets exports.name='A', then requires B
        // B loads, sets exports.name='B', requires A (gets partial: {name:'A'})
        // B finishes with {name:'B', fromA:'A'}
        // A finishes with {name:'A', fromB:'B'}
        bru.setVar('result', A.name + '-' + A.fromB);
      `;

      const context = {
        bru: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.bru.setVar).toHaveBeenCalledWith('result', 'A-B');
    });
  });

  describe('createCustomRequire - Node.js builtin modules', () => {
    it('should load builtin modules (crypto)', async () => {
      const script = `
        const crypto = require('crypto');
        bru.setVar('result', typeof crypto.createHash);
      `;

      const context = {
        bru: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.bru.setVar).toHaveBeenCalledWith('result', 'function');
    });

    it('should support node: prefix syntax', async () => {
      const script = `
        const path = require('node:path');
        bru.setVar('result', typeof path.join);
      `;

      const context = {
        bru: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.bru.setVar).toHaveBeenCalledWith('result', 'function');
    });

    it('should allow all builtin modules including fs', async () => {
      const script = `
        const fs = require('fs');
        bru.setVar('result', typeof fs.readFileSync);
      `;

      const context = {
        bru: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.bru.setVar).toHaveBeenCalledWith('result', 'function');
    });

    it('should load multiple builtins', async () => {
      const script = `
        const url = require('url');
        const util = require('util');
        const buffer = require('buffer');
        const fs = require('fs');
        bru.setVar('result', typeof url.parse + '-' + typeof util.format + '-' + typeof buffer.Buffer + '-' + typeof fs.readFileSync);
      `;

      const context = {
        bru: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.bru.setVar).toHaveBeenCalledWith('result', 'function-function-function-function');
    });
  });

  describe('createCustomRequire - npm modules in vm context', () => {
    it('should load npm modules from collection into vm context', async () => {
      // Create a mock npm module in collection's node_modules
      const nodeModulesDir = path.join(collectionPath, 'node_modules', 'test-module');
      fs.mkdirSync(nodeModulesDir, { recursive: true });
      fs.writeFileSync(
        path.join(nodeModulesDir, 'index.js'),
        'module.exports = { name: "test-module", value: 123 };'
      );

      const script = `
        const testMod = require('test-module');
        bru.setVar('result', testMod.name + '-' + testMod.value);
      `;

      const context = {
        bru: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.bru.setVar).toHaveBeenCalledWith('result', 'test-module-123');
    });

    it('should handle npm module with dependencies', async () => {
      // Create a mock npm module with internal dependencies
      const nodeModulesDir = path.join(collectionPath, 'node_modules', 'parent-module');
      fs.mkdirSync(nodeModulesDir, { recursive: true });
      fs.writeFileSync(
        path.join(nodeModulesDir, 'helper.js'),
        'module.exports = { helper: true };'
      );
      fs.writeFileSync(
        path.join(nodeModulesDir, 'index.js'),
        'const helper = require("./helper"); module.exports = { hasHelper: helper.helper };'
      );

      const script = `
        const parentMod = require('parent-module');
        bru.setVar('result', parentMod.hasHelper);
      `;

      const context = {
        bru: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.bru.setVar).toHaveBeenCalledWith('result', true);
    });

    it('should provide bru object to npm modules', async () => {
      const nodeModulesDir = path.join(collectionPath, 'node_modules', 'bru-access-module');
      fs.mkdirSync(nodeModulesDir, { recursive: true });
      fs.writeFileSync(
        path.join(nodeModulesDir, 'index.js'),
        `module.exports = {
          getEnvVar: function(name) { return bru.getEnvVar(name); },
          setVar: function(name, value) { bru.setVar(name, value); }
        };`
      );

      const script = `
        const bruModule = require('bru-access-module');
        const envValue = bruModule.getEnvVar('TEST_VAR');
        bruModule.setVar('result', envValue);
      `;

      const getEnvVarMock = jest.fn().mockReturnValue('test-value');
      const setVarMock = jest.fn();
      const context = {
        bru: {
          getEnvVar: getEnvVarMock,
          setVar: setVarMock
        },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(getEnvVarMock).toHaveBeenCalledWith('TEST_VAR');
      expect(setVarMock).toHaveBeenCalledWith('result', 'test-value');
    });

    it('should provide req object to npm modules', async () => {
      const nodeModulesDir = path.join(collectionPath, 'node_modules', 'req-access-module');
      fs.mkdirSync(nodeModulesDir, { recursive: true });
      fs.writeFileSync(
        path.join(nodeModulesDir, 'index.js'),
        `module.exports = {
          getUrl: function() { return req.getUrl(); },
          getMethod: function() { return req.getMethod(); },
          setHeader: function(name, value) { req.setHeader(name, value); }
        };`
      );

      const script = `
        const reqModule = require('req-access-module');
        const url = reqModule.getUrl();
        const method = reqModule.getMethod();
        reqModule.setHeader('X-Custom', 'value');
        bru.setVar('result', method + ':' + url);
      `;

      const setVarMock = jest.fn();
      const getUrlMock = jest.fn().mockReturnValue('https://api.example.com');
      const getMethodMock = jest.fn().mockReturnValue('POST');
      const setHeaderMock = jest.fn();
      const context = {
        bru: { setVar: setVarMock },
        req: {
          getUrl: getUrlMock,
          getMethod: getMethodMock,
          setHeader: setHeaderMock
        },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(getUrlMock).toHaveBeenCalled();
      expect(getMethodMock).toHaveBeenCalled();
      expect(setHeaderMock).toHaveBeenCalledWith('X-Custom', 'value');
      expect(setVarMock).toHaveBeenCalledWith('result', 'POST:https://api.example.com');
    });

    it('should provide res object to npm modules', async () => {
      const nodeModulesDir = path.join(collectionPath, 'node_modules', 'res-access-module');
      fs.mkdirSync(nodeModulesDir, { recursive: true });
      fs.writeFileSync(
        path.join(nodeModulesDir, 'index.js'),
        `module.exports = {
          getStatus: function() { return res.getStatus(); },
          getBody: function() { return res.getBody(); },
          getHeader: function(name) { return res.getHeader(name); }
        };`
      );

      const script = `
        const resModule = require('res-access-module');
        const status = resModule.getStatus();
        const body = resModule.getBody();
        const contentType = resModule.getHeader('content-type');
        bru.setVar('result', status + ':' + contentType + ':' + body.message);
      `;

      const context = {
        bru: { setVar: jest.fn() },
        res: {
          getStatus: jest.fn().mockReturnValue(200),
          getBody: jest.fn().mockReturnValue({ message: 'success' }),
          getHeader: jest.fn().mockReturnValue('application/json')
        },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.res.getStatus).toHaveBeenCalled();
      expect(context.res.getBody).toHaveBeenCalled();
      expect(context.res.getHeader).toHaveBeenCalledWith('content-type');
      expect(context.bru.setVar).toHaveBeenCalledWith('result', '200:application/json:success');
    });

    it('should provide bru, req, res to nested npm module dependencies', async () => {
      // Create parent module
      const parentDir = path.join(collectionPath, 'node_modules', 'parent-ctx-module');
      fs.mkdirSync(parentDir, { recursive: true });
      fs.writeFileSync(
        path.join(parentDir, 'index.js'),
        `const child = require('./child');
        module.exports = { childResult: child.getData() };`
      );
      // Create child module that accesses context
      fs.writeFileSync(
        path.join(parentDir, 'child.js'),
        `module.exports = {
          getData: function() {
            return {
              envVar: bru.getEnvVar('NESTED_VAR'),
              reqUrl: req.getUrl(),
              resStatus: res.getStatus()
            };
          }
        };`
      );

      const script = `
        const parent = require('parent-ctx-module');
        const data = parent.childResult;
        bru.setVar('result', data.envVar + '|' + data.reqUrl + '|' + data.resStatus);
      `;

      const getEnvVarMock = jest.fn().mockReturnValue('nested-value');
      const setVarMock = jest.fn();
      const getUrlMock = jest.fn().mockReturnValue('https://nested.example.com');
      const getStatusMock = jest.fn().mockReturnValue(201);
      const context = {
        bru: {
          getEnvVar: getEnvVarMock,
          setVar: setVarMock
        },
        req: {
          getUrl: getUrlMock
        },
        res: {
          getStatus: getStatusMock
        },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(getEnvVarMock).toHaveBeenCalledWith('NESTED_VAR');
      expect(getUrlMock).toHaveBeenCalled();
      expect(getStatusMock).toHaveBeenCalled();
      expect(setVarMock).toHaveBeenCalledWith('result', 'nested-value|https://nested.example.com|201');
    });

    describe('CommonJS module patterns', () => {
      it('should handle module.exports = object pattern', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'cjs-object');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.js'),
          'module.exports = { foo: "bar", num: 42 };'
        );

        const script = `
          const mod = require('cjs-object');
          bru.setVar('result', mod.foo + '-' + mod.num);
        `;

        const context = {
          bru: { setVar: jest.fn() },
          console: console
        };

        await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

        expect(context.bru.setVar).toHaveBeenCalledWith('result', 'bar-42');
      });

      it('should handle module.exports = function pattern', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'cjs-function');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.js'),
          'module.exports = function(x) { return x * 2; };'
        );

        const script = `
          const double = require('cjs-function');
          bru.setVar('result', double(21));
        `;

        const context = {
          bru: { setVar: jest.fn() },
          console: console
        };

        await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

        expect(context.bru.setVar).toHaveBeenCalledWith('result', 42);
      });

      it('should handle module.exports = class pattern', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'cjs-class');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.js'),
          `class Calculator {
            constructor(val) { this.val = val; }
            add(x) { return this.val + x; }
          }
          module.exports = Calculator;`
        );

        const script = `
          const Calculator = require('cjs-class');
          const calc = new Calculator(10);
          bru.setVar('result', calc.add(5));
        `;

        const context = {
          bru: { setVar: jest.fn() },
          console: console
        };

        await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

        expect(context.bru.setVar).toHaveBeenCalledWith('result', 15);
      });

      it('should handle exports.property pattern', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'cjs-exports');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.js'),
          `exports.add = function(a, b) { return a + b; };
          exports.multiply = function(a, b) { return a * b; };
          exports.VERSION = '1.0.0';`
        );

        const script = `
          const math = require('cjs-exports');
          bru.setVar('result', math.add(2, 3) + '-' + math.multiply(4, 5) + '-' + math.VERSION);
        `;

        const context = {
          bru: { setVar: jest.fn() },
          console: console
        };

        await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

        expect(context.bru.setVar).toHaveBeenCalledWith('result', '5-20-1.0.0');
      });

      it('should handle mixed module.exports and exports pattern', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'cjs-mixed');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.js'),
          `// module.exports takes precedence
          exports.ignored = 'this will be ignored';
          module.exports = { actual: 'value' };`
        );

        const script = `
          const mod = require('cjs-mixed');
          bru.setVar('result', mod.actual + '-' + (mod.ignored || 'undefined'));
        `;

        const context = {
          bru: { setVar: jest.fn() },
          console: console
        };

        await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

        expect(context.bru.setVar).toHaveBeenCalledWith('result', 'value-undefined');
      });
    });

    describe('File extension handling', () => {
      it('should load .cjs files as CommonJS', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'cjs-ext-module');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'package.json'),
          '{"name": "cjs-ext-module", "main": "index.cjs"}'
        );
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.cjs'),
          'module.exports = { format: "cjs", value: 100 };'
        );

        const script = `
          const mod = require('cjs-ext-module');
          bru.setVar('result', mod.format + '-' + mod.value);
        `;

        const context = {
          bru: { setVar: jest.fn() },
          console: console
        };

        await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

        expect(context.bru.setVar).toHaveBeenCalledWith('result', 'cjs-100');
      });

      it('should fail when loading .mjs files (ES modules)', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'mjs-ext-module');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'package.json'),
          '{"name": "mjs-ext-module", "main": "index.mjs"}'
        );
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.mjs'),
          'export default { format: "esm" };'
        );

        const script = `
          const mod = require('mjs-ext-module');
        `;

        const context = { console: console };

        await expect(
          runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} })
        ).rejects.toThrow();
      });

      it('should load module with package.json main field', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'custom-main');
        fs.mkdirSync(path.join(nodeModulesDir, 'lib'), { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'package.json'),
          '{"name": "custom-main", "main": "lib/entry.js"}'
        );
        fs.writeFileSync(
          path.join(nodeModulesDir, 'lib', 'entry.js'),
          'module.exports = { entry: "custom-main-lib" };'
        );

        const script = `
          const mod = require('custom-main');
          bru.setVar('result', mod.entry);
        `;

        const context = {
          bru: { setVar: jest.fn() },
          console: console
        };

        await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

        expect(context.bru.setVar).toHaveBeenCalledWith('result', 'custom-main-lib');
      });

      it('should require relative .cjs files within npm module', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'cjs-relative');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'helper.cjs'),
          'module.exports = { helperValue: "from-cjs" };'
        );
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.js'),
          'const helper = require("./helper.cjs"); module.exports = helper;'
        );

        const script = `
          const mod = require('cjs-relative');
          bru.setVar('result', mod.helperValue);
        `;

        const context = {
          bru: { setVar: jest.fn() },
          console: console
        };

        await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

        expect(context.bru.setVar).toHaveBeenCalledWith('result', 'from-cjs');
      });

      it('should load .json files directly', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'json-direct');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'package.json'),
          '{"name": "json-direct", "main": "data.json"}'
        );
        fs.writeFileSync(
          path.join(nodeModulesDir, 'data.json'),
          '{"type": "json-main", "count": 42}'
        );

        const script = `
          const data = require('json-direct');
          bru.setVar('result', data.type + '-' + data.count);
        `;

        const context = {
          bru: { setVar: jest.fn() },
          console: console
        };

        await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

        expect(context.bru.setVar).toHaveBeenCalledWith('result', 'json-main-42');
      });
    });

    describe('JSON file handling', () => {
      it('should load JSON files from npm modules', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'json-module');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'config.json'),
          '{"name": "test-config", "version": "1.0.0", "enabled": true}'
        );
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.js'),
          'const config = require("./config.json"); module.exports = config;'
        );

        const script = `
          const config = require('json-module');
          bru.setVar('result', config.name + '-' + config.version + '-' + config.enabled);
        `;

        const context = {
          bru: { setVar: jest.fn() },
          console: console
        };

        await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

        expect(context.bru.setVar).toHaveBeenCalledWith('result', 'test-config-1.0.0-true');
      });

      it('should handle nested JSON requires', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'nested-json');
        fs.mkdirSync(path.join(nodeModulesDir, 'data'), { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'data', 'schema.json'),
          '{"type": "object", "properties": {"id": {"type": "number"}}}'
        );
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.js'),
          'const schema = require("./data/schema.json"); module.exports = { schema };'
        );

        const script = `
          const mod = require('nested-json');
          bru.setVar('result', mod.schema.type + '-' + mod.schema.properties.id.type);
        `;

        const context = {
          bru: { setVar: jest.fn() },
          console: console
        };

        await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

        expect(context.bru.setVar).toHaveBeenCalledWith('result', 'object-number');
      });
    });

    describe('Node.js globals in npm modules', () => {
      it('should have access to Buffer', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'buffer-module');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.js'),
          `module.exports = {
            encode: function(str) { return Buffer.from(str).toString('base64'); },
            decode: function(b64) { return Buffer.from(b64, 'base64').toString('utf8'); }
          };`
        );

        const script = `
          const bufMod = require('buffer-module');
          const encoded = bufMod.encode('hello');
          const decoded = bufMod.decode(encoded);
          bru.setVar('result', encoded + '-' + decoded);
        `;

        const context = {
          bru: { setVar: jest.fn() },
          console: console
        };

        await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

        expect(context.bru.setVar).toHaveBeenCalledWith('result', 'aGVsbG8=-hello');
      });

      it('should have access to URL and URLSearchParams', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'url-module');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.js'),
          `module.exports = {
            parseUrl: function(urlStr) {
              const url = new URL(urlStr);
              return url.hostname;
            },
            buildQuery: function(params) {
              const search = new URLSearchParams(params);
              return search.toString();
            }
          };`
        );

        const script = `
          const urlMod = require('url-module');
          bru.setVar('result', urlMod.parseUrl('https://example.com/path'));
        `;

        const context = {
          bru: { setVar: jest.fn() },
          console: console
        };

        await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

        expect(context.bru.setVar).toHaveBeenCalledWith('result', 'example.com');
      });

      it('should have access to setTimeout/clearTimeout', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'timer-module');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.js'),
          `module.exports = {
            hasTimers: function() {
              return typeof setTimeout === 'function' && typeof clearTimeout === 'function';
            }
          };`
        );

        const script = `
          const timerMod = require('timer-module');
          bru.setVar('result', timerMod.hasTimers());
        `;

        const context = {
          bru: { setVar: jest.fn() },
          console: console
        };

        await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

        expect(context.bru.setVar).toHaveBeenCalledWith('result', true);
      });
    });

    describe('Error handling', () => {
      it('should throw error for non-existent module', async () => {
        const script = `
          const mod = require('non-existent-module-xyz');
        `;

        const context = { console: console };

        await expect(
          runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} })
        ).rejects.toThrow('Could not resolve module');
      });

      it('should throw error for module with syntax error', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'syntax-error-module');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.js'),
          'module.exports = { invalid syntax here'
        );

        const script = `
          const mod = require('syntax-error-module');
        `;

        const context = { console: console };

        await expect(
          runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} })
        ).rejects.toThrow();
      });

      it('should throw error for module with runtime error', async () => {
        const nodeModulesDir = path.join(collectionPath, 'node_modules', 'runtime-error-module');
        fs.mkdirSync(nodeModulesDir, { recursive: true });
        fs.writeFileSync(
          path.join(nodeModulesDir, 'index.js'),
          'throw new Error("Module initialization failed");'
        );

        const script = `
          const mod = require('runtime-error-module');
        `;

        const context = { console: console };

        await expect(
          runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} })
        ).rejects.toThrow('Module initialization failed');
      });
    });
  });

  describe('context isolation', () => {
    it('should have global pointing to isolated context (not host)', async () => {
      const context = {
        bru: { setVar: jest.fn() },
        console: console
      };

      // global exists but points to isolated context, so global.bru should exist
      // process is a sanitized object in the isolated context
      const script = `bru.setVar('result', typeof global.bru === 'object' && typeof global.process === 'object')`;

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.bru.setVar).toHaveBeenCalledWith('result', true);
    });

    it('should not have access to host fs module via globalThis', async () => {
      const context = {
        bru: { setVar: jest.fn() },
        console: console
      };

      const script = `bru.setVar('result', typeof globalThis.fs)`;

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.bru.setVar).toHaveBeenCalledWith('result', 'undefined');
    });

    it('should throw ReferenceError for undeclared variables', async () => {
      const context = { console: console };

      const script = `const x = someUndeclaredVar`;

      await expect(
        runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} })
      ).rejects.toThrow('someUndeclaredVar is not defined');
    });

    it('should have access to context objects via globalThis', async () => {
      const context = {
        bru: { setVar: jest.fn() },
        req: { url: 'http://test.com' },
        console: console
      };

      const script = `bru.setVar('result', typeof globalThis.req)`;

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.bru.setVar).toHaveBeenCalledWith('result', 'object');
    });

    it('should have access to allowed globals like Buffer', async () => {
      const context = {
        bru: { setVar: jest.fn() },
        console: console
      };

      const script = `bru.setVar('result', typeof globalThis.Buffer)`;

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.bru.setVar).toHaveBeenCalledWith('result', 'function');
    });

    it('should have access to process object with nextTick', async () => {
      const context = {
        bru: { setVar: jest.fn() },
        console: console
      };

      const script = `
        const hasSafeProps = typeof process.version === 'string' && typeof process.platform === 'string';
        const hasNextTick = typeof process.nextTick === 'function';
        bru.setVar('result', hasSafeProps && hasNextTick);
      `;

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.bru.setVar).toHaveBeenCalledWith('result', true);
    });

    it('should work with Array.isArray across context boundaries', async () => {
      const context = {
        bru: { setVar: jest.fn() },
        console: console
      };

      const script = `
        const arr = [1, 2, 3];
        bru.setVar('result', Array.isArray(arr));
      `;

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.bru.setVar).toHaveBeenCalledWith('result', true);
    });

    it('should have working Object methods', async () => {
      const context = {
        bru: { setVar: jest.fn() },
        console: console
      };

      const script = `
        const obj = { a: 1, b: 2 };
        bru.setVar('result', Object.keys(obj).join(','));
      `;

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.bru.setVar).toHaveBeenCalledWith('result', 'a,b');
    });
  });
});
