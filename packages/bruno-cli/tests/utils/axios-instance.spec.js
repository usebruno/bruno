const { describe, it, expect, beforeEach } = require('@jest/globals');

jest.mock('../../src/utils/cookies', () => ({
  addCookieToJar: jest.fn(),
  getCookieStringForUrl: jest.fn(() => '')
}));

jest.mock('../../src/utils/proxy-util', () => ({
  setupProxyAgents: jest.fn()
}));

const { makeAxiosInstance } = require('../../src/utils/axios-instance');
const { addCookieToJar } = require('../../src/utils/cookies');

function createStubAdapter(responseHeaders = {}) {
  let capturedConfig = null;

  const adapter = (config) => {
    capturedConfig = config;
    return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: responseHeaders, config });
  };

  adapter.getConfig = () => capturedConfig;

  return adapter;
}

describe('makeAxiosInstance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('saves Set-Cookie headers from successful responses', async () => {
    const stubAdapter = createStubAdapter({
      'set-cookie': ['session=abc123; Path=/; HttpOnly']
    });
    const instance = makeAxiosInstance();

    await instance({ url: 'https://api.example.com/login', method: 'get', adapter: stubAdapter });

    expect(addCookieToJar).toHaveBeenCalledWith(
      'session=abc123; Path=/; HttpOnly',
      'https://api.example.com/login'
    );
  });

  it('does not save successful response cookies when cookies are disabled', async () => {
    const stubAdapter = createStubAdapter({
      'set-cookie': ['session=abc123; Path=/; HttpOnly']
    });
    const instance = makeAxiosInstance({ disableCookies: true });

    await instance({ url: 'https://api.example.com/login', method: 'get', adapter: stubAdapter });

    expect(addCookieToJar).not.toHaveBeenCalled();
  });
});
