const { describe, it, expect, beforeEach } = require('@jest/globals');
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
    it('reads the uploaded file and applies correct headers', async () => {
      const fsPromises = require('node:fs/promises');
      // Mock fs.readFile to avoid actual file system dependency
      jest.spyOn(fsPromises, 'readFile').mockResolvedValue(Buffer.from('dummy file content'));

      const body = {
        mode: 'file',
        file: [
          {
            contentType: 'text/plain',
            filePath: '/absolute/path/to/file.txt',
            selected: true,
          },
        ],
      };

      const item = {
        name: 'File Request',
        type: 'http-request',
        request: {
          method: 'POST',
          headers: [],
          params: [],
          url: 'https://example.com/upload',
          body,
        },
      };

      const result = await prepareRequest(item);
      expect(result.data).toBeInstanceOf(Buffer);
      expect(result.headers['content-type']).toBe('text/plain');
    });
  });
});
