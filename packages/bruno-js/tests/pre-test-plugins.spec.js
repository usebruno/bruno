const { describe, it, expect } = require('@jest/globals');
const TestRuntime = require('../src/runtime/test-runtime');
const ScriptRuntime = require('../src/runtime/script-runtime');

const baseRequest = {
  method: 'GET',
  url: 'http://localhost:3000/',
  headers: {},
  data: undefined
};

const baseResponse = {
  status: 200,
  statusText: 'OK',
  data: { count: 4 }
};

// A pure-JS chai plugin that registers a custom .beEvenNumber assertion.
const evenNumberPlugin = `
  chai.use(function (chai) {
    chai.Assertion.addMethod('beEvenNumber', function () {
      const v = this._obj;
      this.assert(
        typeof v === 'number' && v % 2 === 0,
        'expected #{this} to be an even number',
        'expected #{this} not to be an even number'
      );
    });
  });
`;

const brokenPlugin = `
  chai.use(function () {
    throw new Error('boom from plugin init');
  });
`;

const runWithPlugins = async (runtimeName, testFile, plugins) => {
  const runtime = new TestRuntime({ runtime: runtimeName });
  return runtime.runTests(
    testFile,
    { ...baseRequest },
    { ...baseResponse },
    {},
    {},
    '.',
    null,
    process.env,
    { plugins: { chai: plugins } }
  );
};

describe('pre-test plugins', () => {
  describe('nodevm runtime', () => {
    it('registers a custom chai assertion that user tests can use', async () => {
      const testFile = `
        test('count is even', () => {
          expect(res.getBody().count).to.beEvenNumber();
        });
      `;
      const result = await runWithPlugins('nodevm', testFile, [
        { name: 'even-number', enabled: true, code: evenNumberPlugin }
      ]);
      expect(result.results.map((r) => ({ description: r.description, status: r.status })))
        .toEqual([{ description: 'count is even', status: 'pass' }]);
    });

    it('skips disabled plugins', async () => {
      // Plugin sets a sentinel on the chai object; verify it is NOT set when
      // the plugin is disabled.
      const sentinelPlugin = `
        chai.use(function (chai) {
          chai.__bruno_sentinel_disabled_test = 'plugin-ran';
        });
      `;
      const testFile = `
        test('plugin did not run', () => {
          expect(chai.__bruno_sentinel_disabled_test).to.equal(undefined);
        });
      `;
      const result = await runWithPlugins('nodevm', testFile, [
        { name: 'sentinel', enabled: false, code: sentinelPlugin }
      ]);
      expect(result.results[0].status).toBe('pass');
    });

    it('attributes plugin init errors with the plugin name', async () => {
      const testFile = `test('placeholder', () => { expect(true).to.equal(true); });`;
      const result = await runWithPlugins('nodevm', testFile, [
        { name: 'busted', enabled: true, code: brokenPlugin },
        { name: 'even-number', enabled: true, code: evenNumberPlugin }
      ]);

      const initFailure = result.results.find((r) => r.description === 'Plugin init: busted');
      expect(initFailure).toBeTruthy();
      expect(initFailure.status).toBe('fail');
      expect(initFailure.error).toMatch(/boom from plugin init/);

      // Subsequent plugins still load — even-number remains usable
      const placeholder = result.results.find((r) => r.description === 'placeholder');
      expect(placeholder.status).toBe('pass');
    });

    it('runs with no plugins configured (back-compat)', async () => {
      const testFile = `test('passes', () => { expect(1).to.equal(1); });`;
      const result = await runWithPlugins('nodevm', testFile, undefined);
      expect(result.results[0].status).toBe('pass');
    });

    // Regression: chai is a Node module-level singleton. Once a plugin
    // registered `.beFlippableThing` on the Assertion prototype, that method
    // used to persist across runs even after the user toggled the plugin off.
    // The fix tracks plugin-added prototype keys and strips them at the start
    // of each run.
    //
    // Note: we check `chai.Assertion.prototype.hasOwnProperty` directly
    // instead of `expect({}).beFlippableThing` because chai's Proxy throws
    // on unknown-property access ("Invalid Chai property: ...").
    it('removes assertion methods when a plugin is toggled off between runs', async () => {
      const flippablePlugin = `
        chai.use(function (chai) {
          chai.Assertion.addMethod('beFlippableThing', function () {
            this.assert(true, '', '');
          });
        });
      `;

      // Run 1: plugin enabled — assertion should be registered on the prototype
      const r1 = await runWithPlugins(
        'nodevm',
        `test('method registered', () => { expect(chai.Assertion.prototype.hasOwnProperty('beFlippableThing')).to.equal(true); });`,
        [{ name: 'flippable', enabled: true, code: flippablePlugin }]
      );
      expect(r1.results[0].status).toBe('pass');

      // Run 2: plugin disabled — assertion must be removed from the prototype
      const r2 = await runWithPlugins(
        'nodevm',
        `test('method removed', () => { expect(chai.Assertion.prototype.hasOwnProperty('beFlippableThing')).to.equal(false); });`,
        [{ name: 'flippable', enabled: false, code: flippablePlugin }]
      );
      expect(r2.results[0].status).toBe('pass');
    });
  });

  describe('quickjs runtime', () => {
    it('registers a custom chai assertion that user tests can use', async () => {
      const testFile = `
        test('count is even', () => {
          expect(res.getBody().count).to.beEvenNumber();
        });
      `;
      const result = await runWithPlugins('quickjs', testFile, [
        { name: 'even-number', enabled: true, code: evenNumberPlugin }
      ]);
      expect(result.results.map((r) => ({ description: r.description, status: r.status })))
        .toEqual([{ description: 'count is even', status: 'pass' }]);
    });

    it('attributes plugin init errors with the plugin name', async () => {
      const testFile = `test('placeholder', () => { expect(true).to.equal(true); });`;
      const result = await runWithPlugins('quickjs', testFile, [
        { name: 'busted', enabled: true, code: brokenPlugin }
      ]);

      const initFailure = result.results.find((r) => r.description === 'Plugin init: busted');
      expect(initFailure).toBeTruthy();
      expect(initFailure.status).toBe('fail');
      expect(initFailure.error).toMatch(/boom from plugin init/);
    });
  });

  describe('script-runtime parity (pre-request + post-response)', () => {
    // Use a uniquely-named plugin so cross-test chai-singleton leakage in node-vm
    // mode can't mask a missing registration.
    const uppercaseStringPlugin = `
      chai.use(function (chai) {
        chai.Assertion.addMethod('beUppercaseString', function () {
          const v = this._obj;
          this.assert(
            typeof v === 'string' && v === v.toUpperCase(),
            'expected #{this} to be an uppercase string',
            'expected #{this} not to be an uppercase string'
          );
        });
      });
    `;

    const runRequestScriptWith = async (runtimeName, script, plugins) => {
      const runtime = new ScriptRuntime({ runtime: runtimeName });
      return runtime.runRequestScript(
        script,
        { ...baseRequest },
        {},
        {},
        '.',
        null,
        process.env,
        { plugins: { chai: plugins } }
      );
    };

    const runResponseScriptWith = async (runtimeName, script, plugins) => {
      const runtime = new ScriptRuntime({ runtime: runtimeName });
      return runtime.runResponseScript(
        script,
        { ...baseRequest },
        { ...baseResponse },
        {},
        {},
        '.',
        null,
        process.env,
        { plugins: { chai: plugins } }
      );
    };

    it('makes plugin assertions available in pre-request scripts (quickjs)', async () => {
      const script = `
        test('uppercase header value', () => {
          expect('HELLO').to.beUppercaseString();
        });
      `;
      const result = await runRequestScriptWith('quickjs', script, [
        { name: 'uppercase', enabled: true, code: uppercaseStringPlugin }
      ]);
      expect(result.results[0].status).toBe('pass');
    });

    it('makes plugin assertions available in post-response scripts (quickjs)', async () => {
      const script = `
        test('status text uppercase', () => {
          expect('OK').to.beUppercaseString();
        });
      `;
      const result = await runResponseScriptWith('quickjs', script, [
        { name: 'uppercase', enabled: true, code: uppercaseStringPlugin }
      ]);
      expect(result.results[0].status).toBe('pass');
    });

    it('makes plugin assertions available in pre-request scripts (nodevm)', async () => {
      const script = `
        test('uppercase header value', () => {
          expect('WORLD').to.beUppercaseString();
        });
      `;
      const result = await runRequestScriptWith('nodevm', script, [
        { name: 'uppercase', enabled: true, code: uppercaseStringPlugin }
      ]);
      expect(result.results[0].status).toBe('pass');
    });
  });
});
