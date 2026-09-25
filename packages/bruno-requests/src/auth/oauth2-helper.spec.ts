import axios from 'axios';
import crypto from 'node:crypto';
import { getOAuth2Token, TokenStore, OAuth2Config } from './oauth2-helper';

/**
 * Creates a mock token store for testing purposes.
 *
 * The token store simulates credential persistence using an in-memory Map.
 * Keys are formatted as `${url}:${credentialsId}` to uniquely identify credentials.
 */
const createMockTokenStore = (): TokenStore & { credentials: Map<string, any> } => {
  const credentials = new Map<string, any>();
  return {
    credentials,
    async saveCredential({ url, credentialsId, credentials: creds }) {
      credentials.set(`${url}:${credentialsId}`, creds);
      return true;
    },
    async getCredential({ url, credentialsId }) {
      return credentials.get(`${url}:${credentialsId}`) || null;
    },
    async deleteCredential({ url, credentialsId }) {
      return credentials.delete(`${url}:${credentialsId}`);
    }
  };
};

/**
 * Creates a mock axios adapter that intercepts HTTP requests.
 *
 * This allows tests to:
 * 1. Capture the request config (headers, body, URL) for assertion
 * 2. Return a controlled response without making actual network calls
 *
 * @param responseData - The mock response data to return (defaults to a valid token response)
 * @returns An object containing the adapter and a getter for the captured request config
 */
const createMockAdapter = (responseData: any = { access_token: 'test-token', expires_in: 3600 }) => {
  let capturedConfig: any = null;

  const adapter = async (config: any) => {
    capturedConfig = config;
    return {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      config,
      data: Buffer.from(JSON.stringify(responseData))
    };
  };

  return { adapter, getCapturedConfig: () => capturedConfig };
};

/**
 * OAuth2 Client Credentials Grant Tests
 *
 * These tests verify the behavior of the OAuth2 client credentials flow,
 * specifically focusing on how client credentials (clientId and clientSecret)
 * are transmitted to the authorization server.
 *
 * OAuth2 spec allows two methods for sending client credentials:
 * 1. HTTP Basic Authentication header (RFC 6749 Section 2.3.1)
 * 2. Request body parameters (RFC 6749 Section 2.3.1)
 *
 * The `credentialsPlacement` config option controls which method is used.
 */
describe('OAuth2 Helper - Client Credentials Grant', () => {
  let originalAdapter: any;

  beforeEach(() => {
    originalAdapter = axios.defaults.adapter;
  });

  afterEach(() => {
    axios.defaults.adapter = originalAdapter;
  });

  /**
   * Tests for `credentialsPlacement: 'basic_auth_header'`
   *
   * When using Basic Auth, credentials are sent as:
   *   Authorization: Basic base64(clientId:clientSecret)
   *
   * Per RFC 6749, even if clientSecret is empty, the colon separator
   * must still be present: base64(clientId:)
   */
  describe('when credentialsPlacement is basic_auth_header', () => {
    /**
     * Verifies that when clientSecret is undefined, we still send a valid
     * Authorization header with an empty secret (clientId:)
     *
     * This handles cases where a public client doesn't have a secret
     * but the server still expects Basic Auth format.
     */
    test('should send token request with Authorization header when clientSecret is undefined', async () => {
      const { adapter, getCapturedConfig } = createMockAdapter();
      axios.defaults.adapter = adapter;

      const tokenStore = createMockTokenStore();
      const config: OAuth2Config = {
        grantType: 'client_credentials',
        accessTokenUrl: 'https://auth.example.com/token',
        clientId: 'my-client-id',
        clientSecret: undefined,
        credentialsPlacement: 'basic_auth_header'
      };

      const token = await getOAuth2Token(config, tokenStore, '');

      expect(token).toBe('test-token');

      const capturedConfig = getCapturedConfig();
      expect(capturedConfig).not.toBeNull();

      // Authorization header should contain base64(clientId:) with empty secret
      // "my-client-id:" encodes to "bXktY2xpZW50LWlkOg=="
      const expectedAuth = `Basic ${Buffer.from('my-client-id:').toString('base64')}`;
      expect(capturedConfig.headers['Authorization']).toBe(expectedAuth);

      // grant_type must always be in the request body
      expect(capturedConfig.data).toContain('grant_type=client_credentials');

      // When using basic_auth_header, client_id should NOT be duplicated in the body
      expect(capturedConfig.data).not.toContain('client_id=');
    });

    /**
     * Verifies that an empty string clientSecret is treated the same as undefined.
     *
     * The implementation uses nullish coalescing (clientSecret ?? '') so both
     * undefined and empty string result in the same Authorization header.
     */
    test('should send token request with Authorization header when clientSecret is empty string', async () => {
      const { adapter, getCapturedConfig } = createMockAdapter();
      axios.defaults.adapter = adapter;

      const tokenStore = createMockTokenStore();
      const config: OAuth2Config = {
        grantType: 'client_credentials',
        accessTokenUrl: 'https://auth.example.com/token',
        clientId: 'my-client-id',
        clientSecret: '',
        credentialsPlacement: 'basic_auth_header'
      };

      const token = await getOAuth2Token(config, tokenStore, '');

      expect(token).toBe('test-token');

      const capturedConfig = getCapturedConfig();
      expect(capturedConfig).not.toBeNull();

      // Empty string secret should produce same result as undefined
      const expectedAuth = `Basic ${Buffer.from('my-client-id:').toString('base64')}`;
      expect(capturedConfig.headers['Authorization']).toBe(expectedAuth);
    });

    /**
     * Verifies that when clientSecret is provided, it's properly included
     * in the Authorization header.
     */
    test('should send token request with Authorization header when clientSecret is present', async () => {
      const { adapter, getCapturedConfig } = createMockAdapter();
      axios.defaults.adapter = adapter;

      const tokenStore = createMockTokenStore();
      const config: OAuth2Config = {
        grantType: 'client_credentials',
        accessTokenUrl: 'https://auth.example.com/token',
        clientId: 'my-client-id',
        clientSecret: 'my-secret',
        credentialsPlacement: 'basic_auth_header'
      };

      const token = await getOAuth2Token(config, tokenStore, '');

      expect(token).toBe('test-token');

      const capturedConfig = getCapturedConfig();
      expect(capturedConfig).not.toBeNull();

      // Authorization header should contain base64(clientId:clientSecret)
      // "my-client-id:my-secret" encodes to "bXktY2xpZW50LWlkOm15LXNlY3JldA=="
      const expectedAuth = `Basic ${Buffer.from('my-client-id:my-secret').toString('base64')}`;
      expect(capturedConfig.headers['Authorization']).toBe(expectedAuth);

      // When using basic_auth_header, client_secret should NOT be in the body
      expect(capturedConfig.data).not.toContain('client_secret=');
    });
  });

  /**
   * Tests for `credentialsPlacement: 'body'`
   *
   * When using body placement, credentials are sent as form parameters:
   *   client_id=xxx&client_secret=yyy
   *
   * No Authorization header should be present.
   */
  describe('when credentialsPlacement is body', () => {
    /**
     * Verifies that when clientSecret is empty, only client_id is sent in the body.
     *
     * An empty client_secret should not be sent as it may cause issues with
     * some authorization servers that interpret it differently than omitting it.
     */
    test('should send client_id in body and no Authorization header when clientSecret is empty', async () => {
      const { adapter, getCapturedConfig } = createMockAdapter();
      axios.defaults.adapter = adapter;

      const tokenStore = createMockTokenStore();
      const config: OAuth2Config = {
        grantType: 'client_credentials',
        accessTokenUrl: 'https://auth.example.com/token',
        clientId: 'my-client-id',
        clientSecret: '',
        credentialsPlacement: 'body'
      };

      const token = await getOAuth2Token(config, tokenStore, '');

      expect(token).toBe('test-token');

      const capturedConfig = getCapturedConfig();
      expect(capturedConfig).not.toBeNull();

      // No Authorization header when using body placement
      expect(capturedConfig.headers['Authorization']).toBeUndefined();

      // client_id must be in the body
      expect(capturedConfig.data).toContain('client_id=my-client-id');

      // Empty client_secret should be omitted entirely, not sent as empty value
      expect(capturedConfig.data).not.toContain('client_secret=');
    });

    /**
     * Verifies that when clientSecret is provided, both client_id and
     * client_secret are sent in the request body.
     */
    test('should send both client_id and client_secret in body when clientSecret is present', async () => {
      const { adapter, getCapturedConfig } = createMockAdapter();
      axios.defaults.adapter = adapter;

      const tokenStore = createMockTokenStore();
      const config: OAuth2Config = {
        grantType: 'client_credentials',
        accessTokenUrl: 'https://auth.example.com/token',
        clientId: 'my-client-id',
        clientSecret: 'my-secret',
        credentialsPlacement: 'body'
      };

      const token = await getOAuth2Token(config, tokenStore, '');

      expect(token).toBe('test-token');

      const capturedConfig = getCapturedConfig();
      expect(capturedConfig).not.toBeNull();

      // No Authorization header when using body placement
      expect(capturedConfig.headers['Authorization']).toBeUndefined();

      // Both credentials should be in the body
      expect(capturedConfig.data).toContain('client_id=my-client-id');
      expect(capturedConfig.data).toContain('client_secret=my-secret');
    });
  });
});

/**
 * OAuth2 Password Grant Tests (Resource Owner Password Credentials)
 *
 * These tests verify the password grant flow, which includes:
 * - User credentials (username, password) always sent in the body
 * - Client credentials (clientId, clientSecret) placement configurable
 *
 * Note: Password grant is considered legacy and not recommended for new apps,
 * but many existing systems still require it.
 */
describe('OAuth2 Helper - Password Grant', () => {
  let originalAdapter: any;

  beforeEach(() => {
    originalAdapter = axios.defaults.adapter;
  });

  afterEach(() => {
    axios.defaults.adapter = originalAdapter;
  });

  /**
   * Tests for `credentialsPlacement: 'basic_auth_header'` with password grant
   *
   * Client credentials go in Authorization header, while user credentials
   * (username, password) are always in the request body.
   */
  describe('when credentialsPlacement is basic_auth_header', () => {
    /**
     * Verifies password grant with undefined clientSecret sends proper
     * Authorization header and includes username/password in body.
     */
    test('should send token request with Authorization header when clientSecret is undefined', async () => {
      const { adapter, getCapturedConfig } = createMockAdapter();
      axios.defaults.adapter = adapter;

      const tokenStore = createMockTokenStore();
      const config: OAuth2Config = {
        grantType: 'password',
        accessTokenUrl: 'https://auth.example.com/token',
        clientId: 'my-client-id',
        clientSecret: undefined,
        username: 'testuser',
        password: 'testpass',
        credentialsPlacement: 'basic_auth_header'
      };

      const token = await getOAuth2Token(config, tokenStore, '');

      expect(token).toBe('test-token');

      const capturedConfig = getCapturedConfig();
      expect(capturedConfig).not.toBeNull();

      // Authorization header with empty secret
      const expectedAuth = `Basic ${Buffer.from('my-client-id:').toString('base64')}`;
      expect(capturedConfig.headers['Authorization']).toBe(expectedAuth);

      // Password grant specific: grant_type and user credentials in body
      expect(capturedConfig.data).toContain('grant_type=password');
      expect(capturedConfig.data).toContain('username=testuser');
      expect(capturedConfig.data).toContain('password=testpass');

      // client_id should NOT be in body when using basic_auth_header
      expect(capturedConfig.data).not.toContain('client_id=');
    });

    /**
     * Verifies empty string clientSecret behaves same as undefined.
     */
    test('should send token request with Authorization header when clientSecret is empty string', async () => {
      const { adapter, getCapturedConfig } = createMockAdapter();
      axios.defaults.adapter = adapter;

      const tokenStore = createMockTokenStore();
      const config: OAuth2Config = {
        grantType: 'password',
        accessTokenUrl: 'https://auth.example.com/token',
        clientId: 'my-client-id',
        clientSecret: '',
        username: 'testuser',
        password: 'testpass',
        credentialsPlacement: 'basic_auth_header'
      };

      const token = await getOAuth2Token(config, tokenStore, '');

      expect(token).toBe('test-token');

      const capturedConfig = getCapturedConfig();
      expect(capturedConfig).not.toBeNull();

      // Empty string treated same as undefined
      const expectedAuth = `Basic ${Buffer.from('my-client-id:').toString('base64')}`;
      expect(capturedConfig.headers['Authorization']).toBe(expectedAuth);
    });

    /**
     * Verifies clientSecret is properly included in Authorization header.
     */
    test('should send token request with Authorization header when clientSecret is present', async () => {
      const { adapter, getCapturedConfig } = createMockAdapter();
      axios.defaults.adapter = adapter;

      const tokenStore = createMockTokenStore();
      const config: OAuth2Config = {
        grantType: 'password',
        accessTokenUrl: 'https://auth.example.com/token',
        clientId: 'my-client-id',
        clientSecret: 'my-secret',
        username: 'testuser',
        password: 'testpass',
        credentialsPlacement: 'basic_auth_header'
      };

      const token = await getOAuth2Token(config, tokenStore, '');

      expect(token).toBe('test-token');

      const capturedConfig = getCapturedConfig();
      expect(capturedConfig).not.toBeNull();

      // Full credentials in Authorization header
      const expectedAuth = `Basic ${Buffer.from('my-client-id:my-secret').toString('base64')}`;
      expect(capturedConfig.headers['Authorization']).toBe(expectedAuth);

      // client_secret should NOT be duplicated in body
      expect(capturedConfig.data).not.toContain('client_secret=');
    });
  });

  /**
   * Tests for `credentialsPlacement: 'body'` with password grant
   *
   * Both client credentials and user credentials are sent in the request body.
   */
  describe('when credentialsPlacement is body', () => {
    /**
     * Verifies password grant with empty clientSecret sends client_id
     * but omits client_secret from the body.
     */
    test('should send client_id in body and no Authorization header when clientSecret is empty', async () => {
      const { adapter, getCapturedConfig } = createMockAdapter();
      axios.defaults.adapter = adapter;

      const tokenStore = createMockTokenStore();
      const config: OAuth2Config = {
        grantType: 'password',
        accessTokenUrl: 'https://auth.example.com/token',
        clientId: 'my-client-id',
        clientSecret: '',
        username: 'testuser',
        password: 'testpass',
        credentialsPlacement: 'body'
      };

      const token = await getOAuth2Token(config, tokenStore, '');

      expect(token).toBe('test-token');

      const capturedConfig = getCapturedConfig();
      expect(capturedConfig).not.toBeNull();

      // No Authorization header
      expect(capturedConfig.headers['Authorization']).toBeUndefined();

      // client_id in body, but not empty client_secret
      expect(capturedConfig.data).toContain('client_id=my-client-id');
      expect(capturedConfig.data).not.toContain('client_secret=');
    });

    /**
     * Verifies password grant with clientSecret sends all credentials in body.
     */
    test('should send both client_id and client_secret in body when clientSecret is present', async () => {
      const { adapter, getCapturedConfig } = createMockAdapter();
      axios.defaults.adapter = adapter;

      const tokenStore = createMockTokenStore();
      const config: OAuth2Config = {
        grantType: 'password',
        accessTokenUrl: 'https://auth.example.com/token',
        clientId: 'my-client-id',
        clientSecret: 'my-secret',
        username: 'testuser',
        password: 'testpass',
        credentialsPlacement: 'body'
      };

      const token = await getOAuth2Token(config, tokenStore, '');

      expect(token).toBe('test-token');

      const capturedConfig = getCapturedConfig();
      expect(capturedConfig).not.toBeNull();

      // No Authorization header
      expect(capturedConfig.headers['Authorization']).toBeUndefined();

      // All credentials in body
      expect(capturedConfig.data).toContain('client_id=my-client-id');
      expect(capturedConfig.data).toContain('client_secret=my-secret');
    });
  });
});

describe('OAuth2 Helper - Interactive grant types', () => {
  let originalAdapter: any;

  beforeEach(() => {
    originalAdapter = axios.defaults.adapter;
  });

  afterEach(() => {
    axios.defaults.adapter = originalAdapter;
  });

  // Callers such as the CLI pass grant types straight from the collection, so the config
  // can hold grants outside the typed union
  test('should reject implicit without requesting a token', async () => {
    const { adapter, getCapturedConfig } = createMockAdapter();
    axios.defaults.adapter = adapter;

    const config = {
      grantType: 'implicit',
      accessTokenUrl: 'https://auth.example.com/token',
      clientId: 'my-client-id'
    } as unknown as OAuth2Config;

    await expect(getOAuth2Token(config, createMockTokenStore(), '')).rejects.toThrow(
      'Interactive OAuth2 grant type \'implicit\' is not supported in this runtime'
    );
    expect(getCapturedConfig()).toBeNull();
  });
});

/**
 * Records every token-endpoint request and answers with `respond`. Error statuses reject the way
 * axios does, so the helper sees a real `err.response`.
 */
const createRecordingAdapter = (respond: (config: any) => { status: number; data: any }) => {
  const requests: any[] = [];

  const adapter = async (config: any) => {
    requests.push(config);
    const { status, data } = respond(config);
    const response = {
      status,
      statusText: '',
      headers: { 'content-type': 'application/json' },
      config,
      data: Buffer.from(JSON.stringify(data))
    };
    if (status >= 400) {
      const error: any = new Error(`Request failed with status code ${status}`);
      error.response = response;
      error.config = config;
      throw error;
    }
    return response;
  };

  return { adapter, requests };
};

const bodyOf = (request: any) => Object.fromEntries(new URLSearchParams(request.data));

describe('OAuth2 Helper - Authorization Code Grant', () => {
  let originalAdapter: any;

  beforeEach(() => {
    originalAdapter = axios.defaults.adapter;
  });

  afterEach(() => {
    axios.defaults.adapter = originalAdapter;
  });

  const authCodeConfig = (overrides: Partial<OAuth2Config> = {}): OAuth2Config => ({
    grantType: 'authorization_code',
    authorizationUrl: 'https://auth.example.com/authorize',
    accessTokenUrl: 'https://auth.example.com/token',
    callbackUrl: 'http://localhost:8765/callback',
    clientId: 'my-client-id',
    clientSecret: 'my-secret',
    scope: 'openid profile',
    credentialsPlacement: 'body',
    ...overrides
  });

  // Stands in for the browser: the user approves and the IdP redirects back with the issued state
  const approvingAuthorizer = (code = 'auth-code-123') =>
    jest.fn(async (authorizeUrl: string, { callbackUrl }: { callbackUrl: string }) => {
      const state = new URL(authorizeUrl).searchParams.get('state');
      return `${callbackUrl}?code=${code}&state=${state}`;
    });

  const tokenEndpoint = () => createRecordingAdapter(() => ({ status: 200, data: { access_token: 'access-1', refresh_token: 'refresh-1', expires_in: 3600 } }));

  describe('authorization request', () => {
    test('should build the authorization URL with client, callback, scope and state', async () => {
      const { adapter } = tokenEndpoint();
      axios.defaults.adapter = adapter;
      const authorize = approvingAuthorizer();

      await getOAuth2Token(authCodeConfig(), createMockTokenStore(), '', undefined, { authorize });

      const [authorizeUrl, context] = authorize.mock.calls[0];
      const url = new URL(authorizeUrl);
      expect(url.origin + url.pathname).toBe('https://auth.example.com/authorize');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('client_id')).toBe('my-client-id');
      expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:8765/callback');
      expect(url.searchParams.get('scope')).toBe('openid profile');
      expect(url.searchParams.get('state')).toMatch(/^[0-9a-f]{32}$/);
      expect(url.searchParams.has('code_challenge')).toBe(false);
      expect(url.searchParams.has('client_secret')).toBe(false);
      expect(context).toEqual({ callbackUrl: 'http://localhost:8765/callback' });
    });

    // Matches the Bruno app: a configured state may carry data, so it is sent as-is
    test('should send a configured state unchanged', async () => {
      const { adapter } = tokenEndpoint();
      axios.defaults.adapter = adapter;
      const authorize = approvingAuthorizer();

      const token = await getOAuth2Token(authCodeConfig({ state: ' my-state ' }), createMockTokenStore(), '', undefined, { authorize });

      expect(new URL(authorize.mock.calls[0][0]).searchParams.get('state')).toBe('my-state');
      expect(token).toBe('access-1');
    });

    test('should reject an invalid callback URL before starting sign-in', async () => {
      const authorize = approvingAuthorizer();

      await expect(getOAuth2Token(authCodeConfig({ callbackUrl: 'not a url' }), createMockTokenStore(), '', undefined, { authorize })).rejects.toThrow(
        'Invalid callback URL: not a url'
      );
      expect(authorize).not.toHaveBeenCalled();
    });

    test('should use the Bruno callback URL when none is configured', async () => {
      const { adapter, requests } = tokenEndpoint();
      axios.defaults.adapter = adapter;
      const authorize = approvingAuthorizer();

      await getOAuth2Token(authCodeConfig({ callbackUrl: '' }), createMockTokenStore(), '', undefined, { authorize });

      expect(new URL(authorize.mock.calls[0][0]).searchParams.get('redirect_uri')).toBe('https://oauth.usebruno.com/callback');
      expect(bodyOf(requests[0]).redirect_uri).toBe('https://oauth.usebruno.com/callback');
    });

    test('should send only enabled queryparams additional parameters on the authorization URL', async () => {
      const { adapter } = tokenEndpoint();
      axios.defaults.adapter = adapter;
      const authorize = approvingAuthorizer();

      const config = authCodeConfig({
        additionalParameters: {
          authorization: [
            { name: 'audience', value: 'api://default', enabled: true, sendIn: 'queryparams' },
            { name: 'prompt', value: 'login', enabled: false, sendIn: 'queryparams' },
            { name: 'x-header', value: 'ignored', enabled: true, sendIn: 'headers' }
          ]
        }
      });
      await getOAuth2Token(config, createMockTokenStore(), '', undefined, { authorize });

      const url = new URL(authorize.mock.calls[0][0]);
      expect(url.searchParams.get('audience')).toBe('api://default');
      expect(url.searchParams.has('prompt')).toBe(false);
      expect(url.searchParams.has('x-header')).toBe(false);
    });
  });

  describe('PKCE', () => {
    test('should send an S256 challenge and the matching verifier in the token exchange', async () => {
      const { adapter, requests } = tokenEndpoint();
      axios.defaults.adapter = adapter;
      const authorize = approvingAuthorizer();

      await getOAuth2Token(authCodeConfig({ pkce: true }), createMockTokenStore(), '', undefined, { authorize });

      const url = new URL(authorize.mock.calls[0][0]);
      const { code_verifier: codeVerifier } = bodyOf(requests[0]);
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
      expect(codeVerifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
      expect(url.searchParams.get('code_challenge')).toBe(crypto.createHash('sha256').update(codeVerifier).digest('base64url'));
    });

    test('should not send a verifier when PKCE is disabled', async () => {
      const { adapter, requests } = tokenEndpoint();
      axios.defaults.adapter = adapter;

      await getOAuth2Token(authCodeConfig({ pkce: false }), createMockTokenStore(), '', undefined, { authorize: approvingAuthorizer() });

      expect(bodyOf(requests[0])).not.toHaveProperty('code_verifier');
    });
  });

  describe('code exchange', () => {
    test('should exchange the code with client credentials in the body', async () => {
      const { adapter, requests } = tokenEndpoint();
      axios.defaults.adapter = adapter;

      const token = await getOAuth2Token(authCodeConfig(), createMockTokenStore(), '', undefined, { authorize: approvingAuthorizer('the-code') });

      expect(token).toBe('access-1');
      expect(requests).toHaveLength(1);
      expect(requests[0].url).toBe('https://auth.example.com/token');
      expect(requests[0].headers['Authorization']).toBeUndefined();
      expect(bodyOf(requests[0])).toEqual({
        grant_type: 'authorization_code',
        code: 'the-code',
        redirect_uri: 'http://localhost:8765/callback',
        client_id: 'my-client-id',
        client_secret: 'my-secret'
      });
    });

    test('should send client credentials in a Basic header when configured', async () => {
      const { adapter, requests } = tokenEndpoint();
      axios.defaults.adapter = adapter;

      await getOAuth2Token(authCodeConfig({ credentialsPlacement: 'basic_auth_header' }), createMockTokenStore(), '', undefined, { authorize: approvingAuthorizer() });

      expect(requests[0].headers['Authorization']).toBe(`Basic ${Buffer.from('my-client-id:my-secret').toString('base64')}`);
      expect(bodyOf(requests[0])).not.toHaveProperty('client_id');
      expect(bodyOf(requests[0])).not.toHaveProperty('client_secret');
    });

    test('should apply additional token parameters', async () => {
      const { adapter, requests } = tokenEndpoint();
      axios.defaults.adapter = adapter;

      const config = authCodeConfig({
        additionalParameters: {
          token: [
            { name: 'resource', value: 'api', enabled: true, sendIn: 'body' },
            { name: 'X-Tenant', value: 'acme', enabled: true, sendIn: 'headers' },
            { name: 'tenant', value: 'acme', enabled: true, sendIn: 'queryparams' }
          ]
        }
      });
      await getOAuth2Token(config, createMockTokenStore(), '', undefined, { authorize: approvingAuthorizer() });

      expect(bodyOf(requests[0]).resource).toBe('api');
      expect(requests[0].headers['X-Tenant']).toBe('acme');
      expect(new URL(requests[0].url).searchParams.get('tenant')).toBe('acme');
    });

    test('should surface the IdP error when the token endpoint rejects the code', async () => {
      const { adapter } = createRecordingAdapter(() => ({ status: 400, data: { error: 'invalid_grant', error_description: 'Code expired' } }));
      axios.defaults.adapter = adapter;
      const tokenStore = createMockTokenStore();

      await expect(getOAuth2Token(authCodeConfig(), tokenStore, '', undefined, { authorize: approvingAuthorizer() })).rejects.toThrow(
        'OAuth2 token request failed with status 400: invalid_grant - Code expired'
      );
      expect(tokenStore.credentials.size).toBe(0);
    });

    test('should reuse the stored token instead of signing in again', async () => {
      const { adapter, requests } = tokenEndpoint();
      axios.defaults.adapter = adapter;
      const authorize = approvingAuthorizer();
      const tokenStore = createMockTokenStore();

      await getOAuth2Token(authCodeConfig(), tokenStore, '', undefined, { authorize });
      const token = await getOAuth2Token(authCodeConfig(), tokenStore, '', undefined, { authorize });

      expect(token).toBe('access-1');
      expect(authorize).toHaveBeenCalledTimes(1);
      expect(requests).toHaveLength(1);
    });
  });

  describe('callback validation', () => {
    const rejectsWithoutTokenRequest = async (callbackQuery: (state: string | null) => string, message: string, callbackTarget?: string) => {
      const { adapter, requests } = tokenEndpoint();
      axios.defaults.adapter = adapter;
      const authorize = jest.fn(async (authorizeUrl: string, { callbackUrl }: { callbackUrl: string }) =>
        `${callbackTarget ?? callbackUrl}?${callbackQuery(new URL(authorizeUrl).searchParams.get('state'))}`);

      await expect(getOAuth2Token(authCodeConfig(), createMockTokenStore(), '', undefined, { authorize })).rejects.toThrow(message);
      expect(requests).toHaveLength(0);
    };

    test('should reject a callback on a different origin', async () => {
      await rejectsWithoutTokenRequest(
        (state) => `code=abc&state=${state}`,
        'Invalid OAuth2 callback: expected a redirect to http://localhost:8765/callback',
        'http://evil.example.com:8765/callback'
      );
    });

    test('should reject a callback on a different path', async () => {
      await rejectsWithoutTokenRequest(
        (state) => `code=abc&state=${state}`,
        'Invalid OAuth2 callback: expected a redirect to http://localhost:8765/callback',
        'http://localhost:8765/other'
      );
    });

    test('should accept extra query parameters from the IdP', async () => {
      const { adapter, requests } = tokenEndpoint();
      axios.defaults.adapter = adapter;
      const authorize = jest.fn(async (authorizeUrl: string, { callbackUrl }: { callbackUrl: string }) =>
        `${callbackUrl}?session_state=xyz&code=abc&iss=https%3A%2F%2Fauth.example.com&state=${new URL(authorizeUrl).searchParams.get('state')}`);

      const token = await getOAuth2Token(authCodeConfig(), createMockTokenStore(), '', undefined, { authorize });

      expect(token).toBe('access-1');
      expect(bodyOf(requests[0]).code).toBe('abc');
    });

    test('should reject an IdP error response', async () => {
      await rejectsWithoutTokenRequest(
        (state) => `error=access_denied&error_description=User%20denied&state=${state}`,
        'OAuth2 authorization failed: access_denied - User denied'
      );
    });

    test('should reject a callback whose state does not match', async () => {
      await rejectsWithoutTokenRequest(() => 'code=abc&state=forged', 'OAuth2 state mismatch');
    });

    test('should reject a callback without state', async () => {
      await rejectsWithoutTokenRequest(() => 'code=abc', 'OAuth2 state mismatch');
    });

    test('should reject a callback without a code', async () => {
      await rejectsWithoutTokenRequest((state) => `state=${state}`, 'missing authorization code');
    });
  });

  test('should fail clearly when no interactive sign-in is available', async () => {
    const { adapter, requests } = tokenEndpoint();
    axios.defaults.adapter = adapter;

    await expect(getOAuth2Token(authCodeConfig(), createMockTokenStore(), '')).rejects.toThrow(
      'OAuth2 authorization code flow requires interactive sign-in'
    );
    expect(requests).toHaveLength(0);
  });

  describe('refresh', () => {
    const expiredCredentials = { access_token: 'old-access', refresh_token: 'refresh-1', expires_in: 1, created_at: Date.now() - 60 * 1000 };

    const storeWithExpiredToken = async () => {
      const tokenStore = createMockTokenStore();
      await tokenStore.saveCredential({ url: 'https://auth.example.com/token', credentialsId: 'default', credentials: expiredCredentials });
      return tokenStore;
    };

    test('should refresh an expired token without signing in again', async () => {
      const { adapter, requests } = createRecordingAdapter(() => ({ status: 200, data: { access_token: 'access-2', expires_in: 3600 } }));
      axios.defaults.adapter = adapter;
      const authorize = approvingAuthorizer();
      const tokenStore = await storeWithExpiredToken();

      const config = authCodeConfig({ autoRefreshToken: true, refreshTokenUrl: 'https://auth.example.com/refresh' });
      const token = await getOAuth2Token(config, tokenStore, '', undefined, { authorize });

      expect(token).toBe('access-2');
      expect(authorize).not.toHaveBeenCalled();
      expect(requests[0].url).toBe('https://auth.example.com/refresh');
      expect(bodyOf(requests[0])).toEqual({
        grant_type: 'refresh_token',
        refresh_token: 'refresh-1',
        client_id: 'my-client-id',
        client_secret: 'my-secret'
      });
      // The IdP did not rotate the refresh token, so the existing one stays usable
      const stored = await tokenStore.getCredential({ url: 'https://auth.example.com/token', credentialsId: 'default' });
      expect(stored.refresh_token).toBe('refresh-1');
    });

    test('should sign in again when the refresh fails and autoFetchToken is on', async () => {
      const { adapter, requests } = createRecordingAdapter((config) =>
        bodyOf(config).grant_type === 'refresh_token'
          ? { status: 400, data: { error: 'invalid_grant' } }
          : { status: 200, data: { access_token: 'access-3', expires_in: 3600 } });
      axios.defaults.adapter = adapter;
      const authorize = approvingAuthorizer();

      const token = await getOAuth2Token(authCodeConfig({ autoRefreshToken: true }), await storeWithExpiredToken(), '', undefined, { authorize });

      expect(token).toBe('access-3');
      expect(authorize).toHaveBeenCalledTimes(1);
      expect(requests.map((request) => bodyOf(request).grant_type)).toEqual(['refresh_token', 'authorization_code']);
    });

    test('should not refresh when autoRefreshToken is off', async () => {
      const { adapter, requests } = tokenEndpoint();
      axios.defaults.adapter = adapter;
      const authorize = approvingAuthorizer();

      await getOAuth2Token(authCodeConfig({ autoRefreshToken: false }), await storeWithExpiredToken(), '', undefined, { authorize });

      expect(authorize).toHaveBeenCalledTimes(1);
      expect(requests.map((request) => bodyOf(request).grant_type)).toEqual(['authorization_code']);
    });
  });
});
