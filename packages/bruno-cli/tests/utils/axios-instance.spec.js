const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const http = require('http');
const { makeAxiosInstance } = require('../../src/utils/axios-instance');

function createStubAdapter() {
  let capturedConfig = null;

  const adapter = (config) => {
    capturedConfig = config;
    return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config });
  };

  adapter.getConfig = () => capturedConfig;

  return adapter;
}

describe('makeAxiosInstance', () => {
  it('setting User-Agent does not clobber the axios default Accept header', async () => {
    const stubAdapter = createStubAdapter();
    const instance = makeAxiosInstance();

    await instance({ url: 'https://api.example.com/test', method: 'get', adapter: stubAdapter });

    // axios.create() sets Accept by default; assigning a new object to defaults.headers.common
    // would nuke it. Guard against that regression.
    expect(stubAdapter.getConfig().headers['Accept']).toMatch(/application\/json/);
  });

  it('sets User-Agent header to bruno-runtime version', async () => {
    const stubAdapter = createStubAdapter();
    const instance = makeAxiosInstance();

    await instance({ url: 'https://api.example.com/test', method: 'get', adapter: stubAdapter });

    expect(stubAdapter.getConfig().headers['User-Agent']).toMatch(/^bruno-runtime\//);
  });

  describe('cross-origin redirects authorization stripping', () => {
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

    it('should strip Authorization and Proxy-Authorization headers on cross-origin redirect when forwardAuthorizationHeader is false', async () => {
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

    it('should preserve Authorization and Proxy-Authorization headers on cross-origin redirect when forwardAuthorizationHeader is true', async () => {
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

    it('should preserve Authorization and Proxy-Authorization headers on same-origin redirect even if forwardAuthorizationHeader is false', async () => {
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

    it('should preserve Authorization and Proxy-Authorization headers on relative redirect even if forwardAuthorizationHeader is false', async () => {
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
  });
});

/**
 * `sentHeaders` is what the reporters (--reporter-json / --reporter-html) print as the request's
 * headers, so it must describe the real request rather than the one Bruno prepared. Only a real
 * socket proves that: config.headers is missing the transport headers the Node adapter appends while
 * serializing, and a stub adapter never produces a ClientRequest to read them back from.
 */
describe('makeAxiosInstance: sentHeaders recorded off the wire', () => {
  let server;
  let baseUrl;
  let receivedRawHeaders;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      receivedRawHeaders = req.rawHeaders;
      const status = req.url === '/missing' ? 404 : 200;
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end('{}');
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  // rawHeaders is a flat [name, value, name, value, ...] of exactly what arrived.
  const receivedNames = () => {
    const names = [];
    for (let i = 0; i < receivedRawHeaders.length; i += 2) names.push(receivedRawHeaders[i].toLowerCase());
    return names;
  };

  const lowercaseNames = (sentHeaders) => Object.keys(sentHeaders || {}).map((name) => name.toLowerCase());

  // Bruno's own timing carrier. It goes on the wire but holds a raw epoch value, so reporting it
  // would make every report differ between otherwise identical runs.
  const TIMING_HEADER = 'request-start-time';
  const TRANSPORT_HEADERS = ['accept', 'user-agent', 'accept-encoding', 'host', 'connection'];

  it('reports the transport headers on a success, minus the internal timing header', async () => {
    const instance = makeAxiosInstance({});

    const response = await instance({ url: `${baseUrl}/ok`, method: 'get' });

    // Host/Connection/Accept-Encoding exist only once the adapter serializes, so their presence is
    // what distinguishes the wire headers from the prepared ones.
    expect(lowercaseNames(response.sentHeaders)).toEqual(expect.arrayContaining(TRANSPORT_HEADERS));
    expect(response.sentHeaders['Host']).toBe(new URL(baseUrl).host);
    expect(lowercaseNames(response.sentHeaders)).not.toContain(TIMING_HEADER);

    // The server saw the timing header; the report is what drops it.
    expect(receivedNames()).toContain(TIMING_HEADER);
    expect(lowercaseNames(response.sentHeaders).sort()).toEqual(
      receivedNames().filter((name) => name !== TIMING_HEADER).sort()
    );
  });

  it('reports them on a 4xx, on both the error and its response', async () => {
    const instance = makeAxiosInstance({});

    // axios rejects a 404 with no validateStatus override. run-single-request then promotes
    // err.response to `response`, so the error and its response both have to carry the headers.
    const err = await instance({ url: `${baseUrl}/missing`, method: 'get' }).catch((e) => e);

    expect(err.response.status).toBe(404);
    expect(lowercaseNames(err.sentHeaders)).toEqual(expect.arrayContaining(TRANSPORT_HEADERS));
    expect(lowercaseNames(err.response.sentHeaders)).toEqual(expect.arrayContaining(TRANSPORT_HEADERS));
    expect(lowercaseNames(err.sentHeaders)).not.toContain(TIMING_HEADER);
    expect(lowercaseNames(err.response.sentHeaders)).not.toContain(TIMING_HEADER);
  });

  it('still reports them when the connection is refused before any response', async () => {
    const instance = makeAxiosInstance({});

    // Node serializes the header block when the ClientRequest is constructed — before it resolves DNS
    // or opens the socket — so a connect/DNS failure still knows exactly what it was about to send.
    const err = await instance({ url: 'http://127.0.0.1:1/nope', method: 'get' }).catch((e) => e);

    expect(err.code).toBe('ECONNREFUSED');
    expect(err.response).toBeUndefined();
    expect(lowercaseNames(err.sentHeaders)).toEqual(expect.arrayContaining(TRANSPORT_HEADERS));
    expect(lowercaseNames(err.sentHeaders)).not.toContain(TIMING_HEADER);
  });

  it('records nothing when the request never reached the adapter', async () => {
    const instance = makeAxiosInstance({});

    // Rejected before a ClientRequest exists, so there is no wire block to read. This is the only
    // case where the runner's `err.sentHeaders || request.headers` falls back to prepared headers.
    const err = await instance({ url: 'ftp://example.com/p', method: 'get' }).catch((e) => e);

    expect(err.request).toBeUndefined();
    expect(err.sentHeaders).toBeUndefined();
  });

  describe('a header name declared at every level of the hierarchy', () => {
    const { mergeHeaders } = require('../../src/utils/collection');

    const SHARED = 'shared-header-1';
    // The same name at every level, each with its own value. Only the most specific may be sent.
    const declaredAt = (level) => [
      { name: `${level}-header-1`, value: `${level}-header-value-1`, enabled: true },
      { name: SHARED, value: `${level}-shared-value-1`, enabled: true }
    ];

    // The hierarchy the runner resolves before a request is serialized: collection -> folder-1 ->
    // folder-2 -> request. mergeHeaders is the real thing, so precedence is not re-implemented here.
    const resolveHierarchy = () => {
      const request = {};
      mergeHeaders(
        { root: { request: { headers: declaredAt('collection') } } },
        request,
        [
          { type: 'folder', root: { request: { headers: declaredAt('folder-1') } } },
          { type: 'folder', root: { request: { headers: declaredAt('folder-2') } } },
          { type: 'http-request', request: { headers: declaredAt('request') } }
        ]
      );
      return request.headers;
    };

    // Values the server actually received for a name, in arrival order.
    const receivedValuesFor = (name) => {
      const values = [];
      for (let i = 0; i < receivedRawHeaders.length; i += 2) {
        if (receivedRawHeaders[i].toLowerCase() === name.toLowerCase()) values.push(receivedRawHeaders[i + 1]);
      }
      return values;
    };

    it('resolves to the most specific value, and reports that one value once', async () => {
      const merged = resolveHierarchy();

      // Resolution collapses the four declarations into one row before anything is sent.
      expect(merged.filter((h) => h.name === SHARED)).toHaveLength(1);
      // mergeHeaders emits definition rows; the adapter sends a name -> value object.
      const headers = Object.fromEntries(merged.map((h) => [h.name, h.value]));
      expect(headers[SHARED]).toBe('request-shared-value-1');

      const instance = makeAxiosInstance({});
      const response = await instance({ url: `${baseUrl}/ok`, method: 'get', headers });

      // The wire report carries the resolved value once. An outer level's value surfacing here, or a
      // second row for the same name, would mean a report describing headers that were never sent.
      expect(Object.keys(response.sentHeaders).filter((n) => n.toLowerCase() === SHARED)).toHaveLength(1);
      expect(response.sentHeaders[SHARED]).toBe('request-shared-value-1');
      expect(JSON.stringify(response.sentHeaders)).not.toContain('collection-shared-value-1');
      expect(JSON.stringify(response.sentHeaders)).not.toContain('folder-1-shared-value-1');
      expect(JSON.stringify(response.sentHeaders)).not.toContain('folder-2-shared-value-1');

      // And the socket agrees: one occurrence, the request-level value.
      expect(receivedValuesFor(SHARED)).toEqual(['request-shared-value-1']);
    });

    it('keeps each level\'s own uniquely-named headers alongside the resolved one', async () => {
      const headers = Object.fromEntries(resolveHierarchy().map((h) => [h.name, h.value]));

      const instance = makeAxiosInstance({});
      const response = await instance({ url: `${baseUrl}/ok`, method: 'get', headers });

      // Precedence applies per name: a name only one level declares is untouched by the collapse.
      for (const level of ['collection', 'folder-1', 'folder-2', 'request']) {
        expect(response.sentHeaders[`${level}-header-1`]).toBe(`${level}-header-value-1`);
      }
      // 4 uniquely-named + 1 resolved shared.
      const declared = Object.keys(response.sentHeaders).filter((n) => /-header-1$/.test(n));
      expect(declared.sort()).toEqual([
        'collection-header-1',
        'folder-1-header-1',
        'folder-2-header-1',
        'request-header-1',
        SHARED
      ]);
    });
  });
});
