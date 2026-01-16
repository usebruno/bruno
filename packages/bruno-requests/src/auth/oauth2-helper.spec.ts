import axios from 'axios';
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
