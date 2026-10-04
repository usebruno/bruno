const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const http = require('http');
const zlib = require('zlib');
const { measureResponseTime, addDigestInterceptor } = require('@usebruno/requests');
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

  it('omits default headers listed in settings.omitHeaders', async () => {
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

  it('records the hop time without adding timing headers to the request or response', async () => {
    const stubAdapter = createStubAdapter();
    const instance = makeAxiosInstance();

    const response = await instance({ url: 'https://api.example.com/test', method: 'get', adapter: stubAdapter });
    const config = stubAdapter.getConfig();

    expect(config.headers['request-start-time']).toBeUndefined();
    expect(config.metadata.completedHopsTime).toEqual(expect.any(Number));
    expect(response.headers['request-duration']).toBeUndefined();
  });

  it('omits Connection on the wire when listed in settings.omitHeaders', async () => {
    const http = require('http');
    let seenHeaders;
    const server = http.createServer((req, res) => {
      seenHeaders = req.headers;
      res.writeHead(200);
      res.end('ok');
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}/`;

    try {
      const { setupProxyAgents } = require('../../src/utils/proxy-util');
      const request = {
        url,
        method: 'get',
        headers: {},
        settings: { omitHeaders: ['Connection', 'Accept'] },
        __explicitHeaderNames: []
      };
      await setupProxyAgents({
        requestConfig: request,
        proxyMode: 'off',
        proxyConfig: {},
        systemProxyConfig: {},
        httpsAgentRequestFields: { keepAlive: false },
        interpolationOptions: {},
        disableCache: true
      });

      const instance = makeAxiosInstance({ proxyMode: 'off', disableCache: true });
      await instance(request);

      expect(seenHeaders.connection).toBeUndefined();
      expect(seenHeaders.accept).toBeUndefined();
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('keeps an explicit User-Agent when omitHeaders also lists User-Agent', async () => {
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

  describe('timing across redirects', () => {
    const START_URL = 'https://api.example.com/start';
    const TARGET_URL = 'https://api.example.com/target';
    const HOP_MS = 100;

    const timedRedirectAdapter = (config) => {
      jest.advanceTimersByTime(HOP_MS);
      if (config.url === START_URL) {
        const response = { status: 302, statusText: 'Found', headers: { location: TARGET_URL }, data: {} };
        return Promise.reject(Object.assign(new Error('Redirect 302'), { config, response }));
      }
      return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config });
    };

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('sums both hops so the total covers the whole redirect chain', async () => {
      const instance = makeAxiosInstance({ followRedirects: true });

      const response = await instance({ url: START_URL, method: 'get', adapter: timedRedirectAdapter });

      expect(measureResponseTime(response.config.metadata)).toBe(2 * HOP_MS);
    });
  });

  describe('timing across a digest auth retry', () => {
    const TARGET_URL = 'https://api.example.com/target';
    const HOP_MS = 100;
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

    it('sums the challenged hop and the retry into the response time', async () => {
      const instance = makeAxiosInstance();
      addDigestInterceptor(instance, { digestConfig: { username: 'user', password: 'secret' } });

      const response = await instance({ url: TARGET_URL, method: 'get', adapter: digestChallengeAdapter });

      expect(measureResponseTime(response.config.metadata)).toBe(2 * HOP_MS);
    });
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

describe('makeAxiosInstance: content-encoding response header (GitHub #8233)', () => {
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

  it('keeps content-encoding after axios decompresses the body', async () => {
    await withServer(gzipHandler(200), async (url) => {
      const response = await makeAxiosInstance()({ url, method: 'get' });
      expect(response.data).toEqual({ ok: true });
      expect(response.headers['content-encoding']).toBe('gzip');
    });
  });

  it('keeps content-encoding on an error response', async () => {
    await withServer(gzipHandler(404), async (url) => {
      const error = await makeAxiosInstance()({ url, method: 'get' }).catch((err) => err);
      expect(error.response.status).toBe(404);
      expect(error.response.headers['content-encoding']).toBe('gzip');
    });
  });

  it('does not add content-encoding when the server did not send it', async () => {
    await withServer((req, res) => res.end('plain'), async (url) => {
      const response = await makeAxiosInstance()({ url, method: 'get' });
      expect(response.headers['content-encoding']).toBeUndefined();
    });
  });
});
