const { describe, it, expect } = require('@jest/globals');
const GrpcScriptRuntime = require('../src/grpc/grpc-script-runtime');
const { loader: quickJsLoader } = require('../src/sandbox/quickjs');

const makeRequest = (overrides = {}) => ({
  url: 'grpcb.in:9000',
  method: '/hello.HelloService/SayHello',
  methodType: 'unary',
  headers: { 'X-Token': 'authored' },
  body: { grpc: [{ name: 'message 1', content: '{"greeting":"hi"}' }] },
  ...overrides
});

const makeResponse = (overrides = {}) => ({
  statusCode: 0,
  statusMessage: 'OK',
  messages: [{ data: { reply: 'hello' }, timestamp: 1700000000 }],
  metadata: [{ name: 'content-type', value: 'application/grpc' }],
  trailers: [{ name: 'grpc-status', value: '0' }],
  duration: 12,
  methodType: 'unary',
  ...overrides
});

// The QuickJS sandbox only defines `console` when a handler is supplied, and the bundled
// libraries reach for it as they load.
const onConsoleLog = () => {};

const runBeforeCallStart = (script, request, runtime = 'nodevm') =>
  new GrpcScriptRuntime({ runtime }).runGrpcRequestScript(script, request, {}, {}, '.', onConsoleLog, process.env);

const runAfterCallEnd = (script, request, response, { sentMessages = [], runtime = 'nodevm' } = {}) =>
  new GrpcScriptRuntime({ runtime }).runGrpcResponseScript(
    script,
    request,
    response,
    {},
    {},
    '.',
    onConsoleLog,
    process.env,
    undefined,
    undefined,
    { sentMessages }
  );

describe('GrpcScriptRuntime', () => {
  describe('beforeCallStart (runGrpcRequestScript)', () => {
    it('applies metadata writes to the request that will be sent', async () => {
      const request = makeRequest();

      const result = await runBeforeCallStart(`bru.grpc.request.metadata.set('x-token', 'from-hook');`, request);

      expect(result.request.headers).toEqual({ 'x-token': 'from-hook' });
    });

    it('exposes the request scalars, with no messages sent yet', async () => {
      const script = `
        bru.setVar('method', bru.grpc.request.method);
        bru.setVar('methodType', bru.grpc.request.methodType);
        bru.setVar('sentCount', bru.grpc.request.messages.count());
      `;

      const result = await runBeforeCallStart(script, makeRequest());

      expect(result.runtimeVariables).toEqual({
        method: '/hello.HelloService/SayHello',
        methodType: 'unary',
        sentCount: 0
      });
    });

    it('has no bru.grpc.response, since the call has not run yet', async () => {
      const result = await runBeforeCallStart(`bru.setVar('hasResponse', Boolean(bru.grpc.response));`, makeRequest());

      expect(result.runtimeVariables.hasResponse).toBe(false);
    });

    it('rejects bru.runRequest, which gRPC scripts cannot use', async () => {
      const script = `
        try {
          await bru.runRequest('some/request');
        } catch (e) {
          bru.setVar('error', e.message);
        }
      `;

      const result = await runBeforeCallStart(script, makeRequest());

      expect(result.runtimeVariables.error).toBe('bru.runRequest is not supported in gRPC scripts');
    });

    it('attaches what the hook set before it threw to the error it re-throws', async () => {
      const script = `
        bru.setVar('ranBefore', true);
        throw new Error('hook exploded');
      `;

      const error = await runBeforeCallStart(script, makeRequest()).catch((e) => e);

      expect(error.message).toContain('hook exploded');
      expect(error.partialResults.runtimeVariables).toEqual({ ranBefore: true });
    });

    it('returns null for the variable scopes the hook did not touch', async () => {
      const result = await runBeforeCallStart(`bru.setEnvVar('token', 'abc');`, makeRequest());

      expect(result.envVariables).toEqual({ token: 'abc' });
      expect(result.runtimeVariables).toBeNull();
      expect(result.collectionVariables).toBeNull();
      expect(result.globalEnvironmentVariables).toBeNull();
    });

    it('reads and writes the request through the QuickJS shim', async () => {
      await quickJsLoader();
      const script = `
        bru.grpc.request.metadata.set('x-token', 'from-hook');
        bru.setVar('metadataCount', bru.grpc.request.metadata.count());
        bru.setVar('sentCount', bru.grpc.request.messages.count());
      `;
      const request = makeRequest();

      const result = await runBeforeCallStart(script, request, 'quickjs');

      expect(result.request.headers).toEqual({ 'x-token': 'from-hook' });
      expect(result.runtimeVariables).toEqual({ metadataCount: 1, sentCount: 0 });
    });
  });

  describe('afterCallEnd (runGrpcResponseScript)', () => {
    it('exposes the completed call', async () => {
      const script = `
        bru.setVar('statusCode', bru.grpc.response.statusCode);
        bru.setVar('duration', bru.grpc.response.duration);
        bru.setVar('reply', bru.grpc.response.messages.get(0).data.reply);
        bru.setVar('contentType', bru.grpc.response.metadata.get('content-type'));
        bru.setVar('grpcStatus', bru.grpc.response.trailers.get('grpc-status'));
      `;

      const result = await runAfterCallEnd(script, makeRequest(), makeResponse());

      expect(result.runtimeVariables).toEqual({
        statusCode: 0,
        duration: 12,
        reply: 'hello',
        contentType: 'application/grpc',
        grpcStatus: '0'
      });
    });

    it('reports the messages that were sent, not the ones that were authored', async () => {
      const request = makeRequest({
        body: {
          grpc: [
            { name: 'message 1', content: '{"greeting":"hi"}' },
            { name: 'message 2', content: '{"greeting":"unsent"}' }
          ]
        }
      });
      const script = `
        bru.setVar('count', bru.grpc.request.messages.count());
        bru.setVar('greeting', bru.grpc.request.messages.get(0).data.greeting);
      `;

      const result = await runAfterCallEnd(script, request, makeResponse(), {
        sentMessages: [{ data: { greeting: 'hi' }, timestamp: 1700000000 }]
      });

      expect(result.runtimeVariables).toEqual({ count: 1, greeting: 'hi' });
    });

    it('rejects every metadata write once the call has ended', async () => {
      const script = `
        try { bru.grpc.request.metadata.set('x-token', 'too-late'); } catch (e) { bru.setVar('requestMetadata', e.message); }
        try { bru.grpc.response.trailers.delete('grpc-status'); } catch (e) { bru.setVar('responseTrailers', e.message); }
      `;
      const request = makeRequest();

      const result = await runAfterCallEnd(script, request, makeResponse());

      expect(result.runtimeVariables.requestMetadata).toContain('metadata.set() is not available');
      expect(result.runtimeVariables.responseTrailers).toContain('metadata.delete() is not available');
      expect(request.headers).toEqual({ 'X-Token': 'authored' });
    });

    it('reads the completed call through the QuickJS shim', async () => {
      await quickJsLoader();
      const script = `
        bru.setVar('statusCode', bru.grpc.response.statusCode);
        bru.setVar('reply', bru.grpc.response.messages.get(0).data.reply);
        bru.setVar('contentType', bru.grpc.response.metadata.get('content-type'));
        bru.setVar('sentCount', bru.grpc.request.messages.count());
      `;

      const result = await runAfterCallEnd(script, makeRequest(), makeResponse(), {
        sentMessages: [{ data: { greeting: 'hi' }, timestamp: 1700000000 }],
        runtime: 'quickjs'
      });

      expect(result.runtimeVariables).toEqual({
        statusCode: 0,
        reply: 'hello',
        contentType: 'application/grpc',
        sentCount: 1
      });
    });
  });
});
