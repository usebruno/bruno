jest.mock('../../src/utils/oauth2', () => {
  const actual = jest.requireActual('../../src/utils/oauth2');
  return {
    ...actual,
    getOAuth2TokenUsingAuthorizationCode: jest.fn(),
    getOAuth2TokenUsingClientCredentials: jest.fn(),
    getOAuth2TokenUsingPasswordCredentials: jest.fn(),
    getOAuth2TokenUsingImplicitGrant: jest.fn()
  };
});

const oauth2Utils = require('../../src/utils/oauth2');
const { prepareWsRequest } = require('../../src/ipc/network/ws-event-handlers');
const { configureRequest } = require('../../src/ipc/network/index');

const { resolveOAuth2TokenValue, applyOAuth2TokenToRequest } = oauth2Utils;

const makeRequest = (url = 'https://api.example.com/v1/users') => ({ url, headers: {} });

const TOKEN_URL = 'https://auth.example.com/oauth2/token';

// The issue #8940 shape: a token endpoint response whose access_token is an object
const NESTED_TOKEN_CREDENTIALS = { access_token: { token: 'nested-token-value' }, token_type: 'Bearer' };

const mockTokenFetch = (credentials) => ({ credentials, url: TOKEN_URL, credentialsId: 'credentials', debugInfo: { data: [] } });

const makeOauth2Config = (grantType, overrides = {}) => ({
  grantType,
  accessTokenUrl: TOKEN_URL,
  refreshTokenUrl: TOKEN_URL,
  clientId: 'client-id',
  clientSecret: 'client-secret',
  scope: '',
  credentialsId: 'credentials',
  tokenPlacement: 'header',
  tokenHeaderPrefix: 'Bearer',
  tokenQueryKey: 'access_token',
  tokenSource: 'access_token',
  autoFetchToken: true,
  autoRefreshToken: false,
  ...overrides
});

describe('oauth2: resolveOAuth2TokenValue', () => {
  describe('With a string token', () => {
    it('Returns the access token by default', () => {
      const credentials = { access_token: 'token-value' };
      expect(resolveOAuth2TokenValue(credentials)).toEqual('token-value');
    });

    it('Returns the id token when tokenSource is id_token', () => {
      const credentials = { access_token: 'access-value', id_token: 'id-value' };
      expect(resolveOAuth2TokenValue(credentials, 'id_token')).toEqual('id-value');
    });

    it('Trims surrounding whitespace', () => {
      const credentials = { access_token: '  token-value  ' };
      expect(resolveOAuth2TokenValue(credentials)).toEqual('token-value');
    });
  });

  describe('With a nested object token', () => {
    it('Unwraps an object holding a token property', () => {
      const credentials = { access_token: { token: 'token-value' } };
      expect(resolveOAuth2TokenValue(credentials)).toEqual('token-value');
    });

    it('Unwraps an object holding a value property', () => {
      const credentials = { access_token: { value: 'token-value' } };
      expect(resolveOAuth2TokenValue(credentials)).toEqual('token-value');
    });

    it('Returns undefined when the object holds no string token', () => {
      const credentials = { access_token: { access_token: 'token-value' } };
      expect(resolveOAuth2TokenValue(credentials)).toBeUndefined();
    });
  });

  describe('With an unusable token', () => {
    it('Returns undefined for a number', () => {
      expect(resolveOAuth2TokenValue({ access_token: 12345 })).toBeUndefined();
    });

    it('Returns undefined for null', () => {
      expect(resolveOAuth2TokenValue({ access_token: null })).toBeUndefined();
    });

    it('Returns undefined for missing credentials', () => {
      expect(resolveOAuth2TokenValue(undefined)).toBeUndefined();
      expect(resolveOAuth2TokenValue({})).toBeUndefined();
    });

    it('Returns undefined for an empty or whitespace-only string', () => {
      expect(resolveOAuth2TokenValue({ access_token: '' })).toBeUndefined();
      expect(resolveOAuth2TokenValue({ access_token: '   ' })).toBeUndefined();
    });
  });
});

describe('oauth2: applyOAuth2TokenToRequest', () => {
  describe('Token placement in header', () => {
    it('Sets the Authorization header with the configured prefix', () => {
      const request = makeRequest();
      applyOAuth2TokenToRequest(request, {
        credentials: { access_token: 'token-value' },
        tokenPlacement: 'header',
        tokenHeaderPrefix: 'Bearer',
        tokenQueryKey: 'access_token'
      });
      expect(request.headers['Authorization']).toEqual('Bearer token-value');
    });

    it('Unwraps a nested object token into a usable header', () => {
      const request = makeRequest();
      applyOAuth2TokenToRequest(request, {
        credentials: NESTED_TOKEN_CREDENTIALS,
        tokenPlacement: 'header',
        tokenHeaderPrefix: 'Bearer',
        tokenQueryKey: 'access_token'
      });
      expect(request.headers['Authorization']).toEqual('Bearer nested-token-value');
    });

    it('Sets the bare token when the prefix is empty', () => {
      const request = makeRequest();
      applyOAuth2TokenToRequest(request, {
        credentials: { access_token: 'token-value' },
        tokenPlacement: 'header',
        tokenHeaderPrefix: '',
        tokenQueryKey: 'access_token'
      });
      expect(request.headers['Authorization']).toEqual('token-value');
    });

    it('Does not stringify a missing prefix into the header', () => {
      const request = makeRequest();
      applyOAuth2TokenToRequest(request, {
        credentials: { access_token: 'token-value' },
        tokenPlacement: 'header',
        tokenHeaderPrefix: null,
        tokenQueryKey: 'access_token'
      });
      expect(request.headers['Authorization']).toEqual('token-value');
    });

    it('Uses the id token when tokenSource is id_token', () => {
      const request = makeRequest();
      applyOAuth2TokenToRequest(request, {
        credentials: { access_token: 'access-value', id_token: 'id-value' },
        tokenPlacement: 'header',
        tokenHeaderPrefix: 'Bearer',
        tokenQueryKey: 'access_token',
        tokenSource: 'id_token'
      });
      expect(request.headers['Authorization']).toEqual('Bearer id-value');
    });
  });

  describe('Token placement in query params', () => {
    it('Appends the token to the request url', () => {
      const request = makeRequest('https://api.example.com/v1/users');
      applyOAuth2TokenToRequest(request, {
        credentials: { access_token: 'token-value' },
        tokenPlacement: 'url',
        tokenHeaderPrefix: 'Bearer',
        tokenQueryKey: 'access_token'
      });
      expect(request.url).toEqual('https://api.example.com/v1/users?access_token=token-value');
      expect(request.headers['Authorization']).toBeUndefined();
    });

    it('Falls back to the query param when the placement is not configured', () => {
      const request = makeRequest('https://api.example.com/v1/users');
      applyOAuth2TokenToRequest(request, {
        credentials: { access_token: 'token-value' },
        tokenHeaderPrefix: 'Bearer',
        tokenQueryKey: 'access_token'
      });
      expect(request.url).toEqual('https://api.example.com/v1/users?access_token=token-value');
    });

    it('Leaves the request untouched when the url cannot be parsed', () => {
      const request = makeRequest('{{baseUrl}}/v1/users');
      applyOAuth2TokenToRequest(request, {
        credentials: { access_token: 'token-value' },
        tokenPlacement: 'url',
        tokenHeaderPrefix: 'Bearer',
        tokenQueryKey: 'access_token'
      });
      expect(request.url).toEqual('{{baseUrl}}/v1/users');
    });
  });

  describe('With a token that cannot be resolved to a string', () => {
    const unusableTokens = [
      { access_token: { client_id: 'cid', client_secret: 'secret' } },
      { access_token: 12345 },
      { access_token: null },
      {},
      null,
      undefined
    ];

    it.each(unusableTokens)('Never injects a stringified object into the request (%j)', (credentials) => {
      const headerRequest = makeRequest();
      applyOAuth2TokenToRequest(headerRequest, {
        credentials,
        tokenPlacement: 'header',
        tokenHeaderPrefix: 'Bearer',
        tokenQueryKey: 'access_token'
      });
      expect(JSON.stringify(headerRequest)).not.toContain('[object Object]');
      expect(headerRequest.headers['Authorization']).toBeUndefined();

      const queryRequest = makeRequest();
      applyOAuth2TokenToRequest(queryRequest, {
        credentials,
        tokenPlacement: 'url',
        tokenHeaderPrefix: 'Bearer',
        tokenQueryKey: 'access_token'
      });
      expect(JSON.stringify(queryRequest)).not.toContain('[object Object]');
      expect(queryRequest.url).toEqual('https://api.example.com/v1/users');
    });
  });
});

describe('oauth2: token injection through configureRequest', () => {
  const grantFetchers = {
    authorization_code: oauth2Utils.getOAuth2TokenUsingAuthorizationCode,
    implicit: oauth2Utils.getOAuth2TokenUsingImplicitGrant,
    client_credentials: oauth2Utils.getOAuth2TokenUsingClientCredentials,
    password: oauth2Utils.getOAuth2TokenUsingPasswordCredentials
  };

  beforeEach(() => {
    Object.values(grantFetchers).forEach((fetcher) => fetcher.mockReset());
  });

  it.each(Object.keys(grantFetchers))('Injects an unwrapped token for the %s grant type', async (grantType) => {
    grantFetchers[grantType].mockResolvedValue(mockTokenFetch(NESTED_TOKEN_CREDENTIALS));

    const request = {
      method: 'GET',
      url: 'http://api.example.com/v1/users',
      headers: {},
      body: { mode: 'none' },
      oauth2: makeOauth2Config(grantType)
    };

    await configureRequest('collection-uid', {}, request, {}, {}, {}, '/tmp');
    expect(grantFetchers[grantType]).toHaveBeenCalled();
    expect(request.headers['Authorization']).toEqual('Bearer nested-token-value');
    expect(JSON.stringify(request.headers)).not.toContain('[object Object]');
  });

  it('Skips injection entirely when the token cannot be resolved to a string', async () => {
    grantFetchers.client_credentials.mockResolvedValue(mockTokenFetch({ access_token: { foo: 'bar' } }));

    const request = {
      method: 'GET',
      url: 'http://api.example.com/v1/users',
      headers: {},
      body: { mode: 'none' },
      oauth2: makeOauth2Config('client_credentials')
    };

    await configureRequest('collection-uid', {}, request, {}, {}, {}, '/tmp');
    expect(request.headers['Authorization']).toBeUndefined();
    expect(JSON.stringify(request)).not.toContain('[object Object]');
  });

  it('Appends the token to the request url when the placement is url', async () => {
    grantFetchers.client_credentials.mockResolvedValue(mockTokenFetch({ access_token: 'token-value' }));

    const request = {
      method: 'GET',
      url: 'http://api.example.com/v1/users',
      headers: {},
      body: { mode: 'none' },
      oauth2: makeOauth2Config('client_credentials', { tokenPlacement: 'url' })
    };

    await configureRequest('collection-uid', {}, request, {}, {}, {}, '/tmp');
    expect(request.url).toEqual('http://api.example.com/v1/users?access_token=token-value');
    expect(request.headers['Authorization']).toBeUndefined();
  });
});

describe('oauth2: token injection through prepareWsRequest', () => {
  const makeItem = (oauth2Config) => ({
    uid: 'item-uid',
    request: {
      url: 'ws://api.example.com/socket',
      headers: [],
      body: { mode: 'raw', ws: [] },
      auth: { mode: 'oauth2', oauth2: oauth2Config },
      vars: { req: [], res: [] },
      script: { req: '', res: '' }
    }
  });

  const makeCollection = () => ({
    uid: 'collection-uid',
    pathname: '/tmp/collection',
    root: { request: { headers: [], auth: { mode: 'none' } } },
    brunoConfig: {},
    globalEnvironmentVariables: {}
  });

  beforeEach(() => {
    oauth2Utils.getOAuth2TokenUsingClientCredentials.mockReset();
  });

  it('Injects the token into the Authorization header', async () => {
    oauth2Utils.getOAuth2TokenUsingClientCredentials.mockResolvedValue(mockTokenFetch(NESTED_TOKEN_CREDENTIALS));

    const prepared = await prepareWsRequest(makeItem(makeOauth2Config('client_credentials')), makeCollection(), { variables: [] }, {});
    expect(prepared.headers['Authorization']).toEqual('Bearer nested-token-value');
    expect(JSON.stringify(prepared.headers)).not.toContain('[object Object]');
  });

  it('Injects the token into the url the connection uses when the placement is url', async () => {
    oauth2Utils.getOAuth2TokenUsingClientCredentials.mockResolvedValue(mockTokenFetch({ access_token: 'token-value' }));

    const prepared = await prepareWsRequest(
      makeItem(makeOauth2Config('client_credentials', { tokenPlacement: 'url' })),
      makeCollection(),
      { variables: [] },
      {}
    );
    expect(prepared.url).toEqual('ws://api.example.com/socket?access_token=token-value');
    expect(prepared.headers['Authorization']).toBeUndefined();
  });

  it('Interpolates url variables before appending the token', async () => {
    oauth2Utils.getOAuth2TokenUsingClientCredentials.mockResolvedValue(mockTokenFetch({ access_token: 'token-value' }));

    const item = makeItem(makeOauth2Config('client_credentials', { tokenPlacement: 'url' }));
    item.request.url = 'ws://api.example.com/{{roomId}}';
    const prepared = await prepareWsRequest(item, makeCollection(), { variables: [{ name: 'roomId', value: 'lobby', enabled: true }] }, {});
    expect(prepared.url).toEqual('ws://api.example.com/lobby?access_token=token-value');
  });

  it('Interpolates a templated header prefix before injecting the token', async () => {
    oauth2Utils.getOAuth2TokenUsingClientCredentials.mockResolvedValue(mockTokenFetch({ access_token: 'token-value' }));

    const item = makeItem(makeOauth2Config('client_credentials', { tokenHeaderPrefix: '{{authScheme}}' }));
    const prepared = await prepareWsRequest(item, makeCollection(), { variables: [{ name: 'authScheme', value: 'Bearer', enabled: true }] }, {});
    expect(prepared.headers['Authorization']).toEqual('Bearer token-value');
  });

  it('Uses the id token when tokenSource is id_token', async () => {
    oauth2Utils.getOAuth2TokenUsingClientCredentials.mockResolvedValue(
      mockTokenFetch({ access_token: 'access-value', id_token: 'id-value' })
    );

    const prepared = await prepareWsRequest(
      makeItem(makeOauth2Config('client_credentials', { tokenSource: 'id_token' })),
      makeCollection(),
      { variables: [] },
      {}
    );
    expect(prepared.headers['Authorization']).toEqual('Bearer id-value');
  });

  it('Injects nothing when no token can be resolved', async () => {
    oauth2Utils.getOAuth2TokenUsingClientCredentials.mockResolvedValue(mockTokenFetch(null));

    const prepared = await prepareWsRequest(makeItem(makeOauth2Config('client_credentials')), makeCollection(), { variables: [] }, {});
    expect(prepared.headers['Authorization']).toBeUndefined();
    expect(JSON.stringify(prepared)).not.toContain('undefined ');
  });
});
