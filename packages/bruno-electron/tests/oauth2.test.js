const mockAuthorizeUserInWindow = jest.fn();
const mockMakeAxiosInstance = jest.fn();
const mockAxiosInstance = jest.fn();
const mockGetCredentialsForCollection = jest.fn();
const mockUpdateCredentialsForCollection = jest.fn();
const mockClearCredentialsForCollection = jest.fn();

jest.mock('../src/ipc/network/authorize-user-in-window', () => ({
  authorizeUserInWindow: mockAuthorizeUserInWindow
}));

jest.mock('../src/ipc/network/authorize-user-in-system-browser', () => ({
  authorizeUserInSystemBrowser: jest.fn()
}));

jest.mock('../src/ipc/network/axios-instance', () => ({
  makeAxiosInstance: mockMakeAxiosInstance
}));

jest.mock('../src/store/preferences', () => ({
  preferencesUtil: {
    shouldUseSystemBrowser: jest.fn(() => false)
  }
}));

jest.mock('../src/store/oauth2', () => {
  return jest.fn().mockImplementation(() => ({
    getSessionIdOfCollection: jest.fn(() => 'oauth-session-id'),
    getCredentialsForCollection: mockGetCredentialsForCollection,
    updateCredentialsForCollection: mockUpdateCredentialsForCollection,
    clearCredentialsForCollection: mockClearCredentialsForCollection,
    clearCredentialsByCredentialsId: jest.fn()
  }));
});

jest.mock('../src/utils/common', () => ({
  uuid: jest.fn(() => 'oauth-session-id'),
  safeParseJSON: jest.fn((data) => {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }),
  safeStringifyJSON: jest.fn((data) => {
    if (typeof data === 'string') return data;
    return JSON.stringify(data);
  })
}));

const {
  getOAuth2TokenUsingAuthorizationCode,
  refreshOauth2Token
} = require('../src/utils/oauth2');

const buildRequest = (oauth2 = {}) => ({
  oauth2: {
    grantType: 'authorization_code',
    callbackUrl: 'https://app.example.com/callback',
    authorizationUrl: 'https://auth.example.com/authorize',
    accessTokenUrl: 'https://auth.example.com/token',
    refreshTokenUrl: 'https://auth.example.com/refresh',
    clientId: 'public-client',
    clientSecret: '',
    pkce: true,
    credentialsPlacement: 'basic_auth_header',
    credentialsId: 'credentials',
    additionalParameters: { authorization: [], token: [], refresh: [] },
    ...oauth2
  }
});

const getBodyParams = (config) => new URLSearchParams(config.data);

describe('OAuth2 authorization code token request', () => {
  let capturedTokenRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedTokenRequest = null;
    mockGetCredentialsForCollection.mockReturnValue(null);
    mockMakeAxiosInstance.mockReturnValue(mockAxiosInstance);
    mockAuthorizeUserInWindow.mockResolvedValue({
      authorizationCode: 'authorization-code',
      debugInfo: { data: [] }
    });
    mockAxiosInstance.mockImplementation(async (requestConfig) => {
      capturedTokenRequest = requestConfig;
      return {
        url: requestConfig.url,
        headers: {},
        status: 200,
        statusText: 'OK',
        data: Buffer.from(JSON.stringify({ access_token: 'access-token', refresh_token: 'refresh-token' })),
        timeline: [],
        config: requestConfig
      };
    });
  });

  test('uses PKCE without Basic auth when clientSecret is empty', async () => {
    await getOAuth2TokenUsingAuthorizationCode({
      request: buildRequest({ clientSecret: '' }),
      collectionUid: 'collection-uid',
      forceFetch: true,
      certsAndProxyConfigForTokenUrl: {},
      certsAndProxyConfigForRefreshUrl: {}
    });

    const authorizeUrl = new URL(mockAuthorizeUserInWindow.mock.calls[0][0].authorizeUrl);
    expect(authorizeUrl.searchParams.get('client_id')).toBe('public-client');
    expect(authorizeUrl.searchParams.get('client_secret')).toBeNull();
    expect(authorizeUrl.searchParams.get('code_challenge')).toBeTruthy();
    expect(authorizeUrl.searchParams.get('code_challenge_method')).toBe('S256');

    expect(capturedTokenRequest.headers.Authorization).toBeUndefined();

    const body = getBodyParams(capturedTokenRequest);
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('authorization-code');
    expect(body.get('client_id')).toBe('public-client');
    expect(body.get('client_secret')).toBeNull();
    expect(body.get('code_verifier')).toBeTruthy();
  });

  test('uses Basic auth when clientSecret is present and credentialsPlacement is basic_auth_header', async () => {
    await getOAuth2TokenUsingAuthorizationCode({
      request: buildRequest({ clientSecret: 'client-secret' }),
      collectionUid: 'collection-uid',
      forceFetch: true,
      certsAndProxyConfigForTokenUrl: {},
      certsAndProxyConfigForRefreshUrl: {}
    });

    const expectedAuthorization = `Basic ${Buffer.from('public-client:client-secret').toString('base64')}`;
    expect(capturedTokenRequest.headers.Authorization).toBe(expectedAuthorization);

    const body = getBodyParams(capturedTokenRequest);
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code_verifier')).toBeTruthy();
    expect(body.get('client_id')).toBeNull();
    expect(body.get('client_secret')).toBeNull();
  });

  test('refreshes without Basic auth when clientSecret is empty', async () => {
    mockGetCredentialsForCollection.mockReturnValue({ refresh_token: 'refresh-token' });

    await refreshOauth2Token({
      requestCopy: buildRequest({ clientSecret: '' }),
      collectionUid: 'collection-uid',
      certsAndProxyConfig: {}
    });

    expect(capturedTokenRequest.url).toBe('https://auth.example.com/refresh');
    expect(capturedTokenRequest.headers.Authorization).toBeUndefined();

    const body = getBodyParams(capturedTokenRequest);
    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('refresh_token')).toBe('refresh-token');
    expect(body.get('client_id')).toBe('public-client');
    expect(body.get('client_secret')).toBeNull();
  });
});
