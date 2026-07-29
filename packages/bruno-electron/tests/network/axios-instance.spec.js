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

const { makeAxiosInstance, reconcileSentHeaders } = require('../../src/ipc/network/axios-instance');

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

describe('axios-instance: sent headers match the wire (integration)', () => {
  const http = require('http');

  let server;
  let baseUrl;
  let receivedRawHeaders;

  // The reconcile step rests on one assumption no unit test can pin: by the time the response
  // interceptor runs, Node has serialized the request and ClientRequest._header is populated. Drive a
  // real socket so a change that breaks it (an http2 adapter, maxRedirects > 0 routing through
  // follow-redirects' RedirectableRequest) fails here instead of silently dropping headers.
  beforeAll(async () => {
    server = http.createServer((req, res) => {
      receivedRawHeaders = req.rawHeaders;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{}');
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  // The timeline's requestHeader entries for the last hop, as "name: value" strings.
  const sentHeaderLines = (timeline) => {
    let hopStart = 0;
    for (let i = timeline.length - 1; i >= 0; i--) {
      if (timeline[i]?.type === 'request') {
        hopStart = i;
        break;
      }
    }
    return timeline
      .slice(hopStart)
      .filter((e) => e.type === 'requestHeader')
      .map((e) => e.message);
  };

  // rawHeaders is a flat [name, value, name, value, ...] of exactly what arrived.
  const receivedLines = () => {
    const lines = [];
    for (let i = 0; i < receivedRawHeaders.length; i += 2) {
      lines.push(`${receivedRawHeaders[i]}: ${receivedRawHeaders[i + 1]}`);
    }
    return lines;
  };

  test('a GET with no user headers reports every auto-added header, in wire order', async () => {
    const instance = makeAxiosInstance();

    const response = await instance({ url: `${baseUrl}/headers`, method: 'get' });

    expect(sentHeaderLines(response.timeline)).toEqual(receivedLines());
    // The six the app previously could not show in full.
    const names = sentHeaderLines(response.timeline).map((l) => l.split(':')[0].toLowerCase());
    expect(names).toEqual(
      expect.arrayContaining(['accept', 'user-agent', 'request-start-time', 'accept-encoding', 'host', 'connection'])
    );
  });

  test('a POST reports the body transport headers and no phantom Content-Type', async () => {
    const instance = makeAxiosInstance();

    const response = await instance({
      url: `${baseUrl}/headers`,
      method: 'post',
      data: { a: 1 }
    });

    const lines = sentHeaderLines(response.timeline);
    expect(lines).toEqual(receivedLines());
    expect(lines).toContain('Content-Type: application/json');
    expect(lines.some((l) => /^content-length:/i.test(l))).toBe(true);
    expect(lines).not.toContain('Content-Type: undefined');
  });
});

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

describe('axios-instance: reconcileSentHeaders', () => {
  const reqWith = (...headerLines) => ({
    _header: `GET / HTTP/1.1\r\n${headerLines.join('\r\n')}\r\n\r\n`
  });

  test('replaces the logged block with the wire block, in wire order and casing', () => {
    const timeline = [
      { type: 'request', message: 'GET http://localhost:8081/' },
      { type: 'requestHeader', message: 'accept: */*' },
      { type: 'response', message: 'HTTP/1.1 200 OK' }
    ];

    reconcileSentHeaders(timeline, reqWith('Accept: */*', 'Host: localhost:8081', 'Connection: keep-alive'));

    // The wire block is authoritative: the lowercased 'accept: */*' the interceptor logged is
    // replaced by the serialized 'Accept: */*', and the block stays before 'response'.
    expect(timeline.map((e) => e.message)).toEqual([
      'GET http://localhost:8081/',
      'Accept: */*',
      'Host: localhost:8081',
      'Connection: keep-alive',
      'HTTP/1.1 200 OK'
    ]);
    expect(timeline[1]).toMatchObject({ type: 'requestHeader' });
  });

  test('drops a logged header that never reached the wire', () => {
    // A header suppressed after logging (deleted by a script, or axios' phantom Content-Type) must
    // not survive into the displayed set.
    const timeline = [
      { type: 'request', message: 'GET /' },
      { type: 'requestHeader', message: 'Content-Type: undefined' },
      { type: 'requestHeader', message: 'x-gone: 1' }
    ];

    reconcileSentHeaders(timeline, reqWith('Host: localhost', 'Content-Type: application/json'));

    expect(timeline.map((e) => e.message)).toEqual([
      'GET /',
      'Host: localhost',
      'Content-Type: application/json'
    ]);
  });

  test('keeps every occurrence of a header sent more than once', () => {
    const timeline = [
      { type: 'request', message: 'GET /' },
      { type: 'requestHeader', message: 'x-multi: a' }
    ];

    reconcileSentHeaders(timeline, reqWith('X-Multi: a', 'X-Multi: b'));

    expect(timeline.map((e) => e.message)).toEqual(['GET /', 'X-Multi: a', 'X-Multi: b']);
  });

  test('redacts proxy credentials the agent injected', () => {
    const timeline = [{ type: 'request', message: 'GET /' }];

    reconcileSentHeaders(timeline, reqWith('Host: x', 'Proxy-Authorization: Basic dXNlcjpwYXNz'));

    expect(timeline.map((e) => e.message)).toEqual(['GET /', 'Host: x', 'Proxy-Authorization: <redacted>']);
  });

  test('scopes to the last hop, leaving an earlier redirect hop untouched', () => {
    const timeline = [
      { type: 'request', message: 'GET /old' },
      { type: 'requestHeader', message: 'accept: */*' },
      { type: 'requestHeader', message: 'Host: a.example' },
      { type: 'response', message: 'HTTP/1.1 302 Found' },
      { type: 'request', message: 'GET /new' },
      { type: 'requestHeader', message: 'accept: */*' }
    ];

    reconcileSentHeaders(timeline, reqWith('Accept: */*', 'Host: b.example'));

    expect(timeline.map((e) => e.message)).toEqual([
      'GET /old',
      'accept: */*',
      'Host: a.example',
      'HTTP/1.1 302 Found',
      'GET /new',
      'Accept: */*',
      'Host: b.example'
    ]);
  });

  test('inserts the block when the hop logged no request headers', () => {
    const timeline = [{ type: 'request', message: 'GET /' }];

    reconcileSentHeaders(timeline, reqWith('Host: localhost:8081'));

    expect(timeline.map((e) => e.message)).toEqual(['GET /', 'Host: localhost:8081']);
    expect(timeline[1]).toMatchObject({ type: 'requestHeader' });
  });

  test('replaces a malformed logged entry along with the rest of the block', () => {
    const timeline = [
      { type: 'request', message: 'GET /' },
      { type: 'requestHeader' }, // malformed: no message
      { type: 'requestHeader', message: 'accept: */*' }
    ];

    reconcileSentHeaders(timeline, reqWith('Accept: */*', 'Host: localhost'));

    expect(timeline.map((e) => e.message)).toEqual(['GET /', 'Accept: */*', 'Host: localhost']);
  });

  describe('getHeaders() fallback', () => {
    test('adds only the missing names instead of replacing, since the fallback omits Connection', () => {
      const timeline = [
        { type: 'request', message: 'GET /' },
        { type: 'requestHeader', message: 'accept: */*' }
      ];

      reconcileSentHeaders(timeline, { getHeaders: () => ({ accept: '*/*', host: 'localhost' }) });

      // 'accept' is already logged and kept as logged; only 'host' is added. Replacing wholesale here
      // would silently drop Connection/Transfer-Encoding, which getHeaders() never reports.
      expect(timeline.map((e) => e.message)).toEqual(['GET /', 'accept: */*', 'host: localhost']);
    });

    test('is a no-op when every reported header is already logged', () => {
      const timeline = [
        { type: 'request', message: 'GET /' },
        { type: 'requestHeader', message: 'Host: localhost:8081' }
      ];
      const before = JSON.parse(JSON.stringify(timeline));

      reconcileSentHeaders(timeline, { getHeaders: () => ({ Host: 'localhost:8081' }) });

      expect(timeline).toEqual(before);
    });
  });

  test('leaves the timeline alone when the request reports no headers', () => {
    const timeline = [
      { type: 'request', message: 'GET /' },
      { type: 'requestHeader', message: 'accept: */*' }
    ];
    const before = JSON.parse(JSON.stringify(timeline));

    reconcileSentHeaders(timeline, {});

    expect(timeline).toEqual(before);
  });

  test('ignores a non-array timeline or a missing request', () => {
    expect(() => reconcileSentHeaders(null, reqWith('Host: x'))).not.toThrow();
    const timeline = [{ type: 'request', message: 'GET /' }];
    reconcileSentHeaders(timeline, null);
    expect(timeline).toHaveLength(1);
  });

  test('never throws (or mutates) when reading the request fails — the request path stays protected', () => {
    const timeline = [
      { type: 'request', message: 'GET /' },
      { type: 'requestHeader', message: 'accept: */*' }
    ];
    const before = JSON.parse(JSON.stringify(timeline));
    // A req whose header source throws (this runs on the core success/error path).
    const req = { getHeaders: () => { throw new Error('boom'); } };
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => reconcileSentHeaders(timeline, req)).not.toThrow();
    expect(timeline).toEqual(before);

    errorSpy.mockRestore();
  });
});
