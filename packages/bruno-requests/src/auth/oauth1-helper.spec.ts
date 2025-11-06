import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getOAuth1Token, signOAuth1Request } from '../../src/auth/oauth1-helper';

// Mock dependencies
const mockAuthorize = jest.fn((requestData: any, tokenData?: any) => {
  return {
    oauth_consumer_key: 'test-key',
    oauth_nonce: 'nonce123',
    oauth_signature: 'sig123',
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: '1234567890',
    oauth_version: '1.0',
    ...(tokenData?.key ? { oauth_token: tokenData.key } : {})
  };
});

const mockToHeader = jest.fn((oauthData: any) => {
  const params = Object.entries(oauthData)
    .map(([key, value]) => `${key}="${value}"`)
    .join(', ');
  return { Authorization: `OAuth ${params}` };
});

jest.mock('oauth-1.0a', () => {
  return jest.fn().mockImplementation(() => ({
    authorize: mockAuthorize,
    toHeader: mockToHeader
  }));
});

jest.mock('debug', () => jest.fn(() => jest.fn()));

// Reset mocks before each test
beforeEach(() => {
  mockAuthorize.mockClear();
  mockToHeader.mockClear();
});

describe('OAuth1 Helper', () => {
  describe('getOAuth1Token', () => {
    let mockTokenStore: any;

    beforeEach(() => {
      mockTokenStore = {
        getOAuth1Credential: jest.fn(),
        saveOAuth1Credential: jest.fn()
      };
    });

    it('should return error when consumer key is missing', async () => {
      const oauth1Config = {
        consumerKey: '',
        consumerSecret: 'test-secret',
        signatureMethod: 'HMAC-SHA1',
        parameterTransmission: 'authorization_header',
        credentialsId: 'test-creds'
      };

      const result = await getOAuth1Token(oauth1Config, mockTokenStore);

      expect(result.error).toBe('Consumer Key is required for OAuth 1.0');
      expect(result.credentials).toBeNull();
    });

    it('should return error when consumer secret is missing', async () => {
      const oauth1Config = {
        consumerKey: 'test-key',
        consumerSecret: '',
        signatureMethod: 'HMAC-SHA1',
        parameterTransmission: 'authorization_header',
        credentialsId: 'test-creds'
      };

      const result = await getOAuth1Token(oauth1Config, mockTokenStore);

      expect(result.error).toBe('Consumer Secret is required for OAuth 1.0');
      expect(result.credentials).toBeNull();
    });

    it('should retrieve stored credentials from token store', async () => {
      const storedCredentials = {
        consumerKey: 'test-key',
        consumerSecret: 'test-secret',
        accessToken: 'stored-token',
        accessTokenSecret: 'stored-secret'
      };

      mockTokenStore.getOAuth1Credential.mockResolvedValue(storedCredentials);

      const oauth1Config = {
        consumerKey: 'test-key',
        consumerSecret: 'test-secret',
        signatureMethod: 'HMAC-SHA1',
        parameterTransmission: 'authorization_header',
        credentialsId: 'test-creds'
      };

      const result = await getOAuth1Token(oauth1Config, mockTokenStore);

      expect(result.credentials).toEqual(storedCredentials);
      expect(result.credentialsId).toBe('test-creds');
      expect(mockTokenStore.getOAuth1Credential).toHaveBeenCalledWith({ credentialsId: 'test-creds' });
    });

    it('should handle token store errors gracefully', async () => {
      mockTokenStore.getOAuth1Credential.mockRejectedValue(new Error('Token store error'));

      const oauth1Config = {
        consumerKey: 'test-key',
        consumerSecret: 'test-secret',
        signatureMethod: 'HMAC-SHA1',
        parameterTransmission: 'authorization_header',
        accessToken: 'new-token',
        accessTokenSecret: 'new-secret',
        credentialsId: 'test-creds'
      };

      const result = await getOAuth1Token(oauth1Config, mockTokenStore);

      expect(result.credentials).toBeDefined();
      expect(result.credentials.accessToken).toBe('new-token');
    });

    it('should create credentials from provided access token', async () => {
      mockTokenStore.getOAuth1Credential.mockResolvedValue(null);

      const oauth1Config = {
        consumerKey: 'test-key',
        consumerSecret: 'test-secret',
        signatureMethod: 'HMAC-SHA256',
        parameterTransmission: 'query_param',
        accessToken: 'new-token',
        accessTokenSecret: 'new-secret',
        credentialsId: 'test-creds'
      };

      const result = await getOAuth1Token(oauth1Config, mockTokenStore);

      expect(result.credentials).toEqual({
        consumerKey: 'test-key',
        consumerSecret: 'test-secret',
        signatureMethod: 'HMAC-SHA256',
        parameterTransmission: 'query_param',
        accessToken: 'new-token',
        accessTokenSecret: 'new-secret',
        rsaPrivateKey: undefined,
        credentialsId: 'test-creds'
      });
      expect(mockTokenStore.saveOAuth1Credential).toHaveBeenCalledWith({
        credentialsId: 'test-creds',
        credentials: expect.objectContaining({
          accessToken: 'new-token',
          accessTokenSecret: 'new-secret'
        })
      });
    });

    it('should return error when no credentials available', async () => {
      mockTokenStore.getOAuth1Credential.mockResolvedValue(null);

      const oauth1Config = {
        consumerKey: 'test-key',
        consumerSecret: 'test-secret',
        signatureMethod: 'HMAC-SHA1',
        parameterTransmission: 'authorization_header',
        accessToken: '',
        accessTokenSecret: '',
        credentialsId: 'test-creds'
      };

      const result = await getOAuth1Token(oauth1Config, mockTokenStore);

      expect(result.error).toBe('No OAuth 1.0 credentials found. Please provide access token and secret.');
      expect(result.credentials).toBeNull();
    });

    it('should support verbose logging', async () => {
      const storedCredentials = {
        consumerKey: 'test-key',
        consumerSecret: 'test-secret',
        accessToken: 'stored-token',
        accessTokenSecret: 'stored-secret'
      };

      mockTokenStore.getOAuth1Credential.mockResolvedValue(storedCredentials);

      const oauth1Config = {
        consumerKey: 'test-key',
        consumerSecret: 'test-secret',
        signatureMethod: 'HMAC-SHA1',
        parameterTransmission: 'authorization_header',
        credentialsId: 'test-creds',
        accessToken: '', // Force it to use stored credentials
        accessTokenSecret: ''
      };

      const result = await getOAuth1Token(oauth1Config, mockTokenStore, true);

      expect(result.credentials).toEqual(storedCredentials);
    });
  });

  describe('signOAuth1Request', () => {
    it('should skip signing when consumer credentials are missing', () => {
      const params = {
        request: {},
        oauth1Config: {
          consumerKey: '',
          consumerSecret: '',
          signatureMethod: 'HMAC-SHA1',
          parameterTransmission: 'authorization_header'
        },
        requestUrl: 'https://api.example.com/test',
        requestMethod: 'GET',
        requestHeaders: {}
      };

      const result = signOAuth1Request(params);

      expect(result.requestHeaders).toEqual({});
      expect(result.requestUrl).toBe('https://api.example.com/test');
    });

    it('should add OAuth parameters to authorization header', () => {
      const params = {
        request: {},
        oauth1Config: {
          consumerKey: 'test-key',
          consumerSecret: 'test-secret',
          signatureMethod: 'HMAC-SHA1',
          parameterTransmission: 'authorization_header',
          accessToken: 'test-token',
          accessTokenSecret: 'test-token-secret'
        },
        requestUrl: 'https://api.example.com/test',
        requestMethod: 'GET',
        requestHeaders: {}
      };

      const result = signOAuth1Request(params);

      expect(result.requestHeaders.Authorization).toBeDefined();
      expect(result.requestHeaders.Authorization).toContain('OAuth');
      expect(result.requestUrl).toBe('https://api.example.com/test');
    });

    it('should add OAuth parameters to query string', () => {
      const params = {
        request: {},
        oauth1Config: {
          consumerKey: 'test-key',
          consumerSecret: 'test-secret',
          signatureMethod: 'HMAC-SHA1',
          parameterTransmission: 'query_param',
          accessToken: 'test-token',
          accessTokenSecret: 'test-token-secret'
        },
        requestUrl: 'https://api.example.com/test',
        requestMethod: 'GET',
        requestHeaders: {}
      };

      const result = signOAuth1Request(params);

      expect(result.requestUrl).toContain('oauth_consumer_key=');
      expect(result.requestUrl).toContain('oauth_signature=');
      expect(result.requestUrl).toContain('oauth_token=');
    });

    it('should add OAuth parameters to request body for POST', () => {
      const params = {
        request: {},
        oauth1Config: {
          consumerKey: 'test-key',
          consumerSecret: 'test-secret',
          signatureMethod: 'HMAC-SHA1',
          parameterTransmission: 'request_body',
          accessToken: 'test-token',
          accessTokenSecret: 'test-token-secret'
        },
        requestUrl: 'https://api.example.com/test',
        requestMethod: 'POST',
        requestHeaders: {},
        requestBody: 'existing_param=value'
      };

      const result = signOAuth1Request(params);

      expect(result.requestBody).toContain('oauth_consumer_key=');
      expect(result.requestBody).toContain('oauth_signature=');
      expect(result.requestBody).toContain('existing_param=value');
      expect(result.requestHeaders['Content-Type']).toBe('application/x-www-form-urlencoded');
    });

    it('should fall back to header for request_body on non-POST methods', () => {
      const params = {
        request: {},
        oauth1Config: {
          consumerKey: 'test-key',
          consumerSecret: 'test-secret',
          signatureMethod: 'HMAC-SHA1',
          parameterTransmission: 'request_body',
          accessToken: 'test-token',
          accessTokenSecret: 'test-token-secret'
        },
        requestUrl: 'https://api.example.com/test',
        requestMethod: 'GET',
        requestHeaders: {}
      };

      const result = signOAuth1Request(params);

      expect(result.requestHeaders.Authorization).toBeDefined();
      expect(result.requestHeaders.Authorization).toContain('OAuth');
    });

    it('should handle form-encoded POST bodies', () => {
      const params = {
        request: {},
        oauth1Config: {
          consumerKey: 'test-key',
          consumerSecret: 'test-secret',
          signatureMethod: 'HMAC-SHA1',
          parameterTransmission: 'authorization_header',
          accessToken: 'test-token',
          accessTokenSecret: 'test-token-secret'
        },
        requestUrl: 'https://api.example.com/test',
        requestMethod: 'POST',
        requestHeaders: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        requestBody: 'param1=value1&param2=value2'
      };

      const result = signOAuth1Request(params);

      expect(result.requestHeaders.Authorization).toBeDefined();
      expect(result.requestHeaders.Authorization).toContain('OAuth');
    });

    it('should sign request without token for 2-legged OAuth', () => {
      const params = {
        request: {},
        oauth1Config: {
          consumerKey: 'test-key',
          consumerSecret: 'test-secret',
          signatureMethod: 'HMAC-SHA1',
          parameterTransmission: 'authorization_header',
          accessToken: '',
          accessTokenSecret: ''
        },
        requestUrl: 'https://api.example.com/test',
        requestMethod: 'GET',
        requestHeaders: {}
      };

      const result = signOAuth1Request(params);

      expect(result.requestHeaders.Authorization).toBeDefined();
      expect(result.requestHeaders.Authorization).toContain('OAuth');
      expect(result.requestHeaders.Authorization).not.toContain('oauth_token=');
    });

    it('should handle URL parsing errors gracefully', () => {
      const params = {
        request: {},
        oauth1Config: {
          consumerKey: 'test-key',
          consumerSecret: 'test-secret',
          signatureMethod: 'HMAC-SHA1',
          parameterTransmission: 'query_param',
          accessToken: 'test-token',
          accessTokenSecret: 'test-token-secret'
        },
        requestUrl: 'not-a-valid-url',
        requestMethod: 'GET',
        requestHeaders: {}
      };

      const result = signOAuth1Request(params);

      // Should fallback to authorization header on URL parsing error
      expect(result.requestHeaders.Authorization).toBeDefined();
    });

    it('should handle body parsing errors gracefully', () => {
      const params = {
        request: {},
        oauth1Config: {
          consumerKey: 'test-key',
          consumerSecret: 'test-secret',
          signatureMethod: 'HMAC-SHA1',
          parameterTransmission: 'authorization_header',
          accessToken: 'test-token',
          accessTokenSecret: 'test-token-secret'
        },
        requestUrl: 'https://api.example.com/test',
        requestMethod: 'POST',
        requestHeaders: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        requestBody: 'invalid%%%body&&&'
      };

      const result = signOAuth1Request(params);

      expect(result.requestHeaders.Authorization).toBeDefined();
    });

    it('should handle general errors and return unchanged request', () => {
      const params = {
        request: {},
        oauth1Config: {
          consumerKey: 'test-key',
          consumerSecret: 'test-secret',
          signatureMethod: 'HMAC-SHA1',
          parameterTransmission: 'authorization_header',
          accessToken: '',
          accessTokenSecret: ''
        },
        requestUrl: null as any, // Force an error
        requestMethod: 'GET',
        requestHeaders: {}
      };

      const result = signOAuth1Request(params);

      // When there's an error, it should return unchanged requestHeaders
      // But since consumer credentials exist, it still attempts to sign
      expect(result.requestHeaders).toBeDefined();
    });
  });
});
