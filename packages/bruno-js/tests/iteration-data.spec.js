const { describe, it, expect, beforeAll } = require('@jest/globals');
const Bru = require('../src/bru');
const ScriptRuntime = require('../src/runtime/script-runtime');
const AssertRuntime = require('../src/runtime/assert-runtime');
const { loader: quickJsLoader } = require('../src/sandbox/quickjs');

const makeBru = (options = {}) =>
  new Bru({
    runtime: 'quickjs',
    envVariables: {},
    runtimeVariables: {},
    processEnvVars: {},
    collectionPath: '/',
    collectionName: 'Test',
    ...options
  });

describe('Iteration data APIs', () => {
  describe('bru.getIterationData', () => {
    it('returns the value of a column in the current row', () => {
      const bru = makeBru({ iterationDataVariables: { username: 'alice' } });
      expect(bru.getIterationData('username')).toBe('alice');
    });

    it('returns undefined and reports the name as unresolved when the column is missing', () => {
      const unresolved = [];
      const bru = makeBru({ iterationDataVariables: {}, onUnresolved: (name) => unresolved.push(name) });
      expect(bru.getIterationData('missing')).toBeUndefined();
      expect(unresolved).toEqual(['missing']);
    });

    it('interpolates variable references inside the value', () => {
      const bru = makeBru({ envVariables: { host: 'example.com' }, iterationDataVariables: { url: 'https://{{host}}/a' } });
      expect(bru.getIterationData('url')).toBe('https://example.com/a');
    });
  });

  describe('bru.getIteration', () => {
    it('returns the 0-based iteration index', () => {
      expect(makeBru({ iterationIndex: 2 }).getIteration()).toBe(2);
    });

    it('is 0 outside of a data-driven run', () => {
      expect(makeBru().getIteration()).toBe(0);
    });
  });

  describe('bru.interpolate precedence', () => {
    it('lets iteration data override environment and collection variables', () => {
      const bru = makeBru({
        collectionVariables: { user: 'collection' },
        envVariables: { user: 'env' },
        iterationDataVariables: { user: 'row' }
      });
      expect(bru.interpolate('{{user}}')).toBe('row');
    });

    it('lets folder, request and runtime variables override iteration data', () => {
      expect(makeBru({ iterationDataVariables: { v: 'row' }, folderVariables: { v: 'folder' } }).interpolate('{{v}}')).toBe('folder');
      expect(makeBru({ iterationDataVariables: { v: 'row' }, requestVariables: { v: 'request' } }).interpolate('{{v}}')).toBe('request');
      expect(makeBru({ iterationDataVariables: { v: 'row' }, runtimeVariables: { v: 'runtime' } }).interpolate('{{v}}')).toBe('runtime');
    });
  });

  describe('scripts', () => {
    const request = {
      method: 'GET',
      url: 'http://localhost:3000/',
      headers: {},
      iterationIndex: 1,
      iterationDataVariables: { username: 'bob', age: '30' }
    };
    const script = `
      bru.setVar('seenUser', bru.getIterationData('username'));
      bru.setVar('seenIteration', bru.getIteration());
      bru.setVar('greeting', bru.interpolate('hi {{username}}'));
    `;

    beforeAll(async () => {
      await quickJsLoader();
    });

    it.each(['nodevm', 'quickjs'])('read the current row and iteration in the %s sandbox', async (sandbox) => {
      const runtime = new ScriptRuntime({ runtime: sandbox });
      const result = await runtime.runRequestScript(script, { ...request }, {}, {}, '.', () => {}, process.env);
      expect(result.runtimeVariables).toMatchObject({ seenUser: 'bob', seenIteration: 1, greeting: 'hi bob' });
    });
  });

  describe('assertions', () => {
    it('resolve {{column}} in the expected value from the current row', () => {
      const runtime = new AssertRuntime({ runtime: 'nodevm' });
      const results = runtime.runAssertions(
        [{ name: 'res.body.name', value: 'eq {{username}}', enabled: true }],
        { url: 'http://localhost', iterationDataVariables: { username: 'carol' } },
        { status: 200, data: { name: 'carol' } },
        {},
        {},
        {}
      );
      expect(results[0].status).toBe('pass');
    });
  });
});
