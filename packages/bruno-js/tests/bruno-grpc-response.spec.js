const BrunoGrpcResponse = require('../src/bruno-grpc-response');

const makeRes = (overrides = {}) => ({
  statusCode: 0,
  statusMessage: 'OK',
  messages: [{ data: { id: 1 }, timestamp: 1700000000 }],
  metadata: [{ name: 'content-type', value: 'application/grpc' }],
  trailers: [{ name: 'grpc-status', value: '0' }],
  duration: 12,
  methodType: 'unary',
  ...overrides
});

describe('BrunoGrpcResponse', () => {
  test('exposes the call scalars', () => {
    const res = new BrunoGrpcResponse(makeRes());

    expect(res).toMatchObject({
      statusCode: 0,
      statusMessage: 'OK',
      duration: 12,
      methodType: 'unary'
    });
  });

  test('metadata and trailers are read from the [{ name, value }] display shape', () => {
    const res = new BrunoGrpcResponse(makeRes());

    expect(res.metadata.get('Content-Type')).toBe('application/grpc');
    expect(res.trailers.get('grpc-status')).toBe('0');
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

    expect(() => res.metadata.set('content-type', 'text/plain')).toThrow(/beforeCallStart/);
    expect(() => res.trailers.delete('grpc-status')).toThrow(/beforeCallStart/);
  });
});
