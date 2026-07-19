const { describe, it, expect } = require('@jest/globals');

const mockAddCookieToJar = jest.fn();
const mockGetCookieStringForUrl = jest.fn();

jest.mock('../../src/utils/cookies', () => ({
  addCookieToJar: mockAddCookieToJar,
  getCookieStringForUrl: mockGetCookieStringForUrl
}));

jest.mock('../../src/utils/proxy-util', () => ({
  setupProxyAgents: jest.fn()
}));

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
  beforeEach(() => {
    mockAddCookieToJar.mockReset();
    mockGetCookieStringForUrl.mockReset();
  });

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

  it('does not store or inject cookie jar cookies on redirects when request cookie automation is disabled', async () => {
    mockGetCookieStringForUrl.mockReturnValue('session=from-jar');
    const stubAdapter = createStubAdapter();
    const instance = makeAxiosInstance({ storeCookies: false, sendCookies: false });
    const redirectError = {
      config: {
        url: 'https://api.example.com/start',
        method: 'get',
        headers: { Cookie: 'manual=value' },
        adapter: stubAdapter
      },
      response: {
        status: 302,
        headers: {
          'location': 'https://api.example.com/target',
          'set-cookie': ['session=from-response']
        }
      }
    };

    await instance.interceptors.response.handlers[0].rejected(redirectError);

    expect(mockGetCookieStringForUrl).not.toHaveBeenCalled();
    expect(mockAddCookieToJar).not.toHaveBeenCalled();
    expect(stubAdapter.getConfig().headers.Cookie).toBe('manual=value');
  });
});
