jest.mock('../../src/utils/oauth2', () => ({
  getOAuth2TokenUsingAuthorizationCode: jest.fn(),
  getOAuth2TokenUsingClientCredentials: jest.fn(),
  getOAuth2TokenUsingPasswordCredentials: jest.fn(),
  getOAuth2TokenUsingImplicitGrant: jest.fn(),
  updateCollectionOauth2Credentials: jest.fn(),
  clearOauth2CredentialsByCredentialsId: jest.fn()
}));

jest.mock('../../src/ipc/network/cert-utils', () => ({
  getCertsAndProxyConfig: jest.fn().mockResolvedValue({}),
  buildCertsAndProxyConfig: jest.fn()
}));

const { configureRequest } = require('../../src/ipc/network/index');
const { getOAuth2TokenUsingClientCredentials } = require('../../src/utils/oauth2');

describe('index: configureRequest', () => {
  it('Should add \'http://\' to the URL if no protocol is specified', async () => {
    const request = { method: 'GET', url: 'test-domain', body: {} };
    await configureRequest(null, {}, request, null, null, null, null);
    expect(request.url).toEqual('http://test-domain');
  });

  it('Should NOT add \'http://\' to the URL if a protocol is specified', async () => {
    const request = { method: 'GET', url: 'ftp://test-domain', body: {} };
    await configureRequest(null, {}, request, null, null, null, null);
    expect(request.url).toEqual('ftp://test-domain');
  });

  it('Should not add the OAuth2 token to headers or URL if tokenPlacement is none', async () => {
    getOAuth2TokenUsingClientCredentials.mockResolvedValue({
      credentials: { access_token: 'test-token' },
      url: 'https://auth.example.com/token',
      credentialsId: 'credentials',
      debugInfo: {}
    });

    const request = {
      method: 'GET',
      url: 'https://api.example.com/users?existing=1',
      headers: {},
      body: {},
      oauth2: {
        grantType: 'client_credentials',
        accessTokenUrl: 'https://auth.example.com/token',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        tokenPlacement: 'none',
        tokenHeaderPrefix: 'Bearer',
        tokenQueryKey: 'access_token'
      }
    };

    await configureRequest('collection-uid', { promptVariables: {} }, request, {}, {}, {}, null, {});

    expect(request.headers.Authorization).toBeUndefined();
    expect(request.url).toEqual('https://api.example.com/users?existing=1');
    expect(request.oauth2Credentials.credentials.access_token).toBe('test-token');
  });
});
