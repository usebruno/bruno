const { describe, it, expect } = require('@jest/globals');
const { generateScriptApi } = require('../../../scripts/generate-script-api');
const ScriptRuntime = require('../src/runtime/script-runtime');
const TestRuntime = require('../src/runtime/test-runtime');
const GrpcScriptRuntime = require('../src/grpc/grpc-script-runtime');

/*
 * Checks the documented script API against what scripts really get, in every context and in both
 * runtimes. The manifest is generated in memory from the current JSDoc by
 * scripts/generate-script-api.js, so the test needs no generated file on disk.
 *
 * - Documented but missing: a member the manifest lists for a context that the script can't reach.
 * - Wrong runtime tag: QuickJS (Safe Mode) must expose exactly the members without
 *   `@runtime nodevm`.
 * - Undocumented: a member a script can reach that is neither documented nor known to be internal.
 */

const { manifest } = generateScriptApi();

const RUNTIMES = ['nodevm', 'quickjs'];

// Host-facing state the runtimes read back after the script, marked @internal in the sources.
const INTERNAL_MEMBERS = {
  bru: [
    'envVariables',
    'runtimeVariables',
    'promptVariables',
    'processEnvVars',
    'collectionVariables',
    'folderVariables',
    'requestVariables',
    'globalEnvironmentVariables',
    'oauth2CredentialVariables',
    'collectionPath',
    'collectionName',
    'scriptedRequestEntries',
    'runtime',
    'requestUrl',
    'oauth2CredentialsToReset'
  ],
  req: ['req', 'hasJSONContentType'],
  res: ['res']
};

// A read-only list still has the write methods of its class; they throw, so the docs leave them out.
const READ_ONLY_LIST_WRITES = {
  'res.headerList': ['add', 'upsert', 'remove', 'clear', 'populate', 'repopulate', 'assimilate'],
  'bru.grpc.response.metadata': ['upsert', 'add', 'remove', 'clear'],
  'bru.grpc.response.trailers': ['upsert', 'add', 'remove', 'clear']
};

// Defined by the QuickJS shim (src/sandbox/quickjs/shims/bru.js) although Bru has no such method,
// so calling them in Safe Mode throws. Not documented, as there is nothing to call.
const SHIM_ONLY_MEMBERS = {
  quickjs: { bru: ['visualize', 'getSecretVar'] }
};

// Members a function-valued object (`res`) has as a function, not as script API.
const FUNCTION_INTRINSICS = ['length', 'name', 'prototype', 'arguments', 'caller'];

const makeRequest = () => ({
  url: 'https://example.com/users/:id?verbose=true',
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  data: '{"name":"probe"}',
  timeout: 1000,
  name: 'Probe',
  pathParams: [{ name: 'id', value: '1', type: 'path' }],
  tags: ['probe']
});

const makeResponse = () => ({
  status: 200,
  statusText: 'OK',
  headers: { 'content-type': 'application/json' },
  data: { name: 'probe' },
  responseTime: 5,
  request: { protocol: 'https:', host: 'example.com', path: '/users/1' }
});

const makeGrpcRequest = () => ({
  url: 'grpcb.in:9000',
  method: '/hello.HelloService/SayHello',
  methodType: 'unary',
  headers: { 'x-token': 'probe' },
  name: 'Probe'
});

const makeGrpcResponse = () => ({
  statusCode: 0,
  statusText: 'OK',
  messages: [{ data: { reply: 'hello' }, timestamp: 1700000000 }],
  metadata: [{ name: 'content-type', value: 'application/grpc' }],
  trailers: [{ name: 'grpc-status', value: '0' }],
  duration: 12
});

const grpcMessage = () => ({ data: { greeting: 'hi' }, timestamp: 1700000000 });

const runRequestByItemPathname = async () => ({});

/** Runs `script` in the context's runtime entry point, forwarding `console.log` to `onLog`. */
const CONTEXT_RUNNERS = {
  'pre-request': (runtime, script, onConsoleLog) =>
    new ScriptRuntime({ runtime }).runRequestScript(script, makeRequest(), {}, {}, '.', onConsoleLog, {}, undefined, runRequestByItemPathname, 'Probe'),
  'post-response': (runtime, script, onConsoleLog) =>
    new ScriptRuntime({ runtime }).runResponseScript(script, makeRequest(), makeResponse(), {}, {}, '.', onConsoleLog, {}, undefined, runRequestByItemPathname, 'Probe'),
  'tests': (runtime, script, onConsoleLog) =>
    new TestRuntime({ runtime }).runTests(script, makeRequest(), makeResponse(), {}, {}, '.', onConsoleLog, {}, undefined, runRequestByItemPathname, 'Probe'),
  'grpc:before-call-start': (runtime, script, onConsoleLog) =>
    new GrpcScriptRuntime({ runtime }).runGrpcRequestScript({
      script, request: makeGrpcRequest(), envVariables: {}, runtimeVariables: {}, collectionPath: '.', onConsoleLog, processEnvVars: {}
    }),
  'grpc:before-message-send': (runtime, script, onConsoleLog) =>
    new GrpcScriptRuntime({ runtime }).runGrpcBeforeMessageSendScript({
      script, request: makeGrpcRequest(), message: grpcMessage(), envVariables: {}, runtimeVariables: {}, collectionPath: '.', onConsoleLog, processEnvVars: {}
    }),
  'grpc:after-message-receive': (runtime, script, onConsoleLog) =>
    new GrpcScriptRuntime({ runtime }).runGrpcAfterMessageReceiveScript({
      script, request: makeGrpcRequest(), response: makeGrpcResponse(), message: grpcMessage(), envVariables: {}, runtimeVariables: {}, collectionPath: '.', onConsoleLog, processEnvVars: {}
    }),
  'grpc:after-call-end': (runtime, script, onConsoleLog) =>
    new GrpcScriptRuntime({ runtime }).runGrpcResponseScript({
      script, request: makeGrpcRequest(), response: makeGrpcResponse(), envVariables: {}, runtimeVariables: {}, collectionPath: '.', onConsoleLog, processEnvVars: {}
    })
};

/**
 * A script that reports, from inside the sandbox, which of `paths` exist and every member of each
 * of `objectPaths`, own or inherited.
 */
const probeScript = (paths, objectPaths) => `
  const roots = {
    bru: typeof bru === 'undefined' ? undefined : bru,
    req: typeof req === 'undefined' ? undefined : req,
    res: typeof res === 'undefined' ? undefined : res,
    test: typeof test === 'undefined' ? undefined : test,
    expect: typeof expect === 'undefined' ? undefined : expect,
    assert: typeof assert === 'undefined' ? undefined : assert
  };
  const resolve = (path) => path.split('.').reduce((value, key) => (value == null ? undefined : value[key]), roots);
  const exists = (path) => {
    const keys = path.split('.');
    if (keys.length === 1) return roots[path] !== undefined;
    const parent = resolve(keys.slice(0, -1).join('.'));
    return parent != null && keys[keys.length - 1] in Object(parent);
  };
  const membersOf = (value) => {
    const members = new Set();
    let current = value;
    // Stops before Object.prototype, and at Function.prototype for a callable.
    while (current != null && Object.getPrototypeOf(current) !== null) {
      if (current !== value && typeof current === 'function') break;
      Object.getOwnPropertyNames(current).forEach((name) => members.add(name));
      current = Object.getPrototypeOf(current);
    }
    return Array.from(members);
  };
  const paths = ${JSON.stringify(paths)};
  const objectPaths = ${JSON.stringify(objectPaths)};
  const members = {};
  objectPaths.filter(exists).forEach((path) => {
    const value = resolve(path);
    members[path] = { callable: typeof value === 'function', names: membersOf(value) };
  });
  console.log(JSON.stringify({ present: paths.filter(exists), members }));
`;

const probe = async (context, runtime) => {
  const entries = manifest.filter((entry) => entry.contexts.includes(context));
  const paths = [...new Set(entries.map((entry) => entry.path))];
  const objectPaths = paths.filter((p) => manifest.some((entry) => entry.path.startsWith(`${p}.`)));
  const logs = [];
  await CONTEXT_RUNNERS[context](runtime, probeScript(paths, objectPaths), (type, args) => {
    if (type === 'log') logs.push(args[0]);
  });
  expect(logs).toHaveLength(1);
  return { entries, paths, ...JSON.parse(logs[0]) };
};

const documentedChildren = (objectPath) => new Set(
  manifest
    .map((entry) => entry.path)
    .filter((p) => p.startsWith(`${objectPath}.`) && !p.slice(objectPath.length + 1).includes('.'))
    .map((p) => p.slice(objectPath.length + 1))
);

const contexts = Object.keys(CONTEXT_RUNNERS);

describe('script API parity with the manifest', () => {
  it('covers every context the manifest names', () => {
    const manifestContexts = new Set(manifest.flatMap((entry) => entry.contexts));
    expect([...manifestContexts].sort()).toEqual([...contexts].sort());
  });

  describe.each(RUNTIMES)('%s', (runtime) => {
    describe.each(contexts)('%s', (context) => {
      it('exposes every documented member, and in Safe Mode only those without @runtime nodevm', async () => {
        const { entries, paths, present } = await probe(context, runtime);
        const expected = paths.filter((p) => entries.some((entry) => entry.path === p && entry.runtimes.includes(runtime)));

        expect(expected.filter((p) => !present.includes(p))).toEqual([]);
        expect(present.filter((p) => !expected.includes(p))).toEqual([]);
      });

      it('exposes nothing undocumented', async () => {
        const { members } = await probe(context, runtime);
        const undocumented = Object.entries(members).flatMap(([objectPath, { callable, names }]) => {
          const documented = documentedChildren(objectPath);
          const internal = [
            ...(INTERNAL_MEMBERS[objectPath] || []),
            ...(READ_ONLY_LIST_WRITES[objectPath] || []),
            ...(SHIM_ONLY_MEMBERS[runtime]?.[objectPath] || [])
          ];
          return names
            .filter((name) => name !== 'constructor' && !name.startsWith('_'))
            .filter((name) => !(callable && FUNCTION_INTRINSICS.includes(name)))
            .filter((name) => !documented.has(name) && !internal.includes(name))
            .map((name) => `${objectPath}.${name}`);
        });

        expect(undocumented).toEqual([]);
      });
    });
  });
});
