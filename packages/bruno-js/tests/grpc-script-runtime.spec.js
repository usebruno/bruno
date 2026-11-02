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
  statusText: 'OK',
  messages: [{ data: { reply: 'hello' }, timestamp: 1700000000 }],
  metadata: [{ name: 'content-type', value: 'application/grpc' }],
  trailers: [{ name: 'grpc-status', value: '0' }],
  duration: 12,
  ...overrides
});

// The QuickJS sandbox only defines `console` when a handler is supplied, and the bundled
// libraries reach for it as they load.
const onConsoleLog = () => {};

const runBeforeCallStart = (script, request, runtime = 'nodevm') =>
  new GrpcScriptRuntime({ runtime }).runGrpcRequestScript({
    script,
    request,
    envVariables: {},
    runtimeVariables: {},
    collectionPath: '.',
    onConsoleLog,
    processEnvVars: process.env
  });

const runBeforeMessageSend = (
  script,
  request,
  message,
  { sentMessages = [], runtime = 'nodevm' } = {}
) =>
  new GrpcScriptRuntime({ runtime }).runGrpcBeforeMessageSendScript({
    script,
    request,
    message,
    envVariables: {},
    runtimeVariables: {},
    collectionPath: '.',
    onConsoleLog,
    processEnvVars: process.env,
    sentMessages
  });

const runAfterMessageReceive = (
  script,
  request,
  response,
  message,
  { sentMessages = [], runtime = 'nodevm' } = {}
) =>
  new GrpcScriptRuntime({ runtime }).runGrpcAfterMessageReceiveScript({
    script,
    request,
    response,
    message,
    envVariables: {},
    runtimeVariables: {},
    collectionPath: '.',
    onConsoleLog,
    processEnvVars: process.env,
    sentMessages
  });

const runAfterCallEnd = (
  script,
  request,
  response,
  { sentMessages = [], runtime = 'nodevm' } = {}
) =>
  new GrpcScriptRuntime({ runtime }).runGrpcResponseScript({
    script,
    request,
    response,
    envVariables: {},
    runtimeVariables: {},
    collectionPath: '.',
    onConsoleLog,
    processEnvVars: process.env,
    sentMessages
  });

describe('GrpcScriptRuntime', () => {
  describe('beforeCallStart (runGrpcRequestScript)', () => {
    it.each(['nodevm', 'quickjs'])(
      'applies metadata writes to the request that will be sent (%s)',
      async (runtime) => {
        if (runtime === 'quickjs') await quickJsLoader();
        const script = `
        bru.grpc.request.metadata.upsert('x-token', 'from-hook');
        bru.setVar('metadataCount', bru.grpc.request.metadata.count());
      `;

        const result = await runBeforeCallStart(script, makeRequest(), runtime);

        expect(result.request.headers).toEqual({ 'x-token': 'from-hook' });
        expect(result.runtimeVariables.metadataCount).toBe(1);
      }
    );

    it.each(['nodevm', 'quickjs'])(
      'exposes the request scalars, with no messages sent yet (%s)',
      async (runtime) => {
        if (runtime === 'quickjs') await quickJsLoader();
        const script = `
        bru.setVar('method', bru.grpc.request.method);
        bru.setVar('methodType', bru.grpc.request.methodType);
        bru.setVar('sentCount', bru.grpc.request.messages.count());
      `;

        const result = await runBeforeCallStart(script, makeRequest(), runtime);

        expect(result.runtimeVariables).toEqual({
          method: '/hello.HelloService/SayHello',
          methodType: 'unary',
          sentCount: 0
        });
      }
    );

    it.each(['nodevm', 'quickjs'])(
      'has no bru.grpc.response, since the call has not run yet (%s)',
      async (runtime) => {
        if (runtime === 'quickjs') await quickJsLoader();
        const result = await runBeforeCallStart(
          `bru.setVar('hasResponse', Boolean(bru.grpc.response));`,
          makeRequest(),
          runtime
        );

        expect(result.runtimeVariables.hasResponse).toBe(false);
      }
    );

    it('rejects bru.runRequest, which gRPC scripts cannot use', async () => {
      const script = `
        try {
          await bru.runRequest('some/request');
        } catch (e) {
          bru.setVar('error', e.message);
        }
      `;

      const result = await runBeforeCallStart(script, makeRequest());

      expect(result.runtimeVariables.error).toBe(
        'bru.runRequest is not supported in gRPC scripts'
      );
    });

    it('attaches what the hook set before it threw to the error it re-throws', async () => {
      const script = `
        bru.setVar('ranBefore', true);
        throw new Error('hook exploded');
      `;

      const error = await runBeforeCallStart(script, makeRequest()).catch(
        (e) => e
      );

      expect(error.message).toContain('hook exploded');
      expect(error.partialResults.runtimeVariables).toEqual({
        ranBefore: true
      });
    });

    it('returns null for the variable scopes the hook did not touch', async () => {
      const result = await runBeforeCallStart(
        `bru.setEnvVar('token', 'abc');`,
        makeRequest()
      );

      expect(result.envVariables).toEqual({ token: 'abc' });
      expect(result.runtimeVariables).toBeNull();
      expect(result.collectionVariables).toBeNull();
      expect(result.globalEnvironmentVariables).toBeNull();
    });
  });

  describe('afterCallEnd (runGrpcResponseScript)', () => {
    it.each(['nodevm', 'quickjs'])(
      'exposes the completed call (%s)',
      async (runtime) => {
        if (runtime === 'quickjs') await quickJsLoader();
        const script = `
        bru.setVar('statusCode', bru.grpc.response.statusCode);
        bru.setVar('duration', bru.grpc.response.duration);
        bru.setVar('reply', bru.grpc.response.messages.get(0).data.reply);
        bru.setVar('contentType', bru.grpc.response.metadata.get('content-type'));
        bru.setVar('grpcStatus', bru.grpc.response.trailers.get('grpc-status'));
      `;

        const result = await runAfterCallEnd(
          script,
          makeRequest(),
          makeResponse(),
          { runtime }
        );

        expect(result.runtimeVariables).toEqual({
          statusCode: 0,
          duration: 12,
          reply: 'hello',
          contentType: 'application/grpc',
          grpcStatus: '0'
        });
      }
    );

    it.each(['nodevm', 'quickjs'])(
      'reports the messages that were sent, not the ones that were authored (%s)',
      async (runtime) => {
        if (runtime === 'quickjs') await quickJsLoader();
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
          sentMessages: [{ data: { greeting: 'hi' }, timestamp: 1700000000 }],
          runtime
        });

        expect(result.runtimeVariables).toEqual({ count: 1, greeting: 'hi' });
      }
    );

    it.each(['nodevm', 'quickjs'])(
      'rejects every metadata write once the call has ended (%s)',
      async (runtime) => {
        if (runtime === 'quickjs') await quickJsLoader();
        const script = `
        try { bru.grpc.request.metadata.upsert('x-token', 'too-late'); } catch (e) { bru.setVar('requestMetadata', e.message); }
        try { bru.grpc.response.trailers.remove('grpc-status'); } catch (e) { bru.setVar('responseTrailers', e.message); }
      `;
        const request = makeRequest();

        const result = await runAfterCallEnd(script, request, makeResponse(), {
          runtime
        });

        expect(result.runtimeVariables.requestMetadata).toContain(
          'metadata.upsert() is not available'
        );
        expect(result.runtimeVariables.responseTrailers).toContain(
          'metadata.remove() is not available'
        );
        expect(request.headers).toEqual({ 'X-Token': 'authored' });
      }
    );
  });

  describe('beforeMessageSend (runGrpcBeforeMessageSendScript)', () => {
    const outbound = { data: { greeting: 'outbound' }, timestamp: 1700000005 };

    it.each(['nodevm', 'quickjs'])(
      'exposes the message about to be sent (%s)',
      async (runtime) => {
        if (runtime === 'quickjs') await quickJsLoader();
        const script = `
        bru.setVar('greeting', bru.grpc.request.message.data.greeting);
        bru.setVar('timestamp', bru.grpc.request.message.timestamp);
        bru.setVar('methodType', bru.grpc.request.methodType);
      `;

        const result = await runBeforeMessageSend(
          script,
          makeRequest(),
          outbound,
          { runtime }
        );

        expect(result.runtimeVariables).toEqual({
          greeting: 'outbound',
          timestamp: 1700000005,
          methodType: 'unary'
        });
      }
    );

    it.each(['nodevm', 'quickjs'])(
      'messages holds only what was already transmitted (%s)',
      async (runtime) => {
        if (runtime === 'quickjs') await quickJsLoader();
        const script = `
        bru.setVar('sentCount', bru.grpc.request.messages.count());
        bru.setVar('lastSent', bru.grpc.request.messages.get(0).data.greeting);
        bru.setVar('pending', bru.grpc.request.message.data.greeting);
      `;

        const result = await runBeforeMessageSend(
          script,
          makeRequest({ methodType: 'bidi-streaming' }),
          outbound,
          {
            sentMessages: [
              { data: { greeting: 'first' }, timestamp: 1700000000 }
            ],
            runtime
          }
        );

        expect(result.runtimeVariables).toEqual({
          sentCount: 1,
          lastSent: 'first',
          pending: 'outbound'
        });
      }
    );

    it.each(['nodevm', 'quickjs'])(
      'has no bru.grpc.response, even mid-stream (%s)',
      async (runtime) => {
        if (runtime === 'quickjs') await quickJsLoader();

        const result = await runBeforeMessageSend(
          `bru.setVar('hasResponse', Boolean(bru.grpc.response));`,
          makeRequest({ methodType: 'bidi-streaming' }),
          outbound,
          { runtime }
        );

        expect(result.runtimeVariables.hasResponse).toBe(false);
      }
    );

    it.each(['nodevm', 'quickjs'])(
      'rejects metadata writes — the headers are already on the wire (%s)',
      async (runtime) => {
        if (runtime === 'quickjs') await quickJsLoader();
        const request = makeRequest();

        const result = await runBeforeMessageSend(
          `try { bru.grpc.request.metadata.upsert('x-token', 'too-late'); } catch (e) { bru.setVar('err', e.message); }`,
          request,
          outbound,
          { runtime }
        );

        expect(result.runtimeVariables.err).toContain(
          'metadata.upsert() is not available'
        );
        expect(request.headers).toEqual({ 'X-Token': 'authored' });
      }
    );

    it('attaches the variables set before a throw, so an aborted send still reports them', async () => {
      const script = `
        bru.setVar('reached', true);
        throw new Error('no send');
      `;

      await expect(
        runBeforeMessageSend(script, makeRequest(), outbound)
      ).rejects.toMatchObject({
        message: 'no send',
        partialResults: { runtimeVariables: { reached: true } }
      });
    });
  });

  describe('afterMessageReceive (runGrpcAfterMessageReceiveScript)', () => {
    const inbound = { data: { reply: 'hello' }, timestamp: 1700000009 };

    // What the orchestration hands over mid-call: no status, no trailers, no duration.
    const makePartialResponse = (overrides = {}) => ({
      messages: [inbound],
      metadata: [{ name: 'content-type', value: 'application/grpc' }],
      trailers: undefined,
      statusCode: undefined,
      statusText: undefined,
      duration: undefined,
      methodType: 'server-streaming',
      ...overrides
    });

    it.each(['nodevm', 'quickjs'])(
      'exposes the message just received (%s)',
      async (runtime) => {
        if (runtime === 'quickjs') await quickJsLoader();
        const script = `
        bru.setVar('reply', bru.grpc.response.message.data.reply);
        bru.setVar('timestamp', bru.grpc.response.message.timestamp);
        bru.setVar('contentType', bru.grpc.response.metadata.get('content-type'));
      `;

        const result = await runAfterMessageReceive(
          script,
          makeRequest(),
          makePartialResponse(),
          inbound,
          { runtime }
        );

        expect(result.runtimeVariables).toEqual({
          reply: 'hello',
          timestamp: 1700000009,
          contentType: 'application/grpc'
        });
      }
    );

    it.each(['nodevm', 'quickjs'])(
      'the received message is already the last of response.messages (%s)',
      async (runtime) => {
        if (runtime === 'quickjs') await quickJsLoader();
        const second = { data: { reply: 'world' }, timestamp: 1700000010 };
        const script = `
        bru.setVar('count', bru.grpc.response.messages.count());
        bru.setVar('last', bru.grpc.response.messages.get(bru.grpc.response.messages.count() - 1).data.reply);
        bru.setVar('current', bru.grpc.response.message.data.reply);
      `;

        const result = await runAfterMessageReceive(
          script,
          makeRequest(),
          makePartialResponse({ messages: [inbound, second] }),
          second,
          { runtime }
        );

        expect(result.runtimeVariables).toEqual({
          count: 2,
          last: 'world',
          current: 'world'
        });
      }
    );

    it.each(['nodevm', 'quickjs'])(
      'reports no status, trailers or duration while the call is open (%s)',
      async (runtime) => {
        if (runtime === 'quickjs') await quickJsLoader();
        const script = `
        bru.setVar('hasStatusCode', bru.grpc.response.statusCode !== undefined);
        bru.setVar('hasDuration', bru.grpc.response.duration !== undefined);
        bru.setVar('trailerCount', bru.grpc.response.trailers.count());
      `;

        const result = await runAfterMessageReceive(
          script,
          makeRequest(),
          makePartialResponse(),
          inbound,
          { runtime }
        );

        expect(result.runtimeVariables).toEqual({
          hasStatusCode: false,
          hasDuration: false,
          trailerCount: 0
        });
      }
    );

    it.each(['nodevm', 'quickjs'])(
      'rejects metadata writes on both models (%s)',
      async (runtime) => {
        if (runtime === 'quickjs') await quickJsLoader();
        const script = `
        try { bru.grpc.request.metadata.upsert('x-token', 'too-late'); } catch (e) { bru.setVar('request', e.message); }
        try { bru.grpc.response.metadata.upsert('content-type', 'text/plain'); } catch (e) { bru.setVar('response', e.message); }
      `;

        const result = await runAfterMessageReceive(
          script,
          makeRequest(),
          makePartialResponse(),
          inbound,
          { runtime }
        );

        expect(result.runtimeVariables.request).toContain(
          'metadata.upsert() is not available'
        );
        expect(result.runtimeVariables.response).toContain(
          'metadata.upsert() is not available'
        );
      }
    );

    it.each(['nodevm', 'quickjs'])(
      'has no request.message — nothing is being sent (%s)',
      async (runtime) => {
        if (runtime === 'quickjs') await quickJsLoader();

        const result = await runAfterMessageReceive(
          `bru.setVar('hasRequestMessage', 'message' in bru.grpc.request);`,
          makeRequest(),
          makePartialResponse(),
          inbound,
          { runtime }
        );

        expect(result.runtimeVariables.hasRequestMessage).toBe(false);
      }
    );
  });

  describe('the call hooks never see a single message', () => {
    it.each(['nodevm', 'quickjs'])(
      'beforeCallStart has no request.message (%s)',
      async (runtime) => {
        if (runtime === 'quickjs') await quickJsLoader();

        const result = await runBeforeCallStart(
          `bru.setVar('hasMessage', 'message' in bru.grpc.request);`,
          makeRequest(),
          runtime
        );

        expect(result.runtimeVariables.hasMessage).toBe(false);
      }
    );

    it.each(['nodevm', 'quickjs'])(
      'afterCallEnd has no message on either model (%s)',
      async (runtime) => {
        if (runtime === 'quickjs') await quickJsLoader();
        const script = `
        bru.setVar('onRequest', 'message' in bru.grpc.request);
        bru.setVar('onResponse', 'message' in bru.grpc.response);
      `;

        const result = await runAfterCallEnd(
          script,
          makeRequest(),
          makeResponse(),
          { runtime }
        );

        expect(result.runtimeVariables).toEqual({
          onRequest: false,
          onResponse: false
        });
      }
    );
  });
});
