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
      let callCount = 0;
      fs.writeFileSync(
        path.join(collectionPath, 'cached.js'),
        `
        module.exports = { count: ${++callCount} };
        `
      );

      const script = `
        const mod1 = require('./cached');
        const mod2 = require('./cached');
        bru.setVar('same', mod1.count === mod2.count);
      `;

      const context = {
        bru: { setVar: jest.fn() },
        console: console
      };

      await runScriptInNodeVm({ script, context, collectionPath, scriptingConfig: {} });

      expect(context.bru.setVar).toHaveBeenCalledWith('same', true);
    });
  });
});
