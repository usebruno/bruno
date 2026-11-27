const { describe, it, expect } = require('@jest/globals');
const ScriptRuntime = require('../src/runtime/script-runtime');
const { createScriptConsole, CONSOLE_METHODS } = require('../src/runtime/script-console');

const request = {
  url: 'https://example.com/users',
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  data: '{"name":"probe"}',
  timeout: 1000,
  name: 'Probe'
};

const runRequestByItemPathname = async () => ({});

const RUNTIMES = ['nodevm', 'quickjs'];

const runScript = (runtime, script) => {
  const logs = [];
  const onConsoleLog = (type, args) => logs.push({ type, args });
  return new ScriptRuntime({ runtime })
    .runRequestScript(script, request, {}, {}, '.', onConsoleLog, {}, undefined, runRequestByItemPathname, 'Probe')
    .then((result) => ({ logs, result }));
};

describe('createScriptConsole', () => {
  it('implements exactly the documented console methods', () => {
    const console = createScriptConsole(() => {});

    expect(Object.keys(console).sort()).toEqual([...CONSOLE_METHODS].sort());
  });
});

describe.each(RUNTIMES)('script console (%s runtime)', (runtime) => {
  it('should expose every standard console method', async () => {
    const script = `
      const missing = ${JSON.stringify(CONSOLE_METHODS)}.filter((m) => typeof console[m] !== 'function');
      bru.setVar('missing', missing.join(','));
    `;

    const { result } = await runScript(runtime, script);

    expect(result.runtimeVariables.missing).toBe('');
  });

  it('should forward console.table output', async () => {
    const script = `
      console.table([{ name: 'a', value: 1 }, { name: 'b', value: 2 }]);
    `;

    const { logs } = await runScript(runtime, script);

    expect(logs).toHaveLength(1);
    expect(logs[0].args[0]).toEqual([
      { name: 'a', value: 1 },
      { name: 'b', value: 2 }
    ]);
  });

  it('should forward console.trace, console.dir and console.dirxml output', async () => {
    const script = `
      console.trace('traced');
      console.dir({ a: 1 });
      console.dirxml({ b: 2 });
    `;

    const { logs } = await runScript(runtime, script);

    expect(logs.map((l) => l.args[0])).toEqual(['traced', { a: 1 }, { b: 2 }]);
  });

  it('should only log console.assert when the assertion fails', async () => {
    const script = `
      console.assert(true, 'should not be logged');
      console.assert(false, 'should be logged');
    `;

    const { logs } = await runScript(runtime, script);

    expect(logs).toHaveLength(1);
    expect(logs[0].type).toBe('error');
    expect(logs[0].args).toContain('should be logged');
  });

  it('should count repeated console.count calls per label', async () => {
    const script = `
      console.count('hits');
      console.count('hits');
      console.count('misses');
    `;

    const { logs } = await runScript(runtime, script);

    expect(logs.map((l) => l.args[0])).toEqual(['hits: 1', 'hits: 2', 'misses: 1']);
  });

  it('should measure console.time / console.timeEnd and console.timeLog', async () => {
    const script = `
      console.time('token');
      console.timeLog('token');
      console.timeEnd('token');
    `;

    const { logs } = await runScript(runtime, script);

    expect(logs).toHaveLength(2);
    expect(logs[0].args[0]).toMatch(/^token: \d+(\.\d+)?ms$/);
    expect(logs[1].args[0]).toMatch(/^token: \d+(\.\d+)?ms$/);
  });

  it('should reset counters with console.countReset', async () => {
    const script = `
      console.count('hits');
      console.countReset('hits');
      console.count('hits');
    `;

    const { logs } = await runScript(runtime, script);

    expect(logs.map((l) => l.args[0])).toEqual(['hits: 1', 'hits: 1']);
  });

  it('should accept console.group, console.groupCollapsed, console.groupEnd and console.clear', async () => {
    const script = `
      console.group('outer');
      console.log('inside');
      console.groupCollapsed('inner');
      console.groupEnd();
      console.groupEnd();
      console.clear();
    `;

    const { logs } = await runScript(runtime, script);

    expect(logs.map((l) => l.args[0])).toEqual(['outer', 'inside', 'inner']);
  });
});
