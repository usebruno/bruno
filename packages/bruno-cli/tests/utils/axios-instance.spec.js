jest.mock('../../src/constants', () => ({
  CLI_VERSION: '1.0.0'
}));

jest.mock('../../src/utils/cookies', () => ({
  addCookieToJar: jest.fn(),
  getCookieStringForUrl: jest.fn()
}));

jest.mock('../../src/utils/form-data', () => ({
  createFormData: jest.fn()
}));

jest.mock('../../src/utils/proxy-util', () => ({
  setupProxyAgents: jest.fn()
}));

const { makeAxiosInstance } = require('../../src/utils/axios-instance');

function createStubAdapter() {
  let capturedConfig = null;

  const adapter = (config) => {
    capturedConfig = config;
    return Promise.resolve({
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config
    });
  };

  adapter.getConfig = () => capturedConfig;

  return adapter;
}

describe('axios-instance: auth config cleanup', () => {
  test('should remove auth config before request reaches the axios adapter', async () => {
    const axiosInstance = makeAxiosInstance();
    const stubAdapter = createStubAdapter();

    await axiosInstance({
      url: 'https://api.example.com/test',
      method: 'get',
      adapter: stubAdapter,
      ntlmConfig: { username: 'user', password: 'pass' },
      awsv4config: { accessKeyId: 'access-key', secretAccessKey: 'secret-key' },
      digestConfig: { username: 'digest-user', password: 'digest-pass' },
      oauth1config: { consumerSecret: 'consumer-secret' },
      oauth2: { clientSecret: 'client-secret' },
      apiKeyHeaderName: 'x-api-key',
      apiKeyAuthValueForQueryParams: 'api-key-value'
    });

    const config = stubAdapter.getConfig();
    expect(config.ntlmConfig).toBeUndefined();
    expect(config.awsv4config).toBeUndefined();
    expect(config.digestConfig).toBeUndefined();
    expect(config.oauth1config).toBeUndefined();
    expect(config.oauth2).toBeUndefined();
    expect(config.apiKeyHeaderName).toBeUndefined();
    expect(config.apiKeyAuthValueForQueryParams).toBeUndefined();
  });
});
