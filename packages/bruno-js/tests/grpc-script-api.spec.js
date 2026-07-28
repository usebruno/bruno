const buildGrpcScriptApi = require('../src/grpc-script-api');

const makeRequest = (overrides = {}) => ({
  url: 'grpc://localhost:9000',
  method: '/hello.HelloService/SayHello',
  methodType: 'unary',
  headers: {},
  ...overrides
});

const messageEntry = (name, obj) => ({ name, content: JSON.stringify(obj) });

describe('buildGrpcScriptApi — guard clauses', () => {
  it('returns undefined when no request is provided', () => {
    expect(buildGrpcScriptApi({ phaseType: 'beforeCallStart' })).toBeUndefined();
    expect(buildGrpcScriptApi()).toBeUndefined();
  });

  it('returns undefined for an unknown phase', () => {
    expect(buildGrpcScriptApi({ phaseType: 'nope', request: makeRequest() })).toBeUndefined();
  });
});

describe('beforeCallStart phase', () => {
  it('exposes request info and an empty message list', () => {
    const api = buildGrpcScriptApi({ phaseType: 'beforeCallStart', request: makeRequest() });

    expect(api.response).toBeUndefined();
    expect(api.request.url).toBe('grpc://localhost:9000');
    expect(api.request.method).toBe('/hello.HelloService/SayHello');
    expect(api.request.methodType).toBe('unary');
    expect(api.request.messages.count()).toBe(0);
    expect(api.request.messages).toEqual([]);
  });

  it('metadata is writable in this phase and mutates the request', () => {
    const request = makeRequest({ headers: { authorization: 'Bearer token123' } });
    const api = buildGrpcScriptApi({ phaseType: 'beforeCallStart', request });

    api.request.metadata.set('x-request-id', 'req-42');
    expect(request.headers['x-request-id']).toBe('req-42');
    expect(api.request.metadata.get('x-request-id')).toBe('req-42');

    api.request.metadata.remove('authorization');
    expect(request.headers.authorization).toBeUndefined();
  });

  describe('request.metadata', () => {
    const writable = () =>
      buildGrpcScriptApi({
        phaseType: 'beforeCallStart',
        request: makeRequest({ headers: { 'x-user-id': 'user-42', 'x-tenant-id': 'acme-corp' } })
      }).request.metadata;

    it('reads via get / has / count / all', () => {
      const metadata = writable();
      expect(metadata.get('x-user-id')).toBe('user-42');
      expect(metadata.has('x-user-id')).toBe(true);
      expect(metadata.has('x-missing')).toBe(false);
      expect(metadata.count()).toBe(2);
      expect(metadata.all()).toEqual({ 'x-user-id': 'user-42', 'x-tenant-id': 'acme-corp' });
    });

    it('iterates with find / filter / map / each yielding key/value', () => {
      const metadata = writable();
      expect(metadata.find((value) => value === 'acme-corp')).toEqual({ key: 'x-tenant-id', value: 'acme-corp' });
      expect(metadata.filter((value) => value === 'user-42')).toEqual([{ key: 'x-user-id', value: 'user-42' }]);
      expect(metadata.map((value, key) => `${key}=${value}`)).toEqual(['x-user-id=user-42', 'x-tenant-id=acme-corp']);

      const seen = [];
      metadata.each((value, key) => seen.push(`${key}:${value}`));
      expect(seen).toEqual(['x-user-id:user-42', 'x-tenant-id:acme-corp']);
    });

    it('writes via set / setAll / remove / clear', () => {
      const metadata = writable();
      metadata.set('x-request-id', 'req-42');
      expect(metadata.get('x-request-id')).toBe('req-42');

      metadata.remove('x-user-id');
      expect(metadata.has('x-user-id')).toBe(false);

      metadata.setAll({ authorization: 'Bearer token123' });
      expect(metadata.all()).toEqual({ authorization: 'Bearer token123' });

      metadata.clear();
      expect(metadata.count()).toBe(0);
    });

    it('setAll rejects a non-object payload', () => {
      expect(() => writable().setAll('not-an-object')).toThrow(TypeError);
    });
  });
});

describe('beforeMessageSend phase', () => {
  it('exposes the outgoing message (frozen) and read-only metadata', () => {
    const request = makeRequest();
    const api = buildGrpcScriptApi({
      phaseType: 'beforeMessageSend',
      request,
      phaseData: { message: { greeting: 'Alice' } }
    });

    expect(api.request.message).toEqual({ data: { greeting: 'Alice' } });
    expect(Object.isFrozen(api.request.message)).toBe(true);
    expect(() => api.request.metadata.set('x-request-id', 'req-42')).toThrow(/read-only/);
  });

  it('message.data is null when no message is provided', () => {
    const api = buildGrpcScriptApi({ phaseType: 'beforeMessageSend', request: makeRequest(), phaseData: {} });
    expect(api.request.message.data).toBeNull();
  });
});

describe('afterMessageReceive phase', () => {
  it('exposes the received message with its timestamp (frozen)', () => {
    const api = buildGrpcScriptApi({
      phaseType: 'afterMessageReceive',
      request: makeRequest(),
      phaseData: { message: { reply: 'Hello, Alice!' }, timestamp: '2023-11-14T22:13:20.000Z' }
    });

    expect(api.response.message.data).toEqual({ reply: 'Hello, Alice!' });
    expect(api.response.message.timestamp).toBe('2023-11-14T22:13:20.000Z');
    expect(Object.isFrozen(api.response.message)).toBe(true);
  });

  it('request metadata is read-only in this phase', () => {
    const api = buildGrpcScriptApi({ phaseType: 'afterMessageReceive', request: makeRequest(), phaseData: {} });
    expect(() => api.request.metadata.clear()).toThrow(/read-only/);
  });
});

describe('afterCallEnd phase', () => {
  it('exposes status, trailers, sent and received messages', () => {
    const api = buildGrpcScriptApi({
      phaseType: 'afterCallEnd',
      request: makeRequest(),
      phaseData: {
        responses: [{ data: { reply: 'Hello, Alice!' } }, { data: { reply: 'Hello, Bob!' } }],
        statusCode: 0,
        statusMessage: 'OK',
        trailers: { 'x-ratelimit-remaining': '99' },
        sentMessages: [messageEntry('message 1', { greeting: 'Alice' })]
      }
    });

    expect(api.response.statusCode).toBe(0);
    expect(api.response.statusMessage).toBe('OK');
    expect(api.response.trailers.get('x-ratelimit-remaining')).toBe('99');
    expect(api.response.messages.count()).toBe(2);
    expect(api.response.messages.first()).toEqual({ data: { reply: 'Hello, Alice!' } });
    expect(api.request.messages.count()).toBe(1);
    expect(api.request.messages.first()).toEqual({ greeting: 'Alice' });
  });

  it('falls back to null status and empty collections when phaseData is empty', () => {
    const api = buildGrpcScriptApi({ phaseType: 'afterCallEnd', request: makeRequest(), phaseData: {} });
    expect(api.response.statusCode).toBeNull();
    expect(api.response.statusMessage).toBeNull();
    expect(api.response.messages.count()).toBe(0);
    expect(api.request.messages.count()).toBe(0);
  });

  it('metadata is read-only in this phase (every write throws)', () => {
    const metadata = buildGrpcScriptApi({ phaseType: 'afterCallEnd', request: makeRequest(), phaseData: {} }).request.metadata;
    expect(() => metadata.set('x-request-id', 'req-42')).toThrow(/read-only/);
    expect(() => metadata.setAll({ 'x-request-id': 'req-42' })).toThrow(/read-only/);
    expect(() => metadata.remove('x-request-id')).toThrow(/read-only/);
    expect(() => metadata.clear()).toThrow(/read-only/);
  });

  describe('request.messages', () => {
    const entries = [messageEntry('message 1', { greeting: 'Alice' }), messageEntry('message 2', { greeting: 'Bob' })];

    it('parses JSON content for get / first / last / all', () => {
      const api = buildGrpcScriptApi({ phaseType: 'afterCallEnd', request: makeRequest(), phaseData: { sentMessages: entries } });
      const messages = api.request.messages;
      expect(messages.get(0)).toEqual({ greeting: 'Alice' });
      expect(messages.first()).toEqual({ greeting: 'Alice' });
      expect(messages.last()).toEqual({ greeting: 'Bob' });
      expect(messages.all()).toEqual([{ greeting: 'Alice' }, { greeting: 'Bob' }]);
    });

    it('returns null for last() / count 0 on an empty list', () => {
      const api = buildGrpcScriptApi({ phaseType: 'afterCallEnd', request: makeRequest(), phaseData: { sentMessages: [] } });
      const messages = api.request.messages;
      expect(messages.count()).toBe(0);
      expect(messages.last()).toBeNull();
    });

    it('supports find / filter / map / each', () => {
      const api = buildGrpcScriptApi({ phaseType: 'afterCallEnd', request: makeRequest(), phaseData: { sentMessages: entries } });
      const messages = api.request.messages;
      expect(messages.find((m) => m.greeting === 'Bob')).toEqual({ greeting: 'Bob' });
      expect(messages.filter((m) => m.greeting.startsWith('A'))).toEqual([{ greeting: 'Alice' }]);
      expect(messages.map((m) => m.greeting)).toEqual(['Alice', 'Bob']);

      const seen = [];
      messages.each((m) => seen.push(m.greeting));
      expect(seen).toEqual(['Alice', 'Bob']);
    });

    it('leaves malformed JSON content as the raw string (client stays robust)', () => {
      const api = buildGrpcScriptApi({
        phaseType: 'afterCallEnd',
        request: makeRequest(),
        phaseData: { sentMessages: [{ name: 'message 1', content: '{not json' }] }
      });
      expect(api.request.messages.first()).toBe('{not json');
    });
  });

  describe('response.messages', () => {
    it('exposes get / first / last / count over the received messages', () => {
      const responses = [{ data: { reply: 'reply 1' } }, { data: { reply: 'reply 2' } }, { data: { reply: 'reply 3' } }];
      const api = buildGrpcScriptApi({ phaseType: 'afterCallEnd', request: makeRequest(), phaseData: { responses } });
      const messages = api.response.messages;
      expect(messages.count()).toBe(3);
      expect(messages.first()).toEqual({ data: { reply: 'reply 1' } });
      expect(messages.last()).toEqual({ data: { reply: 'reply 3' } });
      expect(messages.get(1)).toEqual({ data: { reply: 'reply 2' } });
    });

    it('returns null for out-of-range get and empty first/last', () => {
      const api = buildGrpcScriptApi({ phaseType: 'afterCallEnd', request: makeRequest(), phaseData: { responses: [] } });
      const messages = api.response.messages;
      expect(messages.count()).toBe(0);
      expect(messages.get(0)).toBeNull();
      expect(messages.first()).toBeNull();
      expect(messages.last()).toBeNull();
    });
  });
});
