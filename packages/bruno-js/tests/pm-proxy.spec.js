const { describe, it, expect } = require('@jest/globals');
const ScriptRuntime = require('../src/runtime/script-runtime');
const TestRuntime = require('../src/runtime/test-runtime');

describe('pm/postman proxy guard', () => {
  const baseRequest = {
    method: 'GET',
    url: 'http://localhost:3000/',
    headers: {},
    data: undefined
  };
  const baseResponse = {
    status: 200,
    statusText: 'OK',
    data: { id: 1 }
  };

  describe.each(['nodevm', 'quickjs'])('%s runtime', (runtime) => {
    it('should not throw when pm.vault.get() is called and should collect warning', async () => {
      const script = `pm.vault.get('secret');`;
      const scriptRuntime = new ScriptRuntime({ runtime });

      const result = await scriptRuntime.runRequestScript(
        script, { ...baseRequest }, {}, {}, '.', null, process.env
      );

      expect(result.pmApiWarnings).toEqual(
        expect.arrayContaining([expect.stringMatching(/pm\.vault/)])
      );
    });

    it('should not throw when pm property is accessed (e.g. pm.info.requestId) and should collect warning', async () => {
      const script = `const id = pm.info.requestId;`;
      const scriptRuntime = new ScriptRuntime({ runtime });

      const result = await scriptRuntime.runRequestScript(
        script, { ...baseRequest }, {}, {}, '.', null, process.env
      );

      expect(result.pmApiWarnings).toEqual(
        expect.arrayContaining([expect.stringMatching(/pm\.info/)])
      );
    });

    it('should not throw when postman.setGlobalVariable() is called and should collect warning', async () => {
      const script = `postman.setGlobalVariable('key', 'value');`;
      const scriptRuntime = new ScriptRuntime({ runtime });

      const result = await scriptRuntime.runRequestScript(
        script, { ...baseRequest }, {}, {}, '.', null, process.env
      );

      expect(result.pmApiWarnings).toEqual(
        expect.arrayContaining([expect.stringMatching(/postman\.setGlobalVariable/)])
      );
    });

    it('should collect warning when pm is used inside test() callback without failing the test', async () => {
      const testScript = `
        test('uses unsupported pm api', () => {
          pm.vault.get('secret');
        });
      `;
      const testRuntime = new TestRuntime({ runtime });
      const result = await testRuntime.runTests(
        testScript,
        { ...baseRequest },
        { ...baseResponse },
        {},
        {},
        '.',
        null,
        process.env
      );

      expect(result.results).toHaveLength(1);
      expect(result.results[0].status).toBe('pass');
      expect(result.pmApiWarnings).toEqual(
        expect.arrayContaining([expect.stringMatching(/pm\.vault/)])
      );
    });

    it('should return empty pmApiWarnings when no pm/postman APIs are used', async () => {
      const script = `const x = 1 + 1;`;
      const scriptRuntime = new ScriptRuntime({ runtime });

      const result = await scriptRuntime.runRequestScript(
        script, { ...baseRequest }, {}, {}, '.', null, process.env
      );

      expect(result.pmApiWarnings).toEqual([]);
    });

    it('should only keep the deepest path, not intermediate accesses', async () => {
      const script = `pm.vault.get('secret');`;
      const scriptRuntime = new ScriptRuntime({ runtime });

      const result = await scriptRuntime.runRequestScript(
        script, { ...baseRequest }, {}, {}, '.', null, process.env
      );

      // Should only have the deepest path, not "pm.vault"
      expect(result.pmApiWarnings).not.toContain('pm.vault');
      expect(result.pmApiWarnings).toContain('pm.vault.get');
    });

    it('should deduplicate warnings for repeated access of the same pm path', async () => {
      const script = `
        pm.vault.get('a');
        pm.vault.get('b');
      `;
      const scriptRuntime = new ScriptRuntime({ runtime });

      const result = await scriptRuntime.runRequestScript(
        script, { ...baseRequest }, {}, {}, '.', null, process.env
      );

      const vaultGetCount = result.pmApiWarnings.filter((w) => w === 'pm.vault.get').length;
      expect(vaultGetCount).toBe(1);
    });
  });
});
