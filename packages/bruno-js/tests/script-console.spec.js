const { describe, it, expect } = require('@jest/globals');
const ScriptRuntime = require('../src/runtime/script-runtime');
const { createScriptConsole, CONSOLE_METHODS } = require('../src/runtime/script-console');
const TestRuntime = require('../src/runtime/test-runtime');
const GrpcScriptRuntime = require('../src/grpc/grpc-script-runtime');
const { wrapConsoleWithSerializers } = require('../src/sandbox/node-vm/console');

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
    .runRequestScript(script, { ...request }, {}, {}, '.', onConsoleLog, {}, undefined, runRequestByItemPathname, 'Probe')
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

  it('should serialize Set and Map arguments for logging', async () => {
    const script = `
      console.log(new Set([1, 2]));
      console.log(new Map([['a', 1]]));
    `;

    const { logs } = await runScript(runtime, script);

    expect(logs.map((l) => l.args[0])).toEqual([
      { __brunoType: 'Set', __brunoValue: [1, 2] },
      { __brunoType: 'Map', __brunoValue: [['a', 1]] }
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

  it('should keep the first start when console.time is called twice', async () => {
    const script = `
      console.time('phase');
      await bru.sleep(60);
      console.time('phase');
      console.timeEnd('phase');
    `;

    const { logs } = await runScript(runtime, script);

    expect(logs).toHaveLength(1);
    const elapsed = Number(logs[0].args[0].match(/^phase: (\d+(?:\.\d+)?)ms$/)[1]);
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });

  it('should forward extra arguments to console.timeLog', async () => {
    const script = `
      console.time('phase');
      console.timeLog('phase', { completed: 3 });
      console.timeEnd('phase');
    `;

    const { logs } = await runScript(runtime, script);

    expect(logs).toHaveLength(2);
    expect(logs[0].args[0]).toMatch(/^phase: \d+(\.\d+)?ms$/);
    expect(logs[0].args[1]).toEqual({ completed: 3 });
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

describe('the other runtimes wire the same script console', () => {
  const runTestsScript = async (script) => {
    const logs = [];
    const onConsoleLog = (type, args) => logs.push({ type, args });
    await new TestRuntime({ runtime: 'nodevm' }).runTests(
      script,
      { ...request },
      { status: 200, statusText: 'OK', data: [] },
      {},
      {},
      '.',
      onConsoleLog
    );
    return logs;
  };

  const runGrpcScript = async (script) => {
    const logs = [];
    const onConsoleLog = (type, args) => logs.push({ type, args });
    await new GrpcScriptRuntime({ runtime: 'nodevm' }).runGrpcRequestScript({
      script,
      request: {
        ...request,
        methodType: 'unary',
        body: { grpc: [{ name: 'message 1', content: '{"greeting":"hi"}' }] }
      },
      envVariables: {},
      runtimeVariables: {},
      collectionPath: '.',
      onConsoleLog
    });
    return logs;
  };

  it('TestRuntime forwards console output from a tests script', async () => {
    const logs = await runTestsScript(`console.log('from tests'); console.count('hits');`);

    expect(logs.map((l) => l.args[0])).toEqual(['from tests', 'hits: 1']);
  });

  it('GrpcScriptRuntime forwards console output from a gRPC hook', async () => {
    const logs = await runGrpcScript(`console.log('from grpc'); console.warn('careful');`);

    expect(logs.map((l) => l.type)).toEqual(['log', 'warn']);
    expect(logs.map((l) => l.args[0])).toEqual(['from grpc', 'careful']);
  });
});

describe('wrapConsoleWithSerializers', () => {
  class HostConsole {
    constructor() {
      this.calls = [];
    }

    log(...args) {
      this.calls.push(args);
    }
  }

  it('wraps inherited console methods and keeps their this', () => {
    const host = new HostConsole();
    const wrapped = wrapConsoleWithSerializers(host);

    wrapped.log(new Set([1, 2]));

    expect(wrapped.log).not.toBe(host.log);
    expect(host.calls).toEqual([[{ __brunoType: 'Set', __brunoValue: [1, 2] }]]);
  });

  it('leaves callables outside CONSOLE_METHODS untouched', () => {
    const host = new HostConsole();
    host.Console = class Console {};
    host.context = () => ({});
    const wrapped = wrapConsoleWithSerializers(host);

    expect(wrapped.Console).toBe(host.Console);
    expect(wrapped.context).toBe(host.context);
  });
});
