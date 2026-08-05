// Mock electron before requiring axios-instance
jest.mock('electron', () => ({
  app: {
    getVersion: () => '1.0.0'
  }
}));

// Mock preferences
jest.mock('../../src/store/preferences', () => ({
  preferencesUtil: {
    shouldStoreCookies: () => false,
    shouldSendCookies: () => false,
    isSslSessionCachingEnabled: () => true
  }
}));

// Mock cookies
jest.mock('../../src/utils/cookies', () => ({
  addCookieToJar: jest.fn(),
  getCookieStringForUrl: jest.fn()
}));

// Mock proxy-util
jest.mock('../../src/utils/proxy-util', () => ({
  setupProxyAgents: jest.fn()
}));

// Mock form-data
jest.mock('../../src/utils/form-data', () => ({
  createFormData: jest.fn()
}));

const { makeAxiosInstance, getSortedOutgoingHeaders, recordSentHeaders } = require('../../src/ipc/network/axios-instance');

function createStubAdapter() {
  let capturedConfig = null;

  const adapter = (config) => {
    capturedConfig = config;
    return Promise.resolve({
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config
    });
  };

  adapter.getConfig = () => capturedConfig;

  return adapter;
}

describe('axios-instance: default headers', () => {
  test('setting User-Agent does not clobber the axios default Accept header', async () => {
    const stubAdapter = createStubAdapter();
    const instance = makeAxiosInstance();

    await instance({ url: 'https://api.example.com/test', method: 'get', adapter: stubAdapter });

    // axios.create() sets Accept by default; assigning a new object to defaults.headers.common
    // would nuke it. Guard against that regression.
    expect(stubAdapter.getConfig().headers['Accept']).toMatch(/application\/json/);
  });

  test('sets User-Agent header to bruno-runtime version', async () => {
    const stubAdapter = createStubAdapter();
    const instance = makeAxiosInstance();

    await instance({ url: 'https://api.example.com/test', method: 'get', adapter: stubAdapter });

    expect(stubAdapter.getConfig().headers['User-Agent']).toMatch(/^bruno-runtime\//);
  });
});

describe('axios-instance: DNS lookup behavior (GitHub #7343)', () => {
  let axiosInstance;

  beforeEach(() => {
    axiosInstance = makeAxiosInstance();
  });

  test('should set custom lookup function for localhost URLs', async () => {
    const stubAdapter = createStubAdapter();

    await axiosInstance({
      url: 'http://localhost:3000/api/test',
      method: 'get',
      adapter: stubAdapter
    });

    const config = stubAdapter.getConfig();
    expect(config.lookup).toBeDefined();
    expect(typeof config.lookup).toBe('function');
  });

  test('should set custom lookup function for 127.0.0.1 URLs', async () => {
    const stubAdapter = createStubAdapter();

    await axiosInstance({
      url: 'http://127.0.0.1:8080/api/test',
      method: 'get',
      adapter: stubAdapter
    });

    const config = stubAdapter.getConfig();
    expect(config.lookup).toBeDefined();
    expect(typeof config.lookup).toBe('function');
  });

  test('should set custom lookup function for ::1 (IPv6 localhost) URLs', async () => {
    const stubAdapter = createStubAdapter();

    await axiosInstance({
      url: 'http://[::1]:8080/api/test',
      method: 'get',
      adapter: stubAdapter
    });

    const config = stubAdapter.getConfig();
    expect(config.lookup).toBeDefined();
    expect(typeof config.lookup).toBe('function');
  });

  test('should set custom lookup function for *.localhost domains (RFC 6761)', async () => {
    const stubAdapter = createStubAdapter();

    await axiosInstance({
      url: 'http://api.localhost:3000/test',
      method: 'get',
      adapter: stubAdapter
    });

    const config = stubAdapter.getConfig();
    expect(config.lookup).toBeDefined();
    expect(typeof config.lookup).toBe('function');
  });

  test('should NOT set custom lookup for external domains', async () => {
    const stubAdapter = createStubAdapter();

    await axiosInstance({
      url: 'https://api.example.com/test',
      method: 'get',
      adapter: stubAdapter
    });

    const config = stubAdapter.getConfig();
    expect(config.lookup).toBeUndefined();
  });

  test('should NOT set custom lookup for httpbin.org', async () => {
    const stubAdapter = createStubAdapter();

    await axiosInstance({
      url: 'https://httpbin.org/get',
      method: 'get',
      adapter: stubAdapter
    });

    const config = stubAdapter.getConfig();
    expect(config.lookup).toBeUndefined();
  });

  test('should clear inherited lookup when URL changes from localhost to external domain', async () => {
    // This simulates what happens during a redirect:
    // 1. Original request to localhost sets lookup
    // 2. Redirect spreads config including lookup
    // 3. New request to external domain should clear the lookup
    const stubAdapter = createStubAdapter();
    const inheritedLookup = (_hostname, _options, callback) => {
      callback(null, '127.0.0.1', 4);
    };

    await axiosInstance({
      url: 'https://external-auth-provider.com/oauth/authorize',
      method: 'get',
      adapter: stubAdapter,
      lookup: inheritedLookup // Simulates inherited lookup from redirect
    });

    const config = stubAdapter.getConfig();
    // The lookup should be cleared for external domains
    expect(config.lookup).toBeUndefined();
  });

  test('should replace inherited lookup with a fresh one when redirecting localhost to localhost', async () => {
    // Simulates a redirect from one localhost endpoint to another:
    // the inherited lookup from the original request should be replaced
    // (not just kept) by a fresh localhost lookup function.
    const stubAdapter = createStubAdapter();
    const inheritedLookup = (_hostname, _options, callback) => {
      callback(null, '127.0.0.1', 4);
    };

    await axiosInstance({
      url: 'http://localhost:3182/redirected',
      method: 'get',
      adapter: stubAdapter,
      lookup: inheritedLookup // Simulates inherited lookup from redirect
    });

    const config = stubAdapter.getConfig();
    // Should have a lookup set for localhost, but it should be a fresh one
    expect(config.lookup).toBeDefined();
    expect(typeof config.lookup).toBe('function');
    expect(config.lookup).not.toBe(inheritedLookup);
  });
});

describe('axios-instance: cross-origin redirects authorization stripping', () => {
  function createRedirectingStubAdapter(redirectUrl, redirectStatus = 302) {
    const calls = [];
    const adapter = (config) => {
      calls.push(config);
      if (calls.length === 1) {
        const err = new Error('Redirect ' + redirectStatus);
        err.config = config;
        err.response = {
          status: redirectStatus,
          statusText: 'Found',
          headers: {
            location: redirectUrl
          },
          data: {}
        };
        return Promise.reject(err);
      }
      return Promise.resolve({
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      });
    };
    adapter.getCalls = () => calls;
    return adapter;
  }

  test('should strip Authorization and Proxy-Authorization headers on cross-origin redirect when forwardAuthorizationHeader is false', async () => {
    const stubAdapter = createRedirectingStubAdapter('https://other-domain.com/target');
    const instance = makeAxiosInstance({
      followRedirects: true,
      forwardAuthorizationHeader: false
    });

    await instance({
      url: 'https://api.example.com/start',
      method: 'get',
      headers: {
        'Authorization': 'Bearer my-token',
        'Proxy-Authorization': 'Bearer proxy-token',
        'Custom-Header': 'keep-me'
      },
      adapter: stubAdapter
    });

    const calls = stubAdapter.getCalls();
    expect(calls.length).toBe(2);

    // First call should have headers
    expect(calls[0].headers['Authorization']).toBe('Bearer my-token');
    expect(calls[0].headers['Proxy-Authorization']).toBe('Bearer proxy-token');
    expect(calls[0].headers['Custom-Header']).toBe('keep-me');

    // Redirected call should strip auth headers but keep custom headers
    expect(calls[1].url).toBe('https://other-domain.com/target');
    expect(calls[1].headers['Authorization']).toBeUndefined();
    expect(calls[1].headers['Proxy-Authorization']).toBeUndefined();
    expect(calls[1].headers['Custom-Header']).toBe('keep-me');
  });

  test('should preserve Authorization and Proxy-Authorization headers on cross-origin redirect when forwardAuthorizationHeader is true', async () => {
    const stubAdapter = createRedirectingStubAdapter('https://other-domain.com/target');
    const instance = makeAxiosInstance({
      followRedirects: true,
      forwardAuthorizationHeader: true
    });

    await instance({
      url: 'https://api.example.com/start',
      method: 'get',
      headers: {
        'authorization': 'Bearer my-token',
        'proxy-authorization': 'Bearer proxy-token',
        'Custom-Header': 'keep-me'
      },
      adapter: stubAdapter
    });

    const calls = stubAdapter.getCalls();
    expect(calls.length).toBe(2);
    expect(calls[1].url).toBe('https://other-domain.com/target');
    expect(calls[1].headers['authorization']).toBe('Bearer my-token');
    expect(calls[1].headers['proxy-authorization']).toBe('Bearer proxy-token');
    expect(calls[1].headers['Custom-Header']).toBe('keep-me');
  });

  test('should preserve Authorization and Proxy-Authorization headers on same-origin redirect even if forwardAuthorizationHeader is false', async () => {
    const stubAdapter = createRedirectingStubAdapter('https://api.example.com/target');
    const instance = makeAxiosInstance({
      followRedirects: true,
      forwardAuthorizationHeader: false
    });

    await instance({
      url: 'https://api.example.com/start',
      method: 'get',
      headers: {
        'Authorization': 'Bearer my-token',
        'Proxy-Authorization': 'Bearer proxy-token'
      },
      adapter: stubAdapter
    });

    const calls = stubAdapter.getCalls();
    expect(calls.length).toBe(2);
    expect(calls[1].url).toBe('https://api.example.com/target');
    expect(calls[1].headers['Authorization']).toBe('Bearer my-token');
    expect(calls[1].headers['Proxy-Authorization']).toBe('Bearer proxy-token');
  });

  test('should preserve Authorization and Proxy-Authorization headers on relative redirect even if forwardAuthorizationHeader is false', async () => {
    const stubAdapter = createRedirectingStubAdapter('/relative-target');
    const instance = makeAxiosInstance({
      followRedirects: true,
      forwardAuthorizationHeader: false
    });

    await instance({
      url: 'https://api.example.com/start',
      method: 'get',
      headers: {
        'Authorization': 'Bearer my-token',
        'Proxy-Authorization': 'Bearer proxy-token'
      },
      adapter: stubAdapter
    });

    const calls = stubAdapter.getCalls();
    expect(calls.length).toBe(2);
    expect(calls[1].url).toBe('https://api.example.com/relative-target');
    expect(calls[1].headers['Authorization']).toBe('Bearer my-token');
    expect(calls[1].headers['Proxy-Authorization']).toBe('Bearer proxy-token');
  });

  test('should strip Authorization and Proxy-Authorization headers on cross-origin redirect chains', async () => {
    function createChainRedirectingStubAdapter(redirectUrls) {
      const calls = [];
      const adapter = (config) => {
        calls.push(config);
        if (calls.length <= redirectUrls.length) {
          const err = new Error('Redirect 302');
          err.config = config;
          err.response = {
            status: 302,
            statusText: 'Found',
            headers: {
              location: redirectUrls[calls.length - 1]
            },
            data: {}
          };
          return Promise.reject(err);
        }
        return Promise.resolve({
          data: { success: true },
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        });
      };
      adapter.getCalls = () => calls;
      return adapter;
    }

    const stubAdapter = createChainRedirectingStubAdapter([
      'https://api.example.com/intermediate',
      'https://other-domain.com/target',
      '/final-target'
    ]);
    const instance = makeAxiosInstance({
      followRedirects: true,
      forwardAuthorizationHeader: false
    });

    await instance({
      url: 'https://api.example.com/start',
      method: 'get',
      headers: {
        'Authorization': 'Bearer my-token',
        'Proxy-Authorization': 'Bearer proxy-token'
      },
      adapter: stubAdapter
    });

    const calls = stubAdapter.getCalls();
    expect(calls.length).toBe(4);

    // First call (same origin)
    expect(calls[0].url).toBe('https://api.example.com/start');
    expect(calls[0].headers['Authorization']).toBe('Bearer my-token');

    // Second call (same origin redirect)
    expect(calls[1].url).toBe('https://api.example.com/intermediate');
    expect(calls[1].headers['Authorization']).toBe('Bearer my-token');

    // Third call (cross origin redirect) - headers stripped
    expect(calls[2].url).toBe('https://other-domain.com/target');
    expect(calls[2].headers['Authorization']).toBeUndefined();

    // Fourth call (relative redirect on cross origin) - headers still stripped
    expect(calls[3].url).toBe('https://other-domain.com/final-target');
    expect(calls[3].headers['Authorization']).toBeUndefined();
  });
});

// A Node ClientRequest stub: `_header` is the serialized block Node writes to the socket.
const clientRequest = (headerBlock) => ({ _header: headerBlock });

const wireBlock
  = 'GET /echo-request HTTP/1.1\r\n'
    + 'Accept: application/json, text/plain, */*\r\n'
    + 'User-Agent: bruno-runtime/2.0.0\r\n'
    + 'req-1-table-h-1: req-1-table-h-1-v-1\r\n'
    + 'request-start-time: 1785909783843\r\n'
    + 'Accept-Encoding: gzip, compress, deflate, br\r\n'
    + 'Host: localhost:6000\r\n'
    + 'Connection: keep-alive\r\n'
    + '\r\n';

describe('axios-instance: getSortedOutgoingHeaders', () => {
  test('parses every sent header, preserving wire casing and order', () => {
    expect(getSortedOutgoingHeaders(clientRequest(wireBlock))).toEqual([
      { key: 'Accept', value: 'application/json, text/plain, */*' },
      { key: 'User-Agent', value: 'bruno-runtime/2.0.0' },
      { key: 'req-1-table-h-1', value: 'req-1-table-h-1-v-1' },
      { key: 'request-start-time', value: '1785909783843' },
      { key: 'Accept-Encoding', value: 'gzip, compress, deflate, br' },
      { key: 'Host', value: 'localhost:6000' },
      { key: 'Connection', value: 'keep-alive' }
    ]);
  });

  test('includes Connection, which is absent from getHeaders()/kOutHeaders', () => {
    const keys = getSortedOutgoingHeaders(clientRequest(wireBlock)).map((h) => h.key);
    expect(keys).toContain('Connection');
  });

  test('splits on the first colon so a value may contain colons', () => {
    const block = 'GET /x HTTP/1.1\r\nHost: localhost:6000\r\n\r\n';
    expect(getSortedOutgoingHeaders(clientRequest(block))).toEqual([{ key: 'Host', value: 'localhost:6000' }]);
  });

  test('skips the request line when a colon in the path would make it parse as a header', () => {
    const block = 'GET /users/id:42 HTTP/1.1\r\nHost: x\r\n\r\n';
    expect(getSortedOutgoingHeaders(clientRequest(block))).toEqual([{ key: 'Host', value: 'x' }]);
  });

  test('skips the absolute-form request line a proxy produces', () => {
    const block = 'GET http://target.example.com:8080/a HTTP/1.1\r\nHost: target.example.com:8080\r\n\r\n';
    expect(getSortedOutgoingHeaders(clientRequest(block))).toEqual([
      { key: 'Host', value: 'target.example.com:8080' }
    ]);
  });

  test('keeps a header sent with an empty value', () => {
    const block = 'GET /x HTTP/1.1\r\nX-Empty:\r\nHost: x\r\n\r\n';
    expect(getSortedOutgoingHeaders(clientRequest(block))).toEqual([
      { key: 'X-Empty', value: '' },
      { key: 'Host', value: 'x' }
    ]);
  });

  test('skips lines with no colon', () => {
    const block = 'GET /x HTTP/1.1\r\ngarbage\r\nHost: x\r\n\r\n';
    expect(getSortedOutgoingHeaders(clientRequest(block))).toEqual([{ key: 'Host', value: 'x' }]);
  });

  test('returns an empty list when there is nothing to parse', () => {
    expect(getSortedOutgoingHeaders(undefined)).toEqual([]);
    expect(getSortedOutgoingHeaders(null)).toEqual([]);
    expect(getSortedOutgoingHeaders({})).toEqual([]);
    expect(getSortedOutgoingHeaders(clientRequest(''))).toEqual([]);
    expect(getSortedOutgoingHeaders(clientRequest('GET /x HTTP/1.1\r\n\r\n'))).toEqual([]);
  });
});

describe('axios-instance: recordSentHeaders', () => {
  const headerBlock = 'GET /x HTTP/1.1\r\nAccept: */*\r\nHost: x\r\n\r\n';
  const messages = (timeline) => timeline.filter((e) => e.type === 'requestHeader').map((e) => e.message);

  test('inserts the headers after the request marker rather than at the tail', () => {
    const timeline = [
      { type: 'request', message: 'GET /x' },
      { type: 'info', message: 'proxy: off' },
      { type: 'response', message: 'HTTP/1.1 200 OK' }
    ];
    recordSentHeaders(timeline, { request: clientRequest(headerBlock) });
    expect(timeline.map((e) => e.type)).toEqual([
      'request',
      'requestHeader',
      'requestHeader',
      'info',
      'response'
    ]);
  });

  test('inserts after the body when one was logged', () => {
    const timeline = [
      { type: 'request', message: 'POST /x' },
      { type: 'requestData', message: '{"a":1}' },
      { type: 'info', message: 'proxy: off' }
    ];
    recordSentHeaders(timeline, { request: clientRequest(headerBlock) });
    expect(timeline.map((e) => e.type)).toEqual([
      'request',
      'requestData',
      'requestHeader',
      'requestHeader',
      'info'
    ]);
  });

  test('formats each entry as "name: value" and stamps a timestamp', () => {
    const timeline = [{ type: 'request', message: 'GET /x' }];
    recordSentHeaders(timeline, { request: clientRequest(headerBlock) });
    expect(messages(timeline)).toEqual(['Accept: */*', 'Host: x']);
    expect(timeline[1].timestamp).toBeInstanceOf(Date);
  });

  test('stashes the parsed headers on the response for post-response scripts', () => {
    const response = { request: clientRequest(headerBlock) };
    recordSentHeaders([{ type: 'request', message: 'GET /x' }], response);
    expect(response.sentHeaders).toEqual([
      { key: 'Accept', value: '*/*' },
      { key: 'Host', value: 'x' }
    ]);
  });

  // A failed request has no response, so the error object itself carries the ClientRequest.
  test('accepts the error object when no response came back', () => {
    const timeline = [{ type: 'request', message: 'GET /x' }];
    const error = { request: clientRequest(headerBlock) };
    recordSentHeaders(timeline, error);
    expect(messages(timeline)).toEqual(['Accept: */*', 'Host: x']);
    expect(error.sentHeaders).toHaveLength(2);
  });

  // Each redirect hop logs into the same timeline, so a hop's headers must land in its own slot.
  test('scopes each redirect hop to its own request marker', () => {
    const timeline = [
      { type: 'request', message: 'GET /one' },
      { type: 'requestHeader', message: 'Host: a.com' },
      { type: 'response', message: 'HTTP/1.1 302 Found' },
      { type: 'request', message: 'GET /two' }
    ];
    const hopTwo = 'GET /two HTTP/1.1\r\nHost: b.com\r\n\r\n';
    recordSentHeaders(timeline, { request: clientRequest(hopTwo) });
    expect(timeline.map((e) => e.message)).toEqual([
      'GET /one',
      'Host: a.com',
      'HTTP/1.1 302 Found',
      'GET /two',
      'Host: b.com'
    ]);
  });

  test('leaves the timeline untouched when there are no sent headers', () => {
    const timeline = [{ type: 'request', message: 'GET /x' }];
    recordSentHeaders(timeline, { request: clientRequest('') });
    recordSentHeaders(timeline, undefined);
    expect(timeline).toHaveLength(1);
  });

  test('does not throw when the timeline is missing', () => {
    expect(() => recordSentHeaders(undefined, { request: clientRequest(headerBlock) })).not.toThrow();
  });
});
