const axios = require('axios');
const crypto = require('crypto');
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

describe('Digest Auth challenge validation', () => {
  test.each([true, false])('authenticates with an empty realm (qop auth: %s)', async (withQop) => {
    const axiosInstance = axios.create();
    const request = {
      method: 'GET',
      url: 'http://example.com/resource',
      digestConfig: { username: 'user', password: 'pass' }
    };
    const challenge = `Digest realm="", nonce="abc", algorithm=MD5${withQop ? ', qop="auth"' : ''}`;
    let callCount = 0;

    axiosInstance.defaults.adapter = async (config) => {
      callCount += 1;
      if (callCount === 1) {
        const error = new Error('Unauthorized');
        error.config = config;
        error.response = { status: 401, headers: { 'www-authenticate': challenge } };
        throw error;
      }

      const authorization = config.headers.Authorization;
      expect(authorization).toContain('realm=""');
      expect(authorization).toContain('uri="/resource"');

      // Verify the response digest using the empty realm, not just the retry.
      const hash = (value) => crypto.createHash('md5').update(value).digest('hex');
      const ha1 = hash('user::pass');
      const ha2 = hash('GET:/resource');
      let expectedResponse;
      if (withQop) {
        const cnonce = /cnonce="([^"]+)"/.exec(authorization)[1];
        expect(authorization).toContain('qop="auth"');
        expect(authorization).toContain('nc="00000001"');
        expectedResponse = hash(`${ha1}:abc:00000001:${cnonce}:auth:${ha2}`);
      } else {
        expectedResponse = hash(`${ha1}:abc:${ha2}`);
      }
      expect(authorization).toContain(`response="${expectedResponse}"`);

      return { status: 200, statusText: 'OK', headers: {}, config, data: { ok: true } };
    };

    addDigestInterceptor(axiosInstance, request);

    const response = await axiosInstance(request);
    expect(response.data).toEqual({ ok: true });
    expect(callCount).toBe(2);
  });

  test.each([
    ['missing realm', 'Digest nonce="abc", qop="auth"'],
    ['missing nonce', 'Digest realm="", qop="auth"'],
    ['empty nonce', 'Digest realm="", nonce="", qop="auth"']
  ])('rejects a challenge with %s without retrying', async (_description, challenge) => {
    const axiosInstance = axios.create();
    const request = {
      method: 'GET',
      url: 'http://example.com/resource',
      digestConfig: { username: 'user', password: 'pass' }
    };
    const error = new Error('Unauthorized');
    let callCount = 0;

    axiosInstance.defaults.adapter = async (config) => {
      callCount += 1;
      error.config = config;
      error.response = { status: 401, headers: { 'www-authenticate': challenge } };
      throw error;
    };

    addDigestInterceptor(axiosInstance, request);

    await expect(axiosInstance(request)).rejects.toBe(error);
    expect(callCount).toBe(1);
  });
});
