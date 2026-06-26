const { describe, it, expect } = require('@jest/globals');
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

    it('should strip Authorization and Proxy-Authorization headers on cross-origin redirect when forwardAuthorizationOnRedirect is false', async () => {
      const stubAdapter = createRedirectingStubAdapter('https://other-domain.com/target');
      const instance = makeAxiosInstance({
        followRedirects: true,
        forwardAuthorizationOnRedirect: false
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
      expect(calls[1].headers['Authorization']).toBeUndefined();
      expect(calls[1].headers['Proxy-Authorization']).toBeUndefined();
      expect(calls[1].headers['Custom-Header']).toBe('keep-me');
    });

    it('should preserve Authorization and Proxy-Authorization headers on cross-origin redirect when forwardAuthorizationOnRedirect is true', async () => {
      const stubAdapter = createRedirectingStubAdapter('https://other-domain.com/target');
      const instance = makeAxiosInstance({
        followRedirects: true,
        forwardAuthorizationOnRedirect: true
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
      expect(calls[1].headers['authorization']).toBe('Bearer my-token');
      expect(calls[1].headers['proxy-authorization']).toBe('Bearer proxy-token');
      expect(calls[1].headers['Custom-Header']).toBe('keep-me');
    });

    it('should preserve Authorization and Proxy-Authorization headers on same-origin redirect even if forwardAuthorizationOnRedirect is false', async () => {
      const stubAdapter = createRedirectingStubAdapter('https://api.example.com/target');
      const instance = makeAxiosInstance({
        followRedirects: true,
        forwardAuthorizationOnRedirect: false
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
      expect(calls[1].headers['Authorization']).toBe('Bearer my-token');
      expect(calls[1].headers['Proxy-Authorization']).toBe('Bearer proxy-token');
    });

    it('should preserve Authorization and Proxy-Authorization headers on relative redirect even if forwardAuthorizationOnRedirect is false', async () => {
      const stubAdapter = createRedirectingStubAdapter('/relative-target');
      const instance = makeAxiosInstance({
        followRedirects: true,
        forwardAuthorizationOnRedirect: false
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
      expect(calls[1].headers['Authorization']).toBe('Bearer my-token');
      expect(calls[1].headers['Proxy-Authorization']).toBe('Bearer proxy-token');
    });
  });
});
