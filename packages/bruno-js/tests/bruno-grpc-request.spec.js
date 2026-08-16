const BrunoGrpcRequest = require('../src/bruno-grpc-request');

const makeReq = (overrides = {}) => ({
  url: 'grpcb.in:9000',
  method: '/hello.HelloService/SayHello',
  methodType: 'unary',
  protoPath: '/protos/hello.proto',
  name: 'SayHello',
  headers: { 'X-Token': 'authored' },
  body: { grpc: [{ name: 'message 1', content: '{"greeting":"hi"}' }] },
  ...overrides
});

describe('BrunoGrpcRequest', () => {
  test('exposes the request scalars, falling back to authMode none', () => {
    const req = new BrunoGrpcRequest(makeReq());

    expect(req).toMatchObject({
      url: 'grpcb.in:9000',
      method: '/hello.HelloService/SayHello',
      methodType: 'unary',
      protoPath: '/protos/hello.proto',
      name: 'SayHello',
      authMode: 'none'
    });
    expect(new BrunoGrpcRequest(makeReq({ authMode: 'bearer' })).authMode).toBe('bearer');
  });

  describe('metadata', () => {
    test('writes land on the headers of the underlying request', () => {
      const raw = makeReq();
      const req = new BrunoGrpcRequest(raw, { metadataWritable: true });

      req.metadata.set('x-token', 'from-hook');
      req.metadata.set('x-request-id', 'req-1');

      expect(raw.headers).toEqual({ 'x-token': 'from-hook', 'x-request-id': 'req-1' });
    });

    test('a request that carries no headers gets them on first write', () => {
      const raw = makeReq({ headers: undefined });
      const req = new BrunoGrpcRequest(raw, { metadataWritable: true });

      req.metadata.set('x-token', 'from-hook');

      expect(raw.headers).toEqual({ 'x-token': 'from-hook' });
    });
  });

  describe('messages', () => {
    test('reads the authored entries as { data }, parsing the content as JSON', () => {
      const req = new BrunoGrpcRequest(makeReq());
      expect(req.messages.get()).toEqual({ data: { greeting: 'hi' } });
    });

    test('content that is not JSON comes through as-is', () => {
      const req = new BrunoGrpcRequest(makeReq({ body: { grpc: [{ name: 'message 1', content: 'not json' }] } }));
      expect(req.messages.get()).toEqual({ data: 'not json' });
    });

    test('writes land on body.grpc as authored entries, keeping the existing name', () => {
      const raw = makeReq();
      const req = new BrunoGrpcRequest(raw, { messagesWritable: true });

      req.messages.set(0, { greeting: 'hello' });
      req.messages.add({ greeting: 'again' });

      expect(raw.body.grpc).toEqual([
        { name: 'message 1', content: JSON.stringify({ greeting: 'hello' }, null, 2) },
        { name: 'message 2', content: JSON.stringify({ greeting: 'again' }, null, 2) }
      ]);
    });

    test('a string message is stored verbatim rather than re-stringified', () => {
      const raw = makeReq();
      const req = new BrunoGrpcRequest(raw, { messagesWritable: true });

      req.messages.add('{"greeting":"raw"}');

      expect(raw.body.grpc[1].content).toBe('{"greeting":"raw"}');
    });

    test('a missing or non-array grpc body becomes an array on first access', () => {
      const noBody = makeReq({ body: undefined });
      new BrunoGrpcRequest(noBody, { messagesWritable: true }).messages.add({ greeting: 'hi' });
      expect(noBody.body.grpc).toHaveLength(1);

      const badBody = makeReq({ body: { grpc: 'not an array' } });
      expect(new BrunoGrpcRequest(badBody).messages.count()).toBe(0);
      expect(badBody.body.grpc).toEqual([]);
    });
  });

  describe('writability', () => {
    test('both lists are read-only by default', () => {
      const req = new BrunoGrpcRequest(makeReq());
      expect(() => req.metadata.set('x-token', 'from-hook')).toThrow(/beforeCallStart/);
      expect(() => req.messages.add({ greeting: 'hi' })).toThrow(/beforeCallStart/);
    });

    test('metadata can be writable while messages stay read-only', () => {
      const req = new BrunoGrpcRequest(makeReq(), { metadataWritable: true, messagesWritable: false });
      expect(() => req.metadata.set('x-token', 'from-hook')).not.toThrow();
      expect(() => req.messages.add({ greeting: 'hi' })).toThrow(/beforeCallStart/);
    });

    test('sentMessages replaces the authored list with what went out, read-only', () => {
      const raw = makeReq({
        body: {
          grpc: [
            { name: 'message 1', content: '{"greeting":"hi"}' },
            { name: 'message 2', content: '{"greeting":"unsent"}' }
          ]
        }
      });
      const sentMessages = [{ data: { greeting: 'hi' }, timestamp: 1700000000 }];
      const req = new BrunoGrpcRequest(raw, { sentMessages });

      expect(req.messages.count()).toBe(1);
      expect(req.messages.get()).toEqual({ data: { greeting: 'hi' }, timestamp: 1700000000 });
      expect(() => req.messages.add({ greeting: 'late' })).toThrow(/beforeCallStart/);
    });
  });
});
