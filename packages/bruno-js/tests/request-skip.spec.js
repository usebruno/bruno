const ScriptRuntime = require('../src/runtime/script-runtime');
const { loader: quickJsLoader } = require('../src/sandbox/quickjs');

const baseRequest = {
  method: 'GET',
  url: 'http://localhost:3000/',
  headers: {},
  data: undefined
};

const runPreRequestScript = async (runtime, script, requestOverrides = {}) => {
  if (runtime === 'quickjs') {
    await quickJsLoader();
  }

  const scriptRuntime = new ScriptRuntime({ runtime });
  return scriptRuntime.runRequestScript(
    script,
    { ...baseRequest, ...requestOverrides },
    {},
    {},
    '.',
    () => {},
    process.env
  );
};

describe.each(['nodevm', 'quickjs'])('request skipping in %s', (runtime) => {
  test('req.skip() returns a structured skipped result', async () => {
    const result = await runPreRequestScript(runtime, 'req.skip();');

    expect(result).toEqual(expect.objectContaining({
      skipped: true,
      skipRequest: true,
      skipReason: undefined
    }));
    expect(result.results).toEqual([]);
  });

  test('req.skip(reason) preserves the reason', async () => {
    const result = await runPreRequestScript(
      runtime,
      `req.skip('Feature unavailable in this environment');`
    );

    expect(result).toEqual(expect.objectContaining({
      skipped: true,
      skipRequest: true,
      skipReason: 'Feature unavailable in this environment'
    }));
  });

  test('does not resolve lazy proxy configuration for the skipped request', async () => {
    const certsAndProxyConfig = jest.fn().mockResolvedValue({ proxyMode: 'off' });

    const result = await runPreRequestScript(
      runtime,
      `req.skip('Feature unavailable in this environment');`,
      { certsAndProxyConfig }
    );

    expect(result.skipped).toBe(true);
    expect(certsAndProxyConfig).not.toHaveBeenCalled();
  });

  test('bru.runner.skipRequest(reason) maps to the same skip state', async () => {
    const result = await runPreRequestScript(
      runtime,
      `bru.runner.skipRequest('Test data is unavailable');`
    );

    expect(result).toEqual(expect.objectContaining({
      skipped: true,
      skipRequest: true,
      skipReason: 'Test data is unavailable'
    }));
  });

  test('bru.runner.skipRequest() remains backward compatible', async () => {
    const result = await runPreRequestScript(runtime, 'bru.runner.skipRequest();');

    expect(result).toEqual(expect.objectContaining({
      skipped: true,
      skipRequest: true,
      skipReason: undefined
    }));
  });

  test('normalizes a supplied skip reason', async () => {
    const result = await runPreRequestScript(runtime, `req.skip('  Optional test data is unavailable  ');`);

    expect(result.skipReason).toBe('Optional test data is unavailable');
  });

  test('normal requests are not marked as skipped', async () => {
    const result = await runPreRequestScript(runtime, `bru.setVar('executed', true);`);

    expect(result.skipped).toBe(false);
    expect(result.skipRequest).toBeUndefined();
    expect(result.skipReason).toBeUndefined();
  });

  test('stopExecution and setNextRequest retain their existing semantics', async () => {
    const result = await runPreRequestScript(
      runtime,
      `
        bru.runner.stopExecution();
        bru.runner.setNextRequest('next-request');
      `
    );

    expect(result.stopExecution).toBe(true);
    expect(result.nextRequestName).toBe('next-request');
    expect(result.skipped).toBe(false);
  });
});
