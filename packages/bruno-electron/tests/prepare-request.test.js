const crypto = require('node:crypto');

// Mock crypto.randomBytes to return predictable values for testing
jest.mock('node:crypto', () => ({
  ...jest.requireActual('node:crypto'),
  randomBytes: jest.fn(() => Buffer.from('1234567890abcdef', 'hex'))
}));

// Mock the lodash get function with a more sophisticated mock
const mockGet = jest.fn();
jest.mock('lodash', () => ({
  get: mockGet,
  each: jest.fn(),
  filter: jest.fn(),
  find: jest.fn()
}));

// Import the function to test
const { setAuthHeaders } = require('../src/ipc/network/prepare-request');

describe('setAuthHeaders', () => {
  let mockAxiosRequest;
  let mockRequest;
  let mockCollectionRoot;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset crypto mock to return predictable values
    crypto.randomBytes.mockReturnValue(Buffer.from('1234567890abcdef', 'hex'));
    
    // Setup default mock objects
    mockAxiosRequest = {
      headers: {}
    };
    
    mockRequest = {
      auth: {
        mode: 'none'
      }
    };
    
    mockCollectionRoot = {
      request: {
        auth: null
      }
    };

    // Setup a more sophisticated mock for lodash get function
    mockGet.mockImplementation((obj, path, defaultValue) => {
      if (!obj) return defaultValue;
      
      const keys = path.split('.');
      let current = obj;
      
      for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key];
        } else {
          return defaultValue;
        }
      }
      
      return current;
    });
  });

  describe('Collection-level authentication inheritance', () => {
    test('should inherit AWS v4 authentication from collection', () => {
      mockCollectionRoot.request.auth = {
        mode: 'awsv4',
        awsv4: {
          accessKeyId: 'test-access-key',
          secretAccessKey: 'test-secret-key',
          sessionToken: 'test-session-token',
          service: 's3',
          region: 'us-east-1',
          profileName: 'default'
        }
      };
      
      mockRequest.auth.mode = 'inherit';

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result.awsv4config).toEqual({
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
        sessionToken: 'test-session-token',
        service: 's3',
        region: 'us-east-1',
        profileName: 'default'
      });
    });

    test('should inherit basic authentication from collection', () => {
      mockCollectionRoot.request.auth = {
        mode: 'basic',
        basic: {
          username: 'testuser',
          password: 'testpass'
        }
      };
      
      mockRequest.auth.mode = 'inherit';

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result.basicAuth).toEqual({
        username: 'testuser',
        password: 'testpass'
      });
    });

    test('should inherit bearer authentication from collection', () => {
      mockCollectionRoot.request.auth = {
        mode: 'bearer',
        bearer: {
          token: 'test-token'
        }
      };
      
      mockRequest.auth.mode = 'inherit';

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result.headers['Authorization']).toBe('Bearer test-token');
    });

    test('should inherit digest authentication from collection', () => {
      mockCollectionRoot.request.auth = {
        mode: 'digest',
        digest: {
          username: 'testuser',
          password: 'testpass'
        }
      };
      
      mockRequest.auth.mode = 'inherit';

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result.digestConfig).toEqual({
        username: 'testuser',
        password: 'testpass'
      });
    });

    test('should inherit NTLM authentication from collection', () => {
      mockCollectionRoot.request.auth = {
        mode: 'ntlm',
        ntlm: {
          username: 'testuser',
          password: 'testpass',
          domain: 'testdomain'
        }
      };
      
      mockRequest.auth.mode = 'inherit';

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result.ntlmConfig).toEqual({
        username: 'testuser',
        password: 'testpass',
        domain: 'testdomain'
      });
    });

    test('should inherit WSSE authentication from collection', () => {
      mockCollectionRoot.request.auth = {
        mode: 'wsse',
        wsse: {
          username: 'testuser',
          password: 'testpass'
        }
      };
      
      mockRequest.auth.mode = 'inherit';

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result.headers['X-WSSE']).toMatch(/UsernameToken Username="testuser", PasswordDigest="[^"]+", Nonce="1234567890abcdef", Created="[^"]+"/);
    });

    test('should inherit API key authentication from collection (header placement)', () => {
      mockCollectionRoot.request.auth = {
        mode: 'apikey',
        apikey: {
          key: 'X-API-Key',
          value: 'test-api-key',
          placement: 'header'
        }
      };
      
      mockRequest.auth.mode = 'inherit';

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result.headers['X-API-Key']).toBe('test-api-key');
    });

    test('should inherit API key authentication from collection (query params placement)', () => {
      mockCollectionRoot.request.auth = {
        mode: 'apikey',
        apikey: {
          key: 'api_key',
          value: 'test-api-key',
          placement: 'queryparams'
        }
      };
      
      mockRequest.auth.mode = 'inherit';

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result.apiKeyAuthValueForQueryParams).toEqual({
        key: 'api_key',
        value: 'test-api-key',
        placement: 'queryparams'
      });
    });

    test('should skip API key authentication when key is empty', () => {
      mockCollectionRoot.request.auth = {
        mode: 'apikey',
        apikey: {
          key: '',
          value: 'test-api-key',
          placement: 'header'
        }
      };
      
      mockRequest.auth.mode = 'inherit';

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result.headers['']).toBeUndefined();
    });
  });

  describe('OAuth2 authentication inheritance', () => {
    test('should inherit OAuth2 password grant from collection', () => {
      mockCollectionRoot.request.auth = {
        mode: 'oauth2',
        oauth2: {
          grantType: 'password',
          accessTokenUrl: 'https://example.com/token',
          refreshTokenUrl: 'https://example.com/refresh',
          username: 'testuser',
          password: 'testpass',
          clientId: 'test-client',
          clientSecret: 'test-secret',
          scope: 'read write',
          credentialsPlacement: 'body',
          credentialsId: 'test-credentials',
          tokenPlacement: 'header',
          tokenHeaderPrefix: 'Bearer',
          tokenQueryKey: 'access_token',
          autoFetchToken: true,
          autoRefreshToken: true,
          additionalParameters: { authorization: [], token: [], refresh: [] }
        }
      };
      
      mockRequest.auth.mode = 'inherit';

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result.oauth2).toEqual({
        grantType: 'password',
        accessTokenUrl: 'https://example.com/token',
        refreshTokenUrl: 'https://example.com/refresh',
        username: 'testuser',
        password: 'testpass',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        scope: 'read write',
        credentialsPlacement: 'body',
        credentialsId: 'test-credentials',
        tokenPlacement: 'header',
        tokenHeaderPrefix: 'Bearer',
        tokenQueryKey: 'access_token',
        autoFetchToken: true,
        autoRefreshToken: true,
        additionalParameters: { authorization: [], token: [], refresh: [] }
      });
    });

    test('should inherit OAuth2 authorization_code grant from collection', () => {
      mockCollectionRoot.request.auth = {
        mode: 'oauth2',
        oauth2: {
          grantType: 'authorization_code',
          callbackUrl: 'https://example.com/callback',
          authorizationUrl: 'https://example.com/auth',
          accessTokenUrl: 'https://example.com/token',
          refreshTokenUrl: 'https://example.com/refresh',
          clientId: 'test-client',
          clientSecret: 'test-secret',
          scope: 'read write',
          state: 'random-state',
          pkce: true,
          credentialsPlacement: 'body',
          credentialsId: 'test-credentials',
          tokenPlacement: 'header',
          tokenHeaderPrefix: 'Bearer',
          tokenQueryKey: 'access_token',
          autoFetchToken: true,
          autoRefreshToken: true,
          additionalParameters: { authorization: [], token: [], refresh: [] }
        }
      };
      
      mockRequest.auth.mode = 'inherit';

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result.oauth2).toEqual({
        grantType: 'authorization_code',
        callbackUrl: 'https://example.com/callback',
        authorizationUrl: 'https://example.com/auth',
        accessTokenUrl: 'https://example.com/token',
        refreshTokenUrl: 'https://example.com/refresh',
        clientId: 'test-client',
        scope: 'read write',
        state: 'random-state',
        pkce: true,
        credentialsPlacement: 'body',
        clientSecret: 'test-secret',
        credentialsId: 'test-credentials',
        tokenPlacement: 'header',
        tokenHeaderPrefix: 'Bearer',
        tokenQueryKey: 'access_token',
        autoFetchToken: true,
        autoRefreshToken: true,
        additionalParameters: { authorization: [], token: [], refresh: [] }
      });
    });

    test('should inherit OAuth2 implicit grant from collection', () => {
      mockCollectionRoot.request.auth = {
        mode: 'oauth2',
        oauth2: {
          grantType: 'implicit',
          callbackUrl: 'https://example.com/callback',
          authorizationUrl: 'https://example.com/auth',
          clientId: 'test-client',
          scope: 'read write',
          state: 'random-state',
          credentialsId: 'test-credentials',
          tokenPlacement: 'header',
          tokenHeaderPrefix: 'Bearer',
          tokenQueryKey: 'access_token',
          autoFetchToken: true,
          additionalParameters: { authorization: [], token: [], refresh: [] }
        }
      };
      
      mockRequest.auth.mode = 'inherit';

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result.oauth2).toEqual({
        grantType: 'implicit',
        callbackUrl: 'https://example.com/callback',
        authorizationUrl: 'https://example.com/auth',
        clientId: 'test-client',
        scope: 'read write',
        state: 'random-state',
        credentialsId: 'test-credentials',
        tokenPlacement: 'header',
        tokenHeaderPrefix: 'Bearer',
        tokenQueryKey: 'access_token',
        autoFetchToken: true,
        additionalParameters: { authorization: [], token: [], refresh: [] }
      });
    });

    test('should inherit OAuth2 client_credentials grant from collection', () => {
      mockCollectionRoot.request.auth = {
        mode: 'oauth2',
        oauth2: {
          grantType: 'client_credentials',
          accessTokenUrl: 'https://example.com/token',
          refreshTokenUrl: 'https://example.com/refresh',
          clientId: 'test-client',
          clientSecret: 'test-secret',
          scope: 'read write',
          credentialsPlacement: 'body',
          credentialsId: 'test-credentials',
          tokenPlacement: 'header',
          tokenHeaderPrefix: 'Bearer',
          tokenQueryKey: 'access_token',
          autoFetchToken: true,
          autoRefreshToken: true,
          additionalParameters: { authorization: [], token: [], refresh: [] }
        }
      };
      
      mockRequest.auth.mode = 'inherit';

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result.oauth2).toEqual({
        grantType: 'client_credentials',
        accessTokenUrl: 'https://example.com/token',
        refreshTokenUrl: 'https://example.com/refresh',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        scope: 'read write',
        credentialsPlacement: 'body',
        credentialsId: 'test-credentials',
        tokenPlacement: 'header',
        tokenHeaderPrefix: 'Bearer',
        tokenQueryKey: 'access_token',
        autoFetchToken: true,
        autoRefreshToken: true,
        additionalParameters: { authorization: [], token: [], refresh: [] }
      });
    });
  });

  describe('Request-level authentication (overrides collection)', () => {
    test('should set AWS v4 authentication at request level', () => {
      mockCollectionRoot.request.auth = {
        mode: 'awsv4',
        awsv4: {
          accessKeyId: 'test-access-key',
          secretAccessKey: 'test-secret-key',
          sessionToken: 'test-session-token',
          service: 's3',
          region: 'us-east-1',
          profileName: 'default'
        }
      }
      mockRequest.auth = {
        mode: 'awsv4',
        awsv4: {
          accessKeyId: 'request-access-key',
          secretAccessKey: 'request-secret-key',
          sessionToken: 'request-session-token',
          service: 's3',
          region: 'us-west-2',
          profileName: 'production'
        }
      };

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result.awsv4config).toEqual({
        accessKeyId: 'request-access-key',
        secretAccessKey: 'request-secret-key',
        sessionToken: 'request-session-token',
        service: 's3',
        region: 'us-west-2',
        profileName: 'production'
      });
    });

    test('should set basic authentication at request level', () => {
      mockCollectionRoot.request.auth = {
        mode: 'basic',
        basic: {
          username: 'testuser',
          password: 'testpass'
        }
      };
      mockRequest.auth = {
        mode: 'basic',
        basic: {
          username: 'requestuser',
          password: 'requestpass'
        }
      };

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result.basicAuth).toEqual({
        username: 'requestuser',
        password: 'requestpass'
      });
    });

    test('should set bearer authentication at request level', () => {
      mockCollectionRoot.request.auth = {
        mode: 'bearer',
        bearer: {
          token: 'test-token'
        }
      };
      mockRequest.auth = {
        mode: 'bearer',
        bearer: {
          token: 'request-token'
        }
      };

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result.headers['Authorization']).toBe('Bearer request-token');
    });

    test('should set digest authentication at request level', () => {
      mockCollectionRoot.request.auth = {
        mode: 'digest',
        digest: {
          username: 'testuser',
          password: 'testpass'
        }
      };
      mockRequest.auth = {
        mode: 'digest',
        digest: {
          username: 'requestuser',
          password: 'requestpass'
        }
      };

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result.digestConfig).toEqual({
        username: 'requestuser',
        password: 'requestpass'
      });
    });

    test('should set NTLM authentication at request level', () => {
      mockCollectionRoot.request.auth = {
        mode: 'ntlm',
        ntlm: {
          username: 'testuser',
          password: 'testpass',
          domain: 'testdomain'
        }
      };
      mockRequest.auth = {
        mode: 'ntlm',
        ntlm: {
          username: 'requestuser',
          password: 'requestpass',
          domain: 'requestdomain'
        }
      };

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result.ntlmConfig).toEqual({
        username: 'requestuser',
        password: 'requestpass',
        domain: 'requestdomain'
      });
    });

    test('should set WSSE authentication at request level', () => {
      mockCollectionRoot.request.auth = {
        mode: 'wsse',
        wsse: {
          username: 'testuser',
          password: 'testpass'
        }
      };
      mockRequest.auth = {
        mode: 'wsse',
        wsse: {
          username: 'requestuser',
          password: 'requestpass'
        }
      };

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result.headers['X-WSSE']).toMatch(/UsernameToken Username="requestuser", PasswordDigest="[^"]+", Nonce="1234567890abcdef", Created="[^"]+"/);
    });

    test('should set API key authentication at request level (header placement)', () => {
      mockCollectionRoot.request.auth = {
        mode: 'apikey',
        apikey: {
          key: 'X-Request-API-Key',
          value: 'test-api-key',
          placement: 'header'
        }
      };
      mockRequest.auth = {
        mode: 'apikey',
        apikey: {
          key: 'X-Request-API-Key',
          value: 'request-api-key',
          placement: 'header'
        }
      };

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result.headers['X-Request-API-Key']).toBe('request-api-key');
    });

    test('should set API key authentication at request level (query params placement)', () => {
      mockCollectionRoot.request.auth = {
        mode: 'apikey',
        apikey: {
          key: 'X-Request-API-Key',
          value: 'test-api-key',
          placement: 'header'
        }
      };
      mockRequest.auth = {
        mode: 'apikey',
        apikey: {
          key: 'request_api_key',
          value: 'request-api-key',
          placement: 'queryparams'
        }
      };

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result.apiKeyAuthValueForQueryParams).toEqual({
        key: 'request_api_key',
        value: 'request-api-key',
        placement: 'queryparams'
      });
    });

        test('should set OAuth2 password grant at request level', () => {
      mockCollectionRoot.request.auth = {
        mode: 'oauth2',
        oauth2: {
          grantType: 'password',
          accessTokenUrl: 'https://collection.com/token',
          refreshTokenUrl: 'https://collection.com/refresh',
          username: 'collectionuser',
          password: 'collectionpass',
          clientId: 'collection-client',
          clientSecret: 'collection-secret',
          scope: 'read',
          credentialsPlacement: 'header',
          credentialsId: 'collection-credentials',
          tokenPlacement: 'query',
          tokenHeaderPrefix: 'Token',
          tokenQueryKey: 'token',
          autoFetchToken: false,
          autoRefreshToken: false,
          additionalParameters: { authorization: [], token: [], refresh: [] }
        }
      };
      mockRequest.auth = {
        mode: 'oauth2',
        oauth2: {
          grantType: 'password',
          accessTokenUrl: 'https://request.com/token',
          refreshTokenUrl: 'https://request.com/refresh',
          username: 'requestuser',
          password: 'requestpass',
          clientId: 'request-client',
          clientSecret: 'request-secret',
          scope: 'read',
          credentialsPlacement: 'header',
          credentialsId: 'request-credentials',
          tokenPlacement: 'query',
          tokenHeaderPrefix: 'Token',
          tokenQueryKey: 'token',
          autoFetchToken: false,
          autoRefreshToken: false,
          additionalParameters: { authorization: [], token: [], refresh: [] }
        }
      };

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result.oauth2).toEqual({
        grantType: 'password',
        accessTokenUrl: 'https://request.com/token',
        refreshTokenUrl: 'https://request.com/refresh',
        username: 'requestuser',
        password: 'requestpass',
        clientId: 'request-client',
        clientSecret: 'request-secret',
        scope: 'read',
        credentialsPlacement: 'header',
        credentialsId: 'request-credentials',
        tokenPlacement: 'query',
        tokenHeaderPrefix: 'Token',
        tokenQueryKey: 'token',
        autoFetchToken: false,
        autoRefreshToken: false,
        additionalParameters: { authorization: [], token: [], refresh: [] }
      });
    });

    test('should set OAuth2 authorization_code grant at request level', () => {
      mockCollectionRoot.request.auth = {
        mode: 'oauth2',
        oauth2: {
          grantType: 'password',
          callbackUrl: 'https://collection.com/callback',
          authorizationUrl: 'https://collection.com/auth',
          accessTokenUrl: 'https://collection.com/token',
          refreshTokenUrl: 'https://collection.com/refresh',
          username: 'collectionuser',
          password: 'collectionpass',
          clientId: 'collection-client',
          clientSecret: 'collection-secret',
        }
      };
      mockRequest.auth = {
        mode: 'oauth2',
        oauth2: {
          grantType: 'authorization_code',
          callbackUrl: 'https://request.com/callback',
          authorizationUrl: 'https://request.com/auth',
          accessTokenUrl: 'https://request.com/token',
          refreshTokenUrl: 'https://request.com/refresh',
          clientId: 'request-client',
          clientSecret: 'request-secret',
          scope: 'read',
          state: 'request-state',
          pkce: false,
          credentialsPlacement: 'body',
          credentialsId: 'request-credentials',
          tokenPlacement: 'header',
          tokenHeaderPrefix: 'Bearer',
          tokenQueryKey: 'access_token',
          autoFetchToken: true,
          autoRefreshToken: true,
          additionalParameters: { authorization: [], token: [], refresh: [] }
        }
      };

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result.oauth2).toEqual({
        grantType: 'authorization_code',
        callbackUrl: 'https://request.com/callback',
        authorizationUrl: 'https://request.com/auth',
        accessTokenUrl: 'https://request.com/token',
        refreshTokenUrl: 'https://request.com/refresh',
        clientId: 'request-client',
        clientSecret: 'request-secret',
        scope: 'read',
        state: 'request-state',
        pkce: false,
        credentialsPlacement: 'body',
        credentialsId: 'request-credentials',
        tokenPlacement: 'header',
        tokenHeaderPrefix: 'Bearer',
        tokenQueryKey: 'access_token',
        autoFetchToken: true,
        autoRefreshToken: true,
        additionalParameters: { authorization: [], token: [], refresh: [] }
      });
    });

    test('should set OAuth2 implicit grant at request level', () => {
      mockCollectionRoot.request.auth = {
        mode: 'oauth2',
        oauth2: {
          grantType: 'implicit',
          callbackUrl: 'https://collection.com/callback',
          authorizationUrl: 'https://collection.com/auth',
          clientId: 'collection-client',
          scope: 'read',
          state: 'collection-state',
          credentialsId: 'collection-credentials',
          tokenPlacement: 'header',
          tokenHeaderPrefix: 'Bearer',
          tokenQueryKey: 'access_token',
          autoFetchToken: true,
          additionalParameters: { authorization: [], token: [], refresh: [] }
        }
      };
      mockRequest.auth = {
        mode: 'oauth2',
        oauth2: {
          grantType: 'implicit',
          callbackUrl: 'https://request.com/callback',
          authorizationUrl: 'https://request.com/auth',
          clientId: 'request-client',
          scope: 'read',
          state: 'request-state',
          credentialsId: 'request-credentials',
          tokenPlacement: 'query',
          tokenHeaderPrefix: 'Token',
          tokenQueryKey: 'token',
          autoFetchToken: false,
          additionalParameters: { authorization: [], token: [], refresh: [] }
        }
      };

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result.oauth2).toEqual({
        grantType: 'implicit',
        callbackUrl: 'https://request.com/callback',
        authorizationUrl: 'https://request.com/auth',
        clientId: 'request-client',
        credentialsId: 'request-credentials',
        scope: 'read',
        state: 'request-state',
        tokenPlacement: 'query',
        tokenHeaderPrefix: 'Token',
        tokenQueryKey: 'token',
        autoFetchToken: false,
        additionalParameters: { authorization: [], token: [], refresh: [] }
      });
    });

    test('should set OAuth2 client_credentials grant at request level', () => {
      mockCollectionRoot.request.auth = {
        mode: 'oauth2',
        oauth2: {
          grantType: 'client_credentials',
          accessTokenUrl: 'https://collection.com/token',
          refreshTokenUrl: 'https://collection.com/refresh',
          clientId: 'collection-client',
          clientSecret: 'collection-secret',
          scope: 'read',
          credentialsPlacement: 'body',
          credentialsId: 'collection-credentials',
          tokenPlacement: 'header',
          tokenHeaderPrefix: 'Bearer',
          tokenQueryKey: 'access_token',
          autoFetchToken: true,
          autoRefreshToken: true,
          additionalParameters: { authorization: [], token: [], refresh: [] }
        }
      };
      mockRequest.auth = {
        mode: 'oauth2',
        oauth2: {
          grantType: 'client_credentials',
          accessTokenUrl: 'https://request.com/token',
          refreshTokenUrl: 'https://request.com/refresh',
          clientId: 'request-client',
          clientSecret: 'request-secret',
          scope: 'read',
          credentialsPlacement: 'body',
          credentialsId: 'request-credentials',
          tokenPlacement: 'header',
          tokenHeaderPrefix: 'Bearer',
          tokenQueryKey: 'access_token',
          autoFetchToken: true,
          autoRefreshToken: true,
          additionalParameters: { authorization: [], token: [], refresh: [] }
        }
      };

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result.oauth2).toEqual({
        grantType: 'client_credentials',
        accessTokenUrl: 'https://request.com/token',
        refreshTokenUrl: 'https://request.com/refresh',
        clientId: 'request-client',
        clientSecret: 'request-secret',
        scope: 'read',
        credentialsPlacement: 'body',
        credentialsId: 'request-credentials',
        tokenPlacement: 'header',
        tokenHeaderPrefix: 'Bearer',
        tokenQueryKey: 'access_token',
        autoFetchToken: true,
        autoRefreshToken: true,
        additionalParameters: { authorization: [], token: [], refresh: [] }
      });
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle missing collection auth gracefully', () => {
      mockCollectionRoot.request.auth = null;
      mockRequest.auth = {
        mode: 'basic',
        basic: {
          username: 'testuser',
          password: 'testpass'
        }
      };

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result.basicAuth).toEqual({
        username: 'testuser',
        password: 'testpass'
      });
    });

    test('should handle missing request auth gracefully', () => {
      mockRequest.auth = null;

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result).toBe(mockAxiosRequest);
      expect(result.headers).toEqual({});
    });

    test('should handle missing auth mode gracefully', () => {
      mockRequest.auth = {};

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result).toBe(mockAxiosRequest);
      expect(result.headers).toEqual({});
    });

    test('should handle unknown auth mode gracefully', () => {
      mockRequest.auth = {
        mode: 'unknown'
      };

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result).toBe(mockAxiosRequest);
      expect(result.headers).toEqual({});
    });

    test('should handle missing OAuth2 grant type gracefully', () => {
      mockRequest.auth = {
        mode: 'oauth2',
        oauth2: {}
      };

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result).toBe(mockAxiosRequest);
      expect(result.oauth2).toBeUndefined();
    });

    test('should handle unknown OAuth2 grant type gracefully', () => {
      mockRequest.auth = {
        mode: 'oauth2',
        oauth2: {
          grantType: 'unknown_grant'
        }
      };

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result).toBe(mockAxiosRequest);
      expect(result.oauth2).toBeUndefined();
    });

    test('should return the modified axiosRequest object', () => {
      mockRequest.auth = {
        mode: 'bearer',
        bearer: {
          token: 'test-token'
        }
      };

      const result = setAuthHeaders(mockAxiosRequest, mockRequest, mockCollectionRoot);

      expect(result).toBe(mockAxiosRequest);
      expect(result.headers['Authorization']).toBe('Bearer test-token');
    });
  });
});
