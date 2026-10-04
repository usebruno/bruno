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

const http = require('http');
const zlib = require('zlib');
const { AxiosHeaders } = require('axios');
const { measureResponseTime, addDigestInterceptor } = require('@usebruno/requests');
const { setupProxyAgents } = require('../../src/utils/proxy-util');
const { makeAxiosInstance, completeOpenHop } = require('../../src/ipc/network/axios-instance');

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

  test('omits default headers listed in settings.omitHeaders', async () => {
    const stubAdapter = createStubAdapter();
    const instance = makeAxiosInstance();

    await instance({
      url: 'https://api.example.com/test',
      method: 'get',
      adapter: stubAdapter,
      settings: {
        omitHeaders: ['User-Agent', 'Accept']
      },
      __explicitHeaderNames: []
    });

    const headers = stubAdapter.getConfig().headers;
    expect(headers['User-Agent']).toBeNull();
    expect(headers['Accept']).toBeNull();
  });

  test('records the hop time without adding timing headers to the request or response', async () => {
    const stubAdapter = createStubAdapter();
    const instance = makeAxiosInstance();

    const response = await instance({ url: 'https://api.example.com/test', method: 'get', adapter: stubAdapter });
    const config = stubAdapter.getConfig();

    expect(config.headers['request-start-time']).toBeUndefined();
    expect(config.metadata.completedHopsTime).toEqual(expect.any(Number));
    expect(response.headers['request-duration']).toBeUndefined();
  });

  test('keeps an explicit User-Agent when omitHeaders also lists User-Agent', async () => {
    const stubAdapter = createStubAdapter();
    const instance = makeAxiosInstance();

    await instance({
      url: 'https://api.example.com/test',
      method: 'get',
      adapter: stubAdapter,
      headers: {
        'User-Agent': 'my-client/1.0'
      },
      settings: {
        omitHeaders: ['User-Agent']
      },
      __explicitHeaderNames: ['User-Agent']
    });

    expect(stubAdapter.getConfig().headers['User-Agent']).toBe('my-client/1.0');
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
        'X-Amz-Date': '20230806T000000Z',
        'X-Amz-Security-Token': 'some-token',
        'Custom-Header': 'keep-me'
      },
      adapter: stubAdapter
    });

    const calls = stubAdapter.getCalls();
    expect(calls.length).toBe(2);

    // First call should have headers
    expect(calls[0].headers['Authorization']).toBe('Bearer my-token');
    expect(calls[0].headers['Proxy-Authorization']).toBe('Bearer proxy-token');
    expect(calls[0].headers['X-Amz-Date']).toBe('20230806T000000Z');
    expect(calls[0].headers['X-Amz-Security-Token']).toBe('some-token');
    expect(calls[0].headers['Custom-Header']).toBe('keep-me');

    // Redirected call should strip auth headers but keep custom headers
    expect(calls[1].url).toBe('https://other-domain.com/target');
    expect(calls[1].headers['Authorization']).toBeUndefined();
    expect(calls[1].headers['Proxy-Authorization']).toBeUndefined();
    expect(calls[1].headers['X-Amz-Date']).toBeUndefined();
    expect(calls[1].headers['X-Amz-Security-Token']).toBeUndefined();
    expect(calls[1].headers['Custom-Header']).toBe('keep-me');
    expect(calls[1].__skipAwsV4Sign).toBe(true);
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

const TIME_TO_FIRST_BYTE_MS = 40;
const BODY_DOWNLOAD_MS = 260;
const HOP_MS = 100;
const START_URL = 'https://api.example.com/start';
const TARGET_URL = 'https://api.example.com/target';

const timingMessages = (timeline, label) => timeline
  .map((entry) => entry.message)
  .filter((message) => message?.startsWith(label));

/** Each hop takes `HOP_MS`; `START_URL` redirects to `TARGET_URL`. */
const timedAdapter = (config) => {
  jest.advanceTimersByTime(HOP_MS);
  if (config.url === START_URL) {
    const response = { status: 302, statusText: 'Found', headers: { location: TARGET_URL }, data: {} };
    return Promise.reject(Object.assign(new Error('Redirect 302'), { config, response }));
  }
  return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config });
};

/**
 * Sends a streamed request, as Bruno does, so the body is still unread when the response
 * interceptor fires after the stub adapter's `TIME_TO_FIRST_BYTE_MS`.
 */
const sendThroughAxiosInstance = async (status) => {
  const adapter = (config) => {
    jest.advanceTimersByTime(TIME_TO_FIRST_BYTE_MS);
    const response = { data: {}, status, statusText: '', headers: new AxiosHeaders(), config };

    if (status >= 400) {
      return Promise.reject(Object.assign(new Error('Request failed'), { isAxiosError: true, config, response }));
    }
    return Promise.resolve(response);
  };

  const instance = makeAxiosInstance();
  const request = { url: 'https://api.example.com/test', method: 'get', responseType: 'stream', adapter, validateStatus: null };

  try {
    return await instance(request);
  } catch (error) {
    return error.response;
  }
};

describe('axios-instance: streamed response time', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('measures the full download once the body is consumed, not time to first byte', async () => {
    const response = await sendThroughAxiosInstance(200);
    jest.advanceTimersByTime(BODY_DOWNLOAD_MS);

    const responseTime = measureResponseTime(response.config.metadata);

    expect(responseTime).toBe(TIME_TO_FIRST_BYTE_MS + BODY_DOWNLOAD_MS);
  });

  test('measures the full download for an error response too', async () => {
    const response = await sendThroughAxiosInstance(500);
    jest.advanceTimersByTime(BODY_DOWNLOAD_MS);

    const responseTime = measureResponseTime(response.config.metadata);

    expect(responseTime).toBe(TIME_TO_FIRST_BYTE_MS + BODY_DOWNLOAD_MS);
  });

  test('matches time to first byte when measured before the body is consumed, as streams are', async () => {
    const response = await sendThroughAxiosInstance(200);

    const responseTime = measureResponseTime(response.config.metadata);

    expect(responseTime).toBe(TIME_TO_FIRST_BYTE_MS);
  });

  test('logs when the response headers arrive, before the body is consumed', async () => {
    const response = await sendThroughAxiosInstance(200);

    expect(timingMessages(response.timeline, 'Response headers received')).toEqual([
      `Response headers received in ${TIME_TO_FIRST_BYTE_MS} ms`
    ]);
  });

  test('returns 0 when no hop timing was recorded', () => {
    expect(measureResponseTime(undefined)).toBe(0);
  });
});

describe('axios-instance: timing across redirects', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('sums both hops so the total covers the whole redirect chain', async () => {
    const instance = makeAxiosInstance({ followRedirects: true });

    const response = await instance({ url: START_URL, method: 'get', adapter: timedAdapter });

    expect(measureResponseTime(response.config.metadata)).toBe(2 * HOP_MS);
  });

  test('records only the followed hop while a streamed final hop\'s body is still unread', async () => {
    const instance = makeAxiosInstance({ followRedirects: true });

    const response = await instance({ url: START_URL, method: 'get', responseType: 'stream', adapter: timedAdapter });

    expect(timingMessages(response.timeline, 'Request completed')).toEqual([`Request completed in ${HOP_MS} ms`]);
  });

  test('records the streamed final hop\'s own duration once its body is consumed', async () => {
    const instance = makeAxiosInstance({ followRedirects: true });
    const response = await instance({ url: START_URL, method: 'get', responseType: 'stream', adapter: timedAdapter });
    jest.advanceTimersByTime(BODY_DOWNLOAD_MS);

    completeOpenHop(response.config);

    expect(timingMessages(response.timeline, 'Request completed')).toEqual([
      `Request completed in ${HOP_MS} ms`,
      `Request completed in ${HOP_MS + BODY_DOWNLOAD_MS} ms`
    ]);
  });
});

describe('axios-instance: request preparation', () => {
  const PROXY_SETUP_MS = 30;

  beforeEach(() => {
    jest.useFakeTimers();
    setupProxyAgents.mockImplementation(async () => {
      jest.advanceTimersByTime(PROXY_SETUP_MS);
    });
  });

  afterEach(() => {
    setupProxyAgents.mockReset();
    jest.useRealTimers();
  });

  test('logs the proxy setup as the request\'s preparation', async () => {
    const instance = makeAxiosInstance();

    const response = await instance({ url: TARGET_URL, method: 'get', adapter: timedAdapter });

    expect(timingMessages(response.timeline, 'Request prepared')).toEqual([`Request prepared in ${PROXY_SETUP_MS} ms`]);
  });

  test('skips the preparation entry when preparation takes no time', async () => {
    setupProxyAgents.mockImplementation(async () => {});
    const instance = makeAxiosInstance();

    const response = await instance({ url: TARGET_URL, method: 'get', adapter: timedAdapter });

    expect(timingMessages(response.timeline, 'Request prepared')).toEqual([]);
  });

  test('measures a followed redirect\'s preparation within its own request interceptor', async () => {
    const instance = makeAxiosInstance({ followRedirects: true });

    const response = await instance({ url: START_URL, method: 'get', adapter: timedAdapter });

    expect(timingMessages(response.timeline, 'Request prepared')).toEqual([
      `Request prepared in ${PROXY_SETUP_MS} ms`,
      `Request prepared in ${PROXY_SETUP_MS} ms`
    ]);
  });

  test('leaves every hop\'s preparation out of the response time', async () => {
    const instance = makeAxiosInstance({ followRedirects: true });

    const response = await instance({ url: START_URL, method: 'get', adapter: timedAdapter });

    expect(measureResponseTime(response.config.metadata)).toBe(2 * HOP_MS);
  });
});

describe('axios-instance: timing across a digest auth retry', () => {
  const DIGEST_CHALLENGE = 'Digest realm="bruno", nonce="dcd98b7102dd2f0e"';

  /** Challenges the first hop, which the digest interceptor answers by re-sending the request. */
  const digestChallengeAdapter = (config) => {
    jest.advanceTimersByTime(HOP_MS);
    if (!config.headers.has('Authorization')) {
      const response = { status: 401, statusText: 'Unauthorized', headers: { 'www-authenticate': DIGEST_CHALLENGE }, data: {} };
      return Promise.reject(Object.assign(new Error('Unauthorized'), { config, response }));
    }
    return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config });
  };

  // Streamed, as Bruno sends it, so nothing closes the challenged hop except the re-send.
  const sendWithDigestAuth = () => {
    const instance = makeAxiosInstance();
    addDigestInterceptor(instance, { digestConfig: { username: 'user', password: 'secret' } });
    return instance({ url: TARGET_URL, method: 'get', responseType: 'stream', adapter: digestChallengeAdapter });
  };

  let consoleDebugSpy;

  beforeEach(() => {
    jest.useFakeTimers();
    // The digest interceptor logs each challenge it answers.
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleDebugSpy.mockRestore();
    jest.useRealTimers();
  });

  test('counts the challenged hop toward the response time', async () => {
    const response = await sendWithDigestAuth();

    expect(measureResponseTime(response.config.metadata)).toBe(2 * HOP_MS);
  });

  test('logs the challenged hop as completed when the request is re-sent', async () => {
    const response = await sendWithDigestAuth();

    expect(timingMessages(response.timeline, 'Request completed')).toEqual([`Request completed in ${HOP_MS} ms`]);
  });
});

describe('axios-instance: sent headers', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    server = http.createServer((_req, res) => {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  // The runner rebuilds its response object out of error.response, so a non-2xx has to carry
  // the transport headers or post-response scripts lose them.
  test('a non-2xx carries the transport headers on error.response', async () => {
    const instance = makeAxiosInstance();

    const error = await instance({ url: baseUrl, method: 'get' }).catch((err) => err);

    expect(error.response.status).toBe(404);
    expect(error.response.sentHeaders).toMatchObject({
      'Host': `127.0.0.1:${server.address().port}`,
      'Connection': 'keep-alive',
      'User-Agent': expect.stringMatching(/^bruno-runtime\//)
    });
  });

  test('omits Connection on the wire when listed in settings.omitHeaders', async () => {
    let seenHeaders;
    const echoServer = http.createServer((req, res) => {
      seenHeaders = req.headers;
      res.writeHead(200);
      res.end('ok');
    });
    await new Promise((resolve) => echoServer.listen(0, '127.0.0.1', resolve));
    const echoUrl = `http://127.0.0.1:${echoServer.address().port}/`;

    try {
      const instance = makeAxiosInstance();
      // Attach a keepAlive agent the way production setupProxyAgents would.
      await instance({
        url: echoUrl,
        method: 'get',
        headers: {},
        httpAgent: new http.Agent({ keepAlive: true }),
        settings: { omitHeaders: ['Connection', 'Accept'] },
        __explicitHeaderNames: []
      });

      expect(seenHeaders.connection).toBeUndefined();
      expect(seenHeaders.accept).toBeUndefined();
    } finally {
      await new Promise((resolve) => echoServer.close(resolve));
    }
  });

  test('keeps an explicit Connection when omitHeaders also lists Connection', async () => {
    let seenHeaders;
    const echoServer = http.createServer((req, res) => {
      seenHeaders = req.headers;
      res.writeHead(200);
      res.end('ok');
    });
    await new Promise((resolve) => echoServer.listen(0, '127.0.0.1', resolve));
    const echoUrl = `http://127.0.0.1:${echoServer.address().port}/`;

    try {
      const instance = makeAxiosInstance();
      await instance({
        url: echoUrl,
        method: 'get',
        headers: { Connection: 'close' },
        httpAgent: new http.Agent({ keepAlive: true }),
        settings: { omitHeaders: ['Connection'] },
        __explicitHeaderNames: ['Connection']
      });

      expect(seenHeaders.connection).toBe('close');
    } finally {
      await new Promise((resolve) => echoServer.close(resolve));
    }
  });

  test('the proxy credential stays visible but its value is masked', async () => {
    const instance = makeAxiosInstance();
    const credential = 'Basic dXNlcjpwYXNzd29yZA==';

    const error = await instance({
      url: baseUrl,
      method: 'get',
      headers: { 'Proxy-Authorization': credential }
    }).catch((err) => err);

    const masked = error.response.sentHeaders['Proxy-Authorization'];
    expect(masked).toBe('*'.repeat(credential.length));
    expect(masked).not.toContain('dXNlcj');
  });
});

describe('axios-instance: content-encoding response header (GitHub #8233)', () => {
  const withServer = async (handler, run) => {
    const server = http.createServer(handler);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      await run(`http://127.0.0.1:${server.address().port}`);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  };

  const gzipHandler = (status) => (req, res) => {
    const body = zlib.gzipSync(JSON.stringify({ ok: true }));
    res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip', 'Content-Length': body.length });
    res.end(body);
  };

  test('keeps content-encoding after axios decompresses the body', async () => {
    await withServer(gzipHandler(200), async (url) => {
      const response = await makeAxiosInstance()({ url, method: 'get' });
      expect(response.data).toEqual({ ok: true });
      expect(response.headers['content-encoding']).toBe('gzip');
    });
  });

  test('keeps content-encoding on a streamed response', async () => {
    await withServer(gzipHandler(200), async (url) => {
      const response = await makeAxiosInstance()({ url, method: 'get', responseType: 'stream' });
      const chunks = [];
      for await (const chunk of response.data) chunks.push(chunk);
      expect(JSON.parse(Buffer.concat(chunks).toString())).toEqual({ ok: true });
      expect(response.headers['content-encoding']).toBe('gzip');
    });
  });

  test('keeps content-encoding on an error response', async () => {
    await withServer(gzipHandler(404), async (url) => {
      const error = await makeAxiosInstance()({ url, method: 'get' }).catch((err) => err);
      expect(error.response.status).toBe(404);
      expect(error.response.headers['content-encoding']).toBe('gzip');
    });
  });

  test('does not add content-encoding when the server did not send it', async () => {
    await withServer((req, res) => res.end('plain'), async (url) => {
      const response = await makeAxiosInstance()({ url, method: 'get' });
      expect(response.headers['content-encoding']).toBeUndefined();
    });
  });
});
