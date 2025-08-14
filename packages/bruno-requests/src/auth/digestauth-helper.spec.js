const axios = require('axios');
const { addDigestInterceptor } = require('./digestauth-helper');

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
    expect(res.status).toBe(200);

    expect(capturedAuthorization).toBeTruthy();
    // Extract uri="..." from the header
    const uriMatch = /uri="([^"]+)"/.exec(capturedAuthorization);
    expect(uriMatch).toBeTruthy();
    const uri = uriMatch[1];

    // Expected to include both pathname and query
    expect(uri).toBe('/resource?foo=bar&baz=qux');
  });
});