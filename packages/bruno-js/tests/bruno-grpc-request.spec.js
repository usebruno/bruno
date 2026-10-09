const BrunoGrpcRequest = require('../src/grpc/bruno-grpc-request');
const GrpcMessage = require('../src/grpc/grpc-message');

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

      req.metadata.upsert('x-token', 'from-hook');
      req.metadata.upsert('x-request-id', 'req-1');

      expect(raw.headers).toEqual({ 'x-token': 'from-hook', 'x-request-id': 'req-1' });
    });

    test('a key named __proto__ becomes a real entry instead of touching the prototype', () => {
      const raw = makeReq({ headers: {} });
      const req = new BrunoGrpcRequest(raw, { metadataWritable: true });

      req.metadata.upsert('__proto__', 'polluted');

      expect(Object.keys(raw.headers)).toEqual(['__proto__']);
      expect(Object.getPrototypeOf(raw.headers)).toBe(Object.prototype);
      expect(req.metadata.get('__proto__')).toBe('polluted');
      expect(req.metadata.count()).toBe(1);
    });

    test('a request that carries no headers gets them on first write', () => {
      const raw = makeReq({ headers: undefined });
      const req = new BrunoGrpcRequest(raw, { metadataWritable: true });

      req.metadata.upsert('x-token', 'from-hook');

      expect(raw.headers).toEqual({ 'x-token': 'from-hook' });
    });
  });

  describe('disabled metadata', () => {
    const withDisabled = () => makeReq({
      headerEntries: [
        { key: 'X-Token', value: 'authored' },
        { key: 'x-off', value: 'hidden', disabled: true }
      ]
    });

    test('disabled entries surface with disabled: true, in store order', () => {
      const req = new BrunoGrpcRequest(withDisabled());

      expect(req.metadata.all()).toEqual([
        { key: 'X-Token', value: 'authored' },
        { key: 'x-off', value: 'hidden', disabled: true }
      ]);
      expect(req.metadata.idx(1)).toEqual(req.metadata.all()[1]);
    });

    test('a request without headerEntries gets them on the first disabled write', () => {
      const raw = makeReq();
      const req = new BrunoGrpcRequest(raw, { metadataWritable: true });

      req.metadata.add({ key: 'x-token', value: 'off', disabled: true });

      expect(raw.headers).toEqual({});
      expect(raw.headerEntries).toEqual([{ key: 'x-token', value: 'off', disabled: true }]);
    });

    test('remove() and clear() reach the disabled entries of the underlying request', () => {
      const raw = withDisabled();
      raw.headerEntries.push({ key: 'x-gone', value: '1', disabled: true });
      const req = new BrunoGrpcRequest(raw, { metadataWritable: true });

      req.metadata.remove('X-GONE');
      expect(raw.headerEntries).toEqual([
        { key: 'X-Token', value: 'authored' },
        { key: 'x-off', value: 'hidden', disabled: true }
      ]);

      req.metadata.clear();
      expect(raw.headers).toEqual({});
      expect(raw.headerEntries).toEqual([]);
    });

    test('a header added to the map after the entries were built shows up appended', () => {
      const raw = withDisabled();
      raw.headers.Authorization = 'Bearer x';
      const req = new BrunoGrpcRequest(raw);

      expect(req.metadata.map((entry) => entry.key)).toEqual(['X-Token', 'x-off', 'Authorization']);
    });
  });

  describe('messages', () => {
    test('reports the messages the call sent, not the ones that were authored', () => {
      const sentMessages = [{ data: { greeting: 'hi' }, timestamp: 1700000000 }];
      const raw = makeReq({
        body: {
          grpc: [
            { name: 'message 1', content: '{"greeting":"hi"}' },
            { name: 'message 2', content: '{"greeting":"unsent"}' }
          ]
        }
      });
      const req = new BrunoGrpcRequest(raw, { sentMessages });

      expect(req.messages.count()).toBe(1);
      expect(req.messages.get()).toEqual({ data: { greeting: 'hi' }, timestamp: 1700000000 });
    });

    test('messages are cloned, so editing one cannot reach what the call sent', () => {
      const sentMessages = [{ data: { greeting: 'hi' }, timestamp: 1700000000 }];
      const req = new BrunoGrpcRequest(makeReq(), { sentMessages });

      const message = req.messages.get();
      message.data.greeting = 'tampered';
      message.timestamp = 0;

      expect(sentMessages).toEqual([{ data: { greeting: 'hi' }, timestamp: 1700000000 }]);
    });

    test('a call that has sent nothing yet has no messages', () => {
      const req = new BrunoGrpcRequest(makeReq());

      expect(req.messages.count()).toBe(0);
      expect(req.messages.get()).toBeUndefined();
    });
  });

  describe('message', () => {
    test('the message option becomes a GrpcMessage carrying data and timestamp', () => {
      const req = new BrunoGrpcRequest(makeReq(), {
        message: { data: { greeting: 'outbound' }, timestamp: 1700000001 }
      });

      expect(req.message).toBeInstanceOf(GrpcMessage);
      expect(req.message.data).toEqual({ greeting: 'outbound' });
      expect(req.message.timestamp).toBe(1700000001);
    });

    test('without the option the property is absent, not undefined, so the call hooks cannot see it', () => {
      const req = new BrunoGrpcRequest(makeReq());

      expect('message' in req).toBe(false);
    });

    test('the message being sent is not yet in messages, which holds only what has been transmitted', () => {
      const req = new BrunoGrpcRequest(makeReq(), {
        sentMessages: [{ data: { greeting: 'first' }, timestamp: 1700000000 }],
        message: { data: { greeting: 'second' }, timestamp: 1700000001 }
      });

      expect(req.messages.count()).toBe(1);
      expect(req.messages.get().data).toEqual({ greeting: 'first' });
      expect(req.message.data).toEqual({ greeting: 'second' });
    });
  });
});
