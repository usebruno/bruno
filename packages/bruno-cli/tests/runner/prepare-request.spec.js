const { describe, it, expect, beforeEach } = require('@jest/globals');
jest.mock('../../src/utils/filesystem', () => ({
  isLargeFile: jest.fn()
}));
const filesystemUtils = require('../../src/utils/filesystem');
const prepareRequest = require('../../src/runner/prepare-request');

describe('prepare-request: prepareRequest', () => {
  describe('Decomments request body', () => {
    it('If request body is valid JSON', async () => {
      const body = { mode: 'json', json: '{\n"test": "{{someVar}}" // comment\n}' };
      const expected = `{
\"test\": \"{{someVar}}\" 
}`;
      const result = await prepareRequest({ request: { body } });
      expect(result.data).toEqual(expected);
    });

    it('If request body is not valid JSON', async () => {
      const body = { mode: 'json', json: '{\n"test": {{someVar}} // comment\n}' };
      const expected = `{
\"test\": {{someVar}} 
}`;
      const result = await prepareRequest({ request: { body } });
      expect(result.data).toEqual(expected);
    });
  });

  describe('Properly maps inherited auth from collectionRoot', () => {
    // Initialize Test Fixtures
    let collection, item;

    beforeEach(() => {
      collection = {
        name: 'Test Collection',
        root: {
          request: {
            auth: {}
          }
        }
      };

      item = {
        name: 'Test Request',
        type: 'http-request',
        request: {
          method: 'GET',
          headers: [],
          params: [],
          url: 'https://usebruno.com',
          auth: {
            mode: 'inherit'
          },
          script: {
            req: 'console.log("Pre Request")',
            res: 'console.log("Post Response")'
          }
        }
      };
    });

    describe('API Key Authentication', () => {
      it('If collection auth is apikey in header', async () => {
        collection.root.request.auth = {
          mode: "apikey",
          apikey: {
            key: "x-api-key",
            value: "{{apiKey}}",
            placement: "header"
          }
        };

        const result = await prepareRequest(item, collection);
        expect(result.headers).toHaveProperty('x-api-key', '{{apiKey}}');
      });

      it('If collection auth is apikey in header and request has existing headers', async () => {
        collection.root.request.auth = {
          mode: "apikey",
          apikey: {
            key: "x-api-key",
            value: "{{apiKey}}",
            placement: "header"
          }
        };

        item.request.headers.push({ name: 'Content-Type', value: 'application/json', enabled: true });
        const result = await prepareRequest(item, collection);
        expect(result.headers).toHaveProperty('Content-Type', 'application/json');
        expect(result.headers).toHaveProperty('x-api-key', '{{apiKey}}');
      });

      it('If collection auth is apikey in query parameters', async () => {
        collection.root.request.auth = {
          mode: "apikey",
          apikey: {
            key: "x-api-key",
            value: "{{apiKey}}",
            placement: "queryparams"
          }
        };

        const urlObj = new URL(item.request.url);
        urlObj.searchParams.set(collection.root.request.auth.apikey.key, collection.root.request.auth.apikey.value);

        const expected = urlObj.toString();
        const result = await prepareRequest(item, collection);
        expect(result.url).toEqual(expected);
      });
    });

    describe('Basic Authentication', () => {
      it('If collection auth is basic auth', async () => {
        collection.root.request.auth = {
          mode: 'basic',
          basic: {
            username: 'testUser',
            password: 'testPass123'
          }
        };

        const result = await prepareRequest(item, collection);
        const expected = { username: 'testUser', password: 'testPass123' };
        expect(result.basicAuth).toEqual(expected);
      });
    });

    describe('Bearer Token Authentication', () => {
      it('If collection auth is bearer token', async () => {
        collection.root.request.auth = {
          mode: 'bearer',
          bearer: {
            token: 'token'
          }
        };

        const result = await prepareRequest(item, collection);
        expect(result.headers).toHaveProperty('Authorization', 'Bearer token');
      });

      it('If collection auth is bearer token and request has existing headers', async () => {
        collection.root.request.auth = {
          mode: 'bearer',
          bearer: {
            token: 'token'
          }
        };

        item.request.headers.push({ name: 'Content-Type', value: 'application/json', enabled: true });

        const result = await prepareRequest(item, collection);
        expect(result.headers).toHaveProperty('Authorization', 'Bearer token');
        expect(result.headers).toHaveProperty('Content-Type', 'application/json');
      });
    });

    describe('OAuth2 Authentication', () => {
      it('If collection auth is OAuth2 with client credentials grant type', async () => {
        collection.root.request.auth = {
          mode: 'oauth2',
          oauth2: {
            grantType: 'client_credentials',
            accessTokenUrl: 'https://auth.example.com/token',
            clientId: 'test_client_id',
            clientSecret: 'test_client_secret',
            scope: 'read write',
            credentialsPlacement: 'header',
            tokenPlacement: 'header',
            tokenHeaderPrefix: 'Bearer',
            tokenQueryKey: 'access_token'
          }
        };

        const result = await prepareRequest(item, collection);
        
        expect(result.oauth2).toBeDefined();
        expect(result.oauth2.grantType).toBe('client_credentials');
        expect(result.oauth2.accessTokenUrl).toBe('https://auth.example.com/token');
        expect(result.oauth2.clientId).toBe('test_client_id');
        expect(result.oauth2.clientSecret).toBe('test_client_secret');
        expect(result.oauth2.scope).toBe('read write');
        expect(result.oauth2.credentialsPlacement).toBe('header');
        expect(result.oauth2.tokenPlacement).toBe('header');
        expect(result.oauth2.tokenHeaderPrefix).toBe('Bearer');
        expect(result.oauth2.tokenQueryKey).toBe('access_token');
      });

      it('If collection auth is OAuth2 with password grant type', async () => {
        collection.root.request.auth = {
          mode: 'oauth2',
          oauth2: {
            grantType: 'password',
            accessTokenUrl: 'https://auth.example.com/token',
            username: 'test_user',
            password: 'test_password',
            clientId: 'test_client_id',
            clientSecret: 'test_client_secret',
            scope: 'read write',
            credentialsPlacement: 'body',
            tokenPlacement: 'url',
            tokenHeaderPrefix: 'Bearer',
            tokenQueryKey: 'access_token'
          }
        };

        const result = await prepareRequest(item, collection);
        
        expect(result.oauth2).toBeDefined();
        expect(result.oauth2.grantType).toBe('password');
        expect(result.oauth2.accessTokenUrl).toBe('https://auth.example.com/token');
        expect(result.oauth2.username).toBe('test_user');
        expect(result.oauth2.password).toBe('test_password');
        expect(result.oauth2.clientId).toBe('test_client_id');
        expect(result.oauth2.clientSecret).toBe('test_client_secret');
        expect(result.oauth2.scope).toBe('read write');
        expect(result.oauth2.credentialsPlacement).toBe('body');
        expect(result.oauth2.tokenPlacement).toBe('url');
        expect(result.oauth2.tokenHeaderPrefix).toBe('Bearer');
        expect(result.oauth2.tokenQueryKey).toBe('access_token');
      });
    });

    describe('OAuth1 Authentication', () => {
      it('If collection auth is OAuth1 with HMAC-SHA1', async () => {
        collection.root.request.auth = {
          mode: 'oauth1',
          oauth1: {
            consumerKey: 'test-consumer-key',
            consumerSecret: 'test-consumer-secret',
            signatureMethod: 'HMAC-SHA1',
            parameterTransmission: 'authorization_header',
            accessToken: 'test-access-token',
            accessTokenSecret: 'test-access-token-secret',
            credentialsId: 'test-credentials'
          }
        };

        const result = await prepareRequest(item, collection);

        expect(result.oauth1).toBeDefined();
        expect(result.oauth1.consumerKey).toBe('test-consumer-key');
        expect(result.oauth1.consumerSecret).toBe('test-consumer-secret');
        expect(result.oauth1.signatureMethod).toBe('HMAC-SHA1');
        expect(result.oauth1.parameterTransmission).toBe('authorization_header');
        expect(result.oauth1.accessToken).toBe('test-access-token');
        expect(result.oauth1.accessTokenSecret).toBe('test-access-token-secret');
        expect(result.oauth1.credentialsId).toBe('test-credentials');
      });

      it('If collection auth is OAuth1 with RSA-SHA256', async () => {
        collection.root.request.auth = {
          mode: 'oauth1',
          oauth1: {
            consumerKey: 'rsa-consumer-key',
            consumerSecret: 'rsa-consumer-secret',
            signatureMethod: 'RSA-SHA256',
            parameterTransmission: 'query_param',
            rsaPrivateKey: '-----BEGIN PRIVATE KEY-----\ntest-rsa-key\n-----END PRIVATE KEY-----',
            requestTokenUrl: 'https://api.example.com/request_token',
            authorizeUrl: 'https://api.example.com/authorize',
            accessTokenUrl: 'https://api.example.com/access_token',
            callbackUrl: 'https://example.com/callback',
            accessToken: 'rsa-access-token',
            accessTokenSecret: 'rsa-access-token-secret',
            credentialsId: 'rsa-credentials'
          }
        };

        const result = await prepareRequest(item, collection);

        expect(result.oauth1).toBeDefined();
        expect(result.oauth1.signatureMethod).toBe('RSA-SHA256');
        expect(result.oauth1.parameterTransmission).toBe('query_param');
        expect(result.oauth1.rsaPrivateKey).toBe('-----BEGIN PRIVATE KEY-----\ntest-rsa-key\n-----END PRIVATE KEY-----');
        expect(result.oauth1.requestTokenUrl).toBe('https://api.example.com/request_token');
        expect(result.oauth1.authorizeUrl).toBe('https://api.example.com/authorize');
        expect(result.oauth1.accessTokenUrl).toBe('https://api.example.com/access_token');
        expect(result.oauth1.callbackUrl).toBe('https://example.com/callback');
      });

      it('If collection auth is OAuth1 with PLAINTEXT', async () => {
        collection.root.request.auth = {
          mode: 'oauth1',
          oauth1: {
            consumerKey: 'plaintext-key',
            consumerSecret: 'plaintext-secret',
            signatureMethod: 'PLAINTEXT',
            parameterTransmission: 'request_body',
            accessToken: 'plaintext-token',
            accessTokenSecret: 'plaintext-secret',
            credentialsId: 'plaintext-creds'
          }
        };

        const result = await prepareRequest(item, collection);

        expect(result.oauth1).toBeDefined();
        expect(result.oauth1.signatureMethod).toBe('PLAINTEXT');
        expect(result.oauth1.parameterTransmission).toBe('request_body');
        expect(result.oauth1.consumerKey).toBe('plaintext-key');
        expect(result.oauth1.consumerSecret).toBe('plaintext-secret');
      });
    });

    describe('AWS v4 Authentication', () => {
      it('If collection auth is AWS v4', async () => {
        collection.root.request.auth = {
          mode: 'awsv4',
          awsv4: {
            accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
            secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            sessionToken: 'session-token',
            service: 's3',
            region: 'us-west-2',
            profileName: 'default'
          }
        };

        const result = await prepareRequest(item, collection);
        const expected = {
          accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          sessionToken: 'session-token',
          service: 's3',
          region: 'us-west-2',
          profileName: 'default'
        };
        expect(result.awsv4config).toEqual(expected);
      });
    });

    describe('NTLM Authentication', () => {
      it('If collection auth is NTLM', async () => {
        collection.root.request.auth = {
          mode: 'ntlm',
          ntlm: {
            username: 'testUser',
            password: 'testPass123',
            domain: 'testDomain'
          }
        };

        const result = await prepareRequest(item, collection);
        const expected = {
          username: 'testUser',
          password: 'testPass123',
          domain: 'testDomain'
        };
        expect(result.ntlmConfig).toEqual(expected);
      });
    });

    describe('WSSE Authentication', () => {
      it('If collection auth is WSSE', async () => {
        collection.root.request.auth = {
          mode: 'wsse',
          wsse: {
            username: 'testUser',
            password: 'testPass123'
          }
        };

        const result = await prepareRequest(item, collection);
        expect(result.headers).toHaveProperty('X-WSSE');
        expect(result.headers['X-WSSE']).toContain('UsernameToken Username="testUser"');
        expect(result.headers['X-WSSE']).toContain('PasswordDigest="');
        expect(result.headers['X-WSSE']).toContain('Nonce="');
        expect(result.headers['X-WSSE']).toContain('Created="');
      });
    });

    describe('Digest Authentication', () => {
      it('If collection auth is digest auth', async () => {
        collection.root.request.auth = {
          mode: 'digest',
          digest: {
            username: 'testUser',
            password: 'testPass123'
          }
        };

        const result = await prepareRequest(item, collection);
        
        const expected = {
          username: 'testUser',
          password: 'testPass123'
        };
        expect(result.digestConfig).toEqual(expected);
      });
    });

    describe('No Authentication', () => {
      it('If request does not have auth configured', async () => {
        delete item.request.auth;
        let result;
        expect(() => {
          result = prepareRequest(item, collection);
        }).not.toThrow();
        expect(result).toBeDefined();
      });
    });
  });

  describe('Properly maps request-level auth', () => {
    let item;

    beforeEach(() => {
      item = {
        name: 'Test Request',
        type: 'http-request',
        request: {
          method: 'GET',
          headers: [],
          params: [],
          url: 'https://usebruno.com',
          auth: {
            mode: 'basic' // Will be overridden in each test
          },
          script: {
            req: 'console.log("Pre Request")',
            res: 'console.log("Post Response")'
          }
        }
      };
    });

    describe('API Key Authentication', () => {
      it('If request auth is apikey in header', async () => {
        item.request.auth = {
          mode: "apikey",
          apikey: {
            key: "x-api-key",
            value: "{{apiKey}}",
            placement: "header"
          }
        };

        const result = await prepareRequest(item);
        expect(result.headers).toHaveProperty('x-api-key', '{{apiKey}}');
      });

      it('If request auth is apikey in header and request has existing headers', async () => {
        item.request.auth = {
          mode: "apikey",
          apikey: {
            key: "x-api-key",
            value: "{{apiKey}}",
            placement: "header"
          }
        };

        item.request.headers.push({ name: 'Content-Type', value: 'application/json', enabled: true });
        const result = await prepareRequest(item);
        expect(result.headers).toHaveProperty('Content-Type', 'application/json');
        expect(result.headers).toHaveProperty('x-api-key', '{{apiKey}}');
      });

      it('If request auth is apikey in query parameters', async () => {
        item.request.auth = {
          mode: "apikey",
          apikey: {
            key: "x-api-key",
            value: "{{apiKey}}",
            placement: "queryparams"
          }
        };

        const urlObj = new URL(item.request.url);
        urlObj.searchParams.set(item.request.auth.apikey.key, item.request.auth.apikey.value);

        const expected = urlObj.toString();
        const result = await prepareRequest(item);
        expect(result.url).toEqual(expected);
      });
    });

    describe('Basic Authentication', () => {
      it('If request auth is basic auth', async () => {
        item.request.auth = {
          mode: 'basic',
          basic: {
            username: 'testUser',
            password: 'testPass123'
          }
        };

        const result = await prepareRequest(item);
        const expected = { username: 'testUser', password: 'testPass123' };
        expect(result.basicAuth).toEqual(expected);
      });
    });

    describe('Bearer Token Authentication', () => {
      it('If request auth is bearer token', async () => {
        item.request.auth = {
          mode: 'bearer',
          bearer: {
            token: 'token123'
          }
        };

        const result = await prepareRequest(item);
        expect(result.headers).toHaveProperty('Authorization', 'Bearer token123');
      });

      it('If request auth is bearer token and request has existing headers', async () => {
        item.request.auth = {
          mode: 'bearer',
          bearer: {
            token: 'token123'
          }
        };

        item.request.headers.push({ name: 'Content-Type', value: 'application/json', enabled: true });

        const result = await prepareRequest(item);
        expect(result.headers).toHaveProperty('Authorization', 'Bearer token123');
        expect(result.headers).toHaveProperty('Content-Type', 'application/json');
      });
    });

    describe('AWS v4 Authentication', () => {
      it('If request auth is AWS v4', async () => {
        item.request.auth = {
          mode: 'awsv4',
          awsv4: {
            accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
            secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            sessionToken: 'request-session-token',
            service: 'dynamodb',
            region: 'us-east-1',
            profileName: 'dev'
          }
        };

        const result = await prepareRequest(item);
        const expected = {
          accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          sessionToken: 'request-session-token',
          service: 'dynamodb',
          region: 'us-east-1',
          profileName: 'dev'
        };
        expect(result.awsv4config).toEqual(expected);
      });
    });

    describe('NTLM Authentication', () => {
      it('If request auth is NTLM', async () => {
        item.request.auth = {
          mode: 'ntlm',
          ntlm: {
            username: 'testUser',
            password: 'testPass123',
            domain: 'testDomain'
          }
        };

        const result = await prepareRequest(item);
        const expected = {
          username: 'testUser',
          password: 'testPass123',
          domain: 'testDomain'
        };
        expect(result.ntlmConfig).toEqual(expected);
      });
    });

    describe('WSSE Authentication', () => {
      it('If request auth is WSSE', async () => {
        item.request.auth = {
          mode: 'wsse',
          wsse: {
            username: 'requestUser',
            password: 'requestPass'
          }
        };

        const result = await prepareRequest(item);
        expect(result.headers).toHaveProperty('X-WSSE');
        expect(result.headers['X-WSSE']).toContain('UsernameToken Username="requestUser"');
        expect(result.headers['X-WSSE']).toContain('PasswordDigest="');
        expect(result.headers['X-WSSE']).toContain('Nonce="');
        expect(result.headers['X-WSSE']).toContain('Created="');
      });
    });

    describe('Digest Authentication', () => {
      it('If request auth is digest auth', async () => {
        item.request.auth = {
          mode: 'digest',
          digest: {
            username: 'requestUser',
            password: 'requestPass123'
          }
        };

        const result = await prepareRequest(item);
        const expected = {
          username: 'requestUser',
          password: 'requestPass123'
        };
        expect(result.digestConfig).toEqual(expected);
      });
    });
  });

  describe('Request file body mode', () => {
    const fs = require('node:fs');
    let readFileSyncSpy;
    let createReadStreamSpy;

    beforeEach(() => {
      readFileSyncSpy = jest.spyOn(fs, 'readFileSync');
      createReadStreamSpy = jest.spyOn(fs, 'createReadStream');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should use readFileSync to read small files', async () => {
      const fileContent = Buffer.from('small file content');
      filesystemUtils.isLargeFile.mockReturnValue(false);
      readFileSyncSpy.mockReturnValue(fileContent);

      const item = {
        name: 'File Request',
        type: 'http-request',
        request: {
          method: 'POST',
          headers: [],
          params: [],
          url: 'https://example.com/upload',
          body: {
            mode: 'file',
            file: [{
              contentType: 'text/plain',
              filePath: '/path/to/file.txt',
              selected: true
            }]
          }
        }
      };

      const result = await prepareRequest(item);

      expect(result.data).toBe(fileContent);
      expect(readFileSyncSpy).toHaveBeenCalled();
      expect(createReadStreamSpy).not.toHaveBeenCalled();
    });

    it('should use createReadStream to read large files', async () => {
      const mockStream = { pipe: jest.fn() };
      filesystemUtils.isLargeFile.mockReturnValue(true);
      createReadStreamSpy.mockReturnValue(mockStream);

      const item = {
        name: 'File Request',
        type: 'http-request',
        request: {
          method: 'POST',
          headers: [],
          params: [],
          url: 'https://example.com/upload',
          body: {
            mode: 'file',
            file: [{
              contentType: 'application/octet-stream',
              filePath: '/path/to/large-file.bin',
              selected: true
            }]
          }
        }
      };

      const result = await prepareRequest(item);

      expect(result.data).toBe(mockStream);
      expect(createReadStreamSpy).toHaveBeenCalled();
      expect(readFileSyncSpy).not.toHaveBeenCalled();
    });
  });
});
