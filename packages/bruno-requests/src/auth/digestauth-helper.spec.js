const crypto = require('crypto');
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

describe('Digest Auth challenge parsing', () => {
  const md5 = (input) => crypto.createHash('md5').update(input).digest('hex');

  const getAuthorizationForChallenge = async (wwwAuthenticate) => {
    const axiosInstance = axios.create();
    let callCount = 0;
    let capturedAuthorization;

    axiosInstance.defaults.adapter = async (config) => {
      callCount += 1;
      if (callCount === 1) {
        const error = new Error('Unauthorized');
        error.config = config;
        error.response = { status: 401, headers: { 'www-authenticate': wwwAuthenticate } };
        throw error;
      }

      capturedAuthorization = config.headers.Authorization;
      return { status: 200, statusText: 'OK', headers: {}, config, data: {} };
    };

    const request = {
      method: 'GET',
      url: 'http://example.com/resource',
      headers: {},
      digestConfig: { username: 'user', password: 'pass' }
    };

    addDigestInterceptor(axiosInstance, request);
    await axiosInstance(request);

    return capturedAuthorization;
  };

  const getField = (header, name) => {
    const match = new RegExp(`${name}="([^"]*)"`).exec(header);
    return match && match[1];
  };

  test('keeps commas inside quoted values', async () => {
    const authorization = await getAuthorizationForChallenge(
      'Digest realm="Example, Inc.", qop="auth,auth-int", nonce="abc123", opaque="op,aque"'
    );

    expect(getField(authorization, 'realm')).toBe('Example, Inc.');
    expect(getField(authorization, 'nonce')).toBe('abc123');
    expect(getField(authorization, 'opaque')).toBe('op,aque');
    expect(getField(authorization, 'qop')).toBe('auth');

    const cnonce = getField(authorization, 'cnonce');
    const nc = getField(authorization, 'nc');
    const ha1 = md5('user:Example, Inc.:pass');
    const ha2 = md5('GET:/resource');
    expect(getField(authorization, 'response')).toBe(md5(`${ha1}:abc123:${nc}:${cnonce}:auth:${ha2}`));
  });

  test('handles unquoted values and extra whitespace', async () => {
    const authorization = await getAuthorizationForChallenge(
      'Digest realm = "test" ,nonce="abc==",  algorithm=MD5, stale=false'
    );

    expect(getField(authorization, 'realm')).toBe('test');
    expect(getField(authorization, 'nonce')).toBe('abc==');
    expect(getField(authorization, 'algorithm')).toBeNull();
    expect(getField(authorization, 'response')).toBe(md5(`${md5('user:test:pass')}:abc==:${md5('GET:/resource')}`));
  });

  test('does not let escaped quotes end a quoted value', async () => {
    const authorization = await getAuthorizationForChallenge('Digest realm="say \\"hi\\", ok", nonce="abc123"');

    expect(getField(authorization, 'nonce')).toBe('abc123');
  });

  test('ignores params of a following challenge', async () => {
    const authorization = await getAuthorizationForChallenge(
      'Digest realm="digest-realm", nonce="abc123", Basic realm="basic-realm"'
    );

    expect(getField(authorization, 'realm')).toBe('digest-realm');
    expect(getField(authorization, 'nonce')).toBe('abc123');
  });
});
