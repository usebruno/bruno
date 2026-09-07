const BrunoGrpcResponse = require('../src/grpc/bruno-grpc-response');
const GrpcMessage = require('../src/grpc/grpc-message');

const makeRes = (overrides = {}) => ({
  statusCode: 0,
  statusText: 'OK',
  messages: [{ data: { id: 1 }, timestamp: 1700000000 }],
  metadata: [{ name: 'content-type', value: 'application/grpc' }],
  trailers: [{ name: 'grpc-status', value: '0' }],
  duration: 12,
  ...overrides
});

describe('BrunoGrpcResponse', () => {
  test('exposes the call scalars', () => {
    const res = new BrunoGrpcResponse(makeRes());

    expect(res).toMatchObject({
      statusCode: 0,
      statusText: 'OK',
      duration: 12
    });
  });

  test('metadata and trailers are read from the [{ name, value }] display shape', () => {
    const res = new BrunoGrpcResponse(makeRes());

    expect(res.metadata.get('Content-Type')).toBe('application/grpc');
    expect(res.trailers.get('grpc-status')).toBe('0');
  });

  test('a metadata key named __proto__ is read as an entry, not as the prototype', () => {
    const res = new BrunoGrpcResponse(
      makeRes({ metadata: [{ name: '__proto__', value: 'polluted' }], trailers: undefined })
    );

    expect(res.metadata.get('__proto__')).toBe('polluted');
    expect(res.metadata.count()).toBe(1);
    expect(res.metadata.all()).toEqual([{ key: '__proto__', value: 'polluted' }]);
    expect({}.polluted).toBeUndefined();
  });

  test('messages are the { data, timestamp } envelopes the call produced', () => {
    const res = new BrunoGrpcResponse(makeRes());
    expect(res.messages.get()).toEqual({ data: { id: 1 }, timestamp: 1700000000 });
  });

  test('a call with no messages, metadata or trailers yields empty lists', () => {
    const res = new BrunoGrpcResponse(makeRes({ messages: undefined, metadata: undefined, trailers: undefined }));

    expect(res.messages.count()).toBe(0);
    expect(res.metadata.count()).toBe(0);
    expect(res.trailers.count()).toBe(0);
  });

  test('messages are cloned, so editing one cannot reach the underlying response', () => {
    const raw = makeRes();
    const res = new BrunoGrpcResponse(raw);

    res.messages.get().data.id = 99;

    expect(raw.messages[0].data.id).toBe(1);
  });

  test('the metadata of a completed call cannot be edited', () => {
    const res = new BrunoGrpcResponse(makeRes());

    expect(() => res.metadata.upsert('content-type', 'text/plain')).toThrow(/beforeCallStart/);
    expect(() => res.trailers.remove('grpc-status')).toThrow(/beforeCallStart/);
  });

  describe('message', () => {
    test('the message option becomes a GrpcMessage carrying data and timestamp', () => {
      const res = new BrunoGrpcResponse(makeRes(), {
        message: { data: { id: 1 }, timestamp: 1700000000 }
      });

      expect(res.message).toBeInstanceOf(GrpcMessage);
      expect(res.message.data).toEqual({ id: 1 });
      expect(res.message.timestamp).toBe(1700000000);
    });

    test('without the option the property is absent, not undefined, so afterCallEnd cannot see it', () => {
      const res = new BrunoGrpcResponse(makeRes());

      expect('message' in res).toBe(false);
    });
  });

  // What `afterMessageReceive` sees: the call is still open, so only what has arrived is known.
  test('a mid-call response reports no status, trailers or duration', () => {
    const partial = {
      messages: [{ data: { id: 1 }, timestamp: 1700000000 }],
      metadata: [{ name: 'content-type', value: 'application/grpc' }],
      trailers: undefined,
      statusCode: undefined,
      statusText: undefined,
      duration: undefined,
      methodType: 'server-streaming'
    };

    const res = new BrunoGrpcResponse(partial, { message: partial.messages[0] });

    expect(res.statusCode).toBeUndefined();
    expect(res.statusText).toBeUndefined();
    expect(res.duration).toBeUndefined();
    expect(res.trailers.count()).toBe(0);
    expect(res.metadata.get('content-type')).toBe('application/grpc');
    expect(res.message.data).toEqual({ id: 1 });
    // The received message is already the last entry of `messages` — the call folds it in first.
    expect(res.messages.get(res.messages.count() - 1).data).toEqual({ id: 1 });
  });
});
