const axios = require('axios');
const { addDigestInterceptor } = require('./digestauth-helper');

function buildAxiosInstance(wwwAuthenticate) {
  const axiosInstance = axios.create();
  let callCount = 0;
  let capturedAuthorization;

  axiosInstance.defaults.adapter = async (config) => {
    callCount += 1;
    if (callCount === 1) {
      const error = new Error('Unauthorized');
      error.config = config;
      error.response = {
        status: 401,
        headers: { 'www-authenticate': wwwAuthenticate }
      };
      throw error;
    }

    capturedAuthorization = config.headers && (config.headers.Authorization || config.headers.authorization);
    return { status: 200, statusText: 'OK', headers: {}, config, data: { ok: true } };
  };

  return { axiosInstance, getAuth: () => capturedAuthorization };
}

describe('Digest Auth with query params', () => {
  test('uri should include path and query string', async () => {
    const { axiosInstance, getAuth } = buildAxiosInstance('Digest realm="test", nonce="abc", qop="auth"');

    const request = {
      method: 'GET',
      url: 'http://example.com/resource?foo=bar&baz=qux',
      headers: {},
      digestConfig: { username: 'user', password: 'pass' }
    };

    addDigestInterceptor(axiosInstance, request);

    const res = await axiosInstance(request);
    expect(res.status).toEqual(200);

    const auth = getAuth();
    expect(auth).toBeTruthy();

    const uriMatch = /uri="([^"]+)"/.exec(auth);
    expect(uriMatch).toBeTruthy();
    expect(uriMatch[1]).toBe('/resource?foo=bar&baz=qux');
  });
});

describe('Digest Auth RFC 7616 compliance', () => {
  test('nc parameter must not be quoted (RFC 7616 §3.4)', async () => {
    const { axiosInstance, getAuth } = buildAxiosInstance('Digest realm="testrealm", nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093", qop="auth"');

    const request = {
      method: 'GET',
      url: 'http://example.com/protected',
      headers: {},
      digestConfig: { username: 'Mufasa', password: 'Circle Of Life' }
    };

    addDigestInterceptor(axiosInstance, request);

    const res = await axiosInstance(request);
    expect(res.status).toEqual(200);

    const auth = getAuth();
    expect(auth).toBeTruthy();

    // nc must appear unquoted: nc=00000001
    expect(auth).toMatch(/nc=00000001(?!["])/);
    // Must NOT be quoted
    expect(auth).not.toMatch(/nc="00000001"/);
  });

  test('qop parameter must not be quoted (RFC 7616 §3.4)', async () => {
    const { axiosInstance, getAuth } = buildAxiosInstance('Digest realm="testrealm", nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093", qop="auth"');

    const request = {
      method: 'GET',
      url: 'http://example.com/protected',
      headers: {},
      digestConfig: { username: 'user', password: 'pass' }
    };

    addDigestInterceptor(axiosInstance, request);

    const res = await axiosInstance(request);
    expect(res.status).toEqual(200);

    const auth = getAuth();
    expect(auth).toBeTruthy();

    // qop must appear unquoted: qop=auth
    expect(auth).toMatch(/qop=auth(?!["])/);
    // Must NOT be quoted
    expect(auth).not.toMatch(/qop="auth"/);
  });

  test('nc and qop are absent when no qop challenge is sent', async () => {
    const { axiosInstance, getAuth } = buildAxiosInstance('Digest realm="testrealm", nonce="simplnonce"');

    const request = {
      method: 'GET',
      url: 'http://example.com/protected',
      headers: {},
      digestConfig: { username: 'user', password: 'pass' }
    };

    addDigestInterceptor(axiosInstance, request);

    const res = await axiosInstance(request);
    expect(res.status).toEqual(200);

    const auth = getAuth();
    expect(auth).toBeTruthy();
    expect(auth).not.toMatch(/\bnc=/);
    expect(auth).not.toMatch(/\bqop=/);
  });

  test('Authorization header contains required quoted fields', async () => {
    const { axiosInstance, getAuth } = buildAxiosInstance('Digest realm="testrealm", nonce="abc123", qop="auth", opaque="5ccc069c403ebaf9f0171e9517f40e41"');

    const request = {
      method: 'GET',
      url: 'http://example.com/resource',
      headers: {},
      digestConfig: { username: 'user', password: 'pass' }
    };

    addDigestInterceptor(axiosInstance, request);

    await axiosInstance(request);
    const auth = getAuth();

    expect(auth).toMatch(/^Digest /);
    expect(auth).toMatch(/username="user"/);
    expect(auth).toMatch(/realm="testrealm"/);
    expect(auth).toMatch(/nonce="abc123"/);
    expect(auth).toMatch(/uri="\/resource"/);
    expect(auth).toMatch(/response="[a-f0-9]{32}"/);
    expect(auth).toMatch(/cnonce="[a-f0-9]+"/);
    expect(auth).toMatch(/opaque="5ccc069c403ebaf9f0171e9517f40e41"/);
    expect(auth).toMatch(/algorithm="MD5"/);
  });
});
