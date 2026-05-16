const axios = require('axios');
const { addDigestInterceptor } = require('./digestauth-helper');

describe('Digest Auth — URL-embedded credentials', () => {
  test('credentials in URL are used for digest when digestConfig is empty', async () => {
    const axiosInstance = axios.create();
    let callCount = 0;
    let capturedAuth;

    axiosInstance.defaults.adapter = async (config) => {
      callCount += 1;
      if (callCount === 1) {
        const error = new Error('Unauthorized');
        error.config = config;
        error.response = {
          status: 401,
          headers: { 'www-authenticate': 'Digest realm="testrealm", nonce="abc", qop="auth"' }
        };
        throw error;
      }
      capturedAuth = config.headers?.Authorization || config.headers?.authorization;
      return { status: 200, statusText: 'OK', headers: {}, config, data: { ok: true } };
    };

    const request = {
      method: 'GET',
      url: 'https://admin:s3cr3t@www.example.com/api/protected',
      headers: {},
      digestConfig: { username: '', password: '' }
    };

    addDigestInterceptor(axiosInstance, request);
    const res = await axiosInstance(request);
    expect(res.status).toEqual(200);
    expect(capturedAuth).toMatch(/^Digest /);
    expect(capturedAuth).toMatch(/username="admin"/);
  });

  test('URL credentials are stripped from the retry request after a Digest challenge', async () => {
    const axiosInstance = axios.create();
    let callCount = 0;
    let firstRequestUrl;
    let retryRequestUrl;

    axiosInstance.defaults.adapter = async (config) => {
      callCount += 1;
      if (callCount === 1) {
        firstRequestUrl = config.url;
        const error = new Error('Unauthorized');
        error.config = config;
        error.response = {
          status: 401,
          headers: { 'www-authenticate': 'Digest realm="r", nonce="n", qop="auth"' }
        };
        throw error;
      }
      retryRequestUrl = config.url;
      return { status: 200, statusText: 'OK', headers: {}, config, data: { ok: true } };
    };

    const request = {
      method: 'GET',
      url: 'https://admin:password@www.example.com/api/resource',
      headers: {},
      digestConfig: { username: '', password: '' }
    };

    addDigestInterceptor(axiosInstance, request);
    await axiosInstance(request);

    // First request carries the original URL (with credentials) so axios can send Basic if needed
    expect(firstRequestUrl).toBe('https://admin:password@www.example.com/api/resource');
    // Retry after Digest challenge must have credentials stripped to prevent re-adding Basic
    expect(retryRequestUrl).not.toContain('admin:password@');
    expect(retryRequestUrl).toBe('https://www.example.com/api/resource');
  });

  test('Basic auth with URL credentials is not broken (no 401 path)', async () => {
    // Regression: stripping URL credentials at interceptor setup broke servers that accept Basic auth.
    // The URL must reach the adapter intact on the first call so axios can send Authorization: Basic.
    const axiosInstance = axios.create();
    let firstRequestUrl;

    axiosInstance.defaults.adapter = async (config) => {
      firstRequestUrl = config.url;
      // Server accepts Basic auth immediately — no 401
      return { status: 200, statusText: 'OK', headers: {}, config, data: { ok: true } };
    };

    const request = {
      method: 'GET',
      url: 'https://admin:password@www.example.com/api/basic-resource',
      headers: {},
      digestConfig: { username: 'admin', password: 'password' }
    };

    addDigestInterceptor(axiosInstance, request);
    const res = await axiosInstance(request);

    expect(res.status).toEqual(200);
    // URL must still contain credentials on the first (and only) call
    expect(firstRequestUrl).toBe('https://admin:password@www.example.com/api/basic-resource');
  });

  test('digestConfig credentials take priority over URL-embedded credentials', async () => {
    const axiosInstance = axios.create();
    let capturedAuth;
    let callCount = 0;

    axiosInstance.defaults.adapter = async (config) => {
      callCount += 1;
      if (callCount === 1) {
        const error = new Error('Unauthorized');
        error.config = config;
        error.response = {
          status: 401,
          headers: { 'www-authenticate': 'Digest realm="r", nonce="n", qop="auth"' }
        };
        throw error;
      }
      capturedAuth = config.headers?.Authorization || config.headers?.authorization;
      return { status: 200, statusText: 'OK', headers: {}, config, data: { ok: true } };
    };

    const request = {
      method: 'GET',
      url: 'https://wronguser:wrongpass@www.example.com/api/resource',
      headers: {},
      digestConfig: { username: 'correctuser', password: 'correctpass' }
    };

    addDigestInterceptor(axiosInstance, request);
    const res = await axiosInstance(request);
    expect(res.status).toEqual(200);
    // Should use digestConfig credentials, not URL ones
    expect(capturedAuth).toMatch(/username="correctuser"/);
    expect(capturedAuth).not.toMatch(/username="wronguser"/);
  });

  test('no Authorization: Basic header is sent when URL has embedded credentials', async () => {
    const axiosInstance = axios.create();
    let firstRequestHeaders;
    let callCount = 0;

    axiosInstance.defaults.adapter = async (config) => {
      callCount += 1;
      if (callCount === 1) {
        firstRequestHeaders = { ...config.headers };
        const error = new Error('Unauthorized');
        error.config = config;
        error.response = {
          status: 401,
          headers: { 'www-authenticate': 'Digest realm="r", nonce="n", qop="auth"' }
        };
        throw error;
      }
      return { status: 200, statusText: 'OK', headers: {}, config, data: { ok: true } };
    };

    const request = {
      method: 'GET',
      url: 'https://admin:password@www.example.com/api/resource',
      headers: {},
      digestConfig: { username: 'admin', password: 'password' }
    };

    addDigestInterceptor(axiosInstance, request);
    await axiosInstance(request);

    // The first request must not carry Authorization: Basic (which axios adds from URL credentials)
    const authHeader = firstRequestHeaders?.Authorization || firstRequestHeaders?.authorization || '';
    expect(authHeader).not.toMatch(/^Basic /);
  });

  test('URL with special characters in credentials are decoded correctly', async () => {
    const axiosInstance = axios.create();
    let capturedAuth;
    let callCount = 0;

    axiosInstance.defaults.adapter = async (config) => {
      callCount += 1;
      if (callCount === 1) {
        const error = new Error('Unauthorized');
        error.config = config;
        error.response = {
          status: 401,
          headers: { 'www-authenticate': 'Digest realm="r", nonce="n", qop="auth"' }
        };
        throw error;
      }
      capturedAuth = config.headers?.Authorization || config.headers?.authorization;
      return { status: 200, statusText: 'OK', headers: {}, config, data: { ok: true } };
    };

    // '@' in password must be percent-encoded in URLs as %40
    const request = {
      method: 'GET',
      url: 'https://user%40domain:p%40ss@www.example.com/api/resource',
      headers: {},
      digestConfig: { username: '', password: '' }
    };

    addDigestInterceptor(axiosInstance, request);
    await axiosInstance(request);
    // Decoded username should be used in the digest header
    expect(capturedAuth).toMatch(/username="user@domain"/);
  });
});

describe('Digest Auth with query params', () => {
  test('uri should include path and query string', async () => {
    const axiosInstance = axios.create();

    let callCount = 0;
    let capturedAuthorization;

    // Custom adapter to simulate a 401 challenge then a 200 success
    axiosInstance.defaults.adapter = async (config) => {
      callCount += 1;
      if (callCount === 1) {
        const error = new Error('Unauthorized');
        error.config = config;
        error.response = {
          status: 401,
          headers: {
            'www-authenticate': 'Digest realm="test", nonce="abc", qop="auth"'
          }
        };
        throw error;
      }

      // Second call should have Authorization header set by interceptor
      capturedAuthorization = config.headers && (config.headers.Authorization || config.headers.authorization);
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        data: { ok: true }
      };
    };

    const request = {
      method: 'GET',
      url: 'http://example.com/resource?foo=bar&baz=qux',
      headers: {},
      digestConfig: { username: 'user', password: 'pass' }
    };

    addDigestInterceptor(axiosInstance, request);

    const res = await axiosInstance(request);
    expect(res.status).toEqual(200);

    expect(capturedAuthorization).toBeTruthy();
    // Extract uri="..." from the header
    const uriMatch = /uri="([^"]+)"/.exec(capturedAuthorization);
    expect(uriMatch).toBeTruthy();
    const uri = uriMatch[1];

    // Expected to include both pathname and query
    expect(uri).toBe('/resource?foo=bar&baz=qux');
  });
});
