const axios = require('axios');
const { addDigestInterceptor } = require('./digestauth-helper');

const PATH_QUERY = '/resource?foo=bar&baz=qux';
const REQUEST = {
  method: 'GET',
  url: `http://example.com${PATH_QUERY}`,
  headers: {},
  digestConfig: { username: 'user', password: 'pass' }
};
const REALM = 'test-realm';
const NONCE = 'test-nonce';

jest.mock('crypto', () => {
  return {
    createHash: (algorithm) => ({
      update: (input) => ({
        digest: (encoding) =>
          `${algorithm}(${input})`
      })
    }),
    randomBytes: (size) => ({
      toString: (encoding) => 'rnd'
    })
  }
});

describe('Digest Auth with query params', () => {
  test('uri should include path and query string', async () => {
    const mockedAxios = createMockedAxios();

    addDigestInterceptor(mockedAxios.axiosInstance, REQUEST);

    const res = await mockedAxios.axiosInstance(REQUEST);
    expect(res.status).toBe(200);

    expect(mockedAxios.capturedAuthorization).toBeTruthy();
    // Extract uri="..." from the header
    const uriMatch = /uri="([^"]+)"/.exec(mockedAxios.capturedAuthorization);
    expect(uriMatch).toBeTruthy();
    const uri = uriMatch[1];

    // Expected to include both pathname and query
    expect(uri).toBe(PATH_QUERY);
  });

});

describe('Digest Auth algorithms', () => {
  const A1 = `${REQUEST.digestConfig.username}:${REALM}:${REQUEST.digestConfig.password}`;
  const A2 = `${REQUEST.method}:${PATH_QUERY}`;

  beforeEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
  });

  test.each([
    ['MD5', `md5(md5(${A1}):${NONCE}:00000001:rnd:auth:md5(${A2}))` ],
    ['MD5-sess', `md5(md5(md5(${A1}):${NONCE}:rnd):${NONCE}:00000001:rnd:auth:md5(${A2}))` ],
    ['SHA-256', `sha256(sha256(${A1}):${NONCE}:00000001:rnd:auth:sha256(${A2}))` ],
    ['SHA-256-sess', `sha256(sha256(sha256(${A1}):${NONCE}:rnd):${NONCE}:00000001:rnd:auth:sha256(${A2}))` ],
    ['SHA-512-256', `sha512-256(sha512-256(${A1}):${NONCE}:00000001:rnd:auth:sha512-256(${A2}))` ],
    ['SHA-512-256-sess', `sha512-256(sha512-256(sha512-256(${A1}):${NONCE}:rnd):${NONCE}:00000001:rnd:auth:sha512-256(${A2}))` ]
  ])('should handle %s algorithm in Digest challenge', async (algorithm, expectedChallengeResponse) => {
    const mockedAxios = createMockedAxios(algorithm);

    addDigestInterceptor(mockedAxios.axiosInstance, REQUEST);

    const res = await mockedAxios.axiosInstance(REQUEST);
    expect(res.status).toBe(200);

    expect(mockedAxios.capturedAuthorization).toBeTruthy();
    expect(mockedAxios.capturedAuthorization).toMatch(`algorithm="${algorithm}"`);
    expect(mockedAxios.capturedAuthorization).toMatch(`response="${expectedChallengeResponse}"`);
  });

  test('should reject if the Digest algorithm is unsupported', async () => {
    const mockedAxios = createMockedAxios('UNKNOWN');

    addDigestInterceptor(mockedAxios.axiosInstance, REQUEST);

    const res = mockedAxios.axiosInstance(REQUEST);

    await expect(res).rejects.toBeDefined();
  });

});

function createMockedAxios(algorithm) {
  const headerAlgorithm = algorithm ? `, algorithm="${algorithm}"` : '';
  const mockProperties = {
    axiosInstance: axios.create(),
    callCount: 0,
    capturedAuthorization: null
  }
  // Custom adapter to simulate a 401 challenge then a 200 success
  mockProperties.axiosInstance.defaults.adapter = async (config) => {
    mockProperties.callCount += 1;
    if (mockProperties.callCount === 1) {
      const error = new Error('Unauthorized');
      error.config = config;
      error.response = {
        status: 401,
        headers: {
          'www-authenticate': `Digest realm="${REALM}", nonce="${NONCE}"${headerAlgorithm}, qop="auth"`
        }
      };
      throw error;
    }

    // Second call should have Authorization header set by interceptor
    mockProperties.capturedAuthorization = config.headers && (config.headers.Authorization || config.headers.authorization);
    return {
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
      data: { ok: true }
    };
  };

  return mockProperties;
}
