const { describe, it, expect, beforeEach } = require('@jest/globals');
const prepareRequest = require('../../src/runner/prepare-request');

describe('prepare-request: prepareRequest', () => {
  describe('Decomments request body', () => {
    it('If request body is valid JSON', async () => {
      const body = { mode: 'json', json: '{\n"test": "{{someVar}}" // comment\n}' };
      const expected = `{
\"test\": \"{{someVar}}\" 
}`;
      const result = prepareRequest({ request: { body } });
      expect(result.data).toEqual(expected);
    });

    it('If request body is not valid JSON', async () => {
      const body = { mode: 'json', json: '{\n"test": {{someVar}} // comment\n}' };
      const expected = `{
\"test\": {{someVar}} 
}`;
      const result = prepareRequest({ request: { body } });
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
      it('If collection auth is apikey in header', () => {
        collection.root.request.auth = {
          mode: "apikey",
          apikey: {
            key: "x-api-key",
            value: "{{apiKey}}",
            placement: "header"
          }
        };

        const result = prepareRequest(item, collection);
        expect(result.headers).toHaveProperty('x-api-key', '{{apiKey}}');
      });

      it('If collection auth is apikey in header and request has existing headers', () => {
        collection.root.request.auth = {
          mode: "apikey",
          apikey: {
            key: "x-api-key",
            value: "{{apiKey}}",
            placement: "header"
          }
        };

        item.request.headers.push({ name: 'Content-Type', value: 'application/json', enabled: true });
        const result = prepareRequest(item, collection);
        expect(result.headers).toHaveProperty('Content-Type', 'application/json');
        expect(result.headers).toHaveProperty('x-api-key', '{{apiKey}}');
      });

      it('If collection auth is apikey in query parameters', () => {
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
        const result = prepareRequest(item, collection);
        expect(result.url).toEqual(expected);
      });
    });

    describe('Basic Authentication', () => {
      it('If collection auth is basic auth', () => {
        collection.root.request.auth = {
          mode: 'basic',
          basic: {
            username: 'testUser',
            password: 'testPass123'
          }
        };

        const result = prepareRequest(item, collection);
        const expected = { username: 'testUser', password: 'testPass123' };
        expect(result.basicAuth).toEqual(expected);
      });
    });

    describe('Bearer Token Authentication', () => {
      it('If collection auth is bearer token', () => {
        collection.root.request.auth = {
          mode: 'bearer',
          bearer: {
            token: 'token'
          }
        };

        const result = prepareRequest(item, collection);
        expect(result.headers).toHaveProperty('Authorization', 'Bearer token');
      });

      it('If collection auth is bearer token and request has existing headers', () => {
        collection.root.request.auth = {
          mode: 'bearer',
          bearer: {
            token: 'token'
          }
        };

        item.request.headers.push({ name: 'Content-Type', value: 'application/json', enabled: true });

        const result = prepareRequest(item, collection);
        expect(result.headers).toHaveProperty('Authorization', 'Bearer token');
        expect(result.headers).toHaveProperty('Content-Type', 'application/json');
      });
    });

    describe('OAuth2 Authentication', () => {
      it('If collection auth is OAuth2 with client credentials grant type', () => {
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

        const result = prepareRequest(item, collection);
        
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

      it('If collection auth is OAuth2 with password grant type', () => {
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

        const result = prepareRequest(item, collection);
        
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

    describe('No Authentication', () => {
      it('If request does not have auth configured', () => {
        delete item.request.auth;
        let result;
        expect(() => {
          result = prepareRequest(item, collection);
        }).not.toThrow();
        expect(result).toBeDefined();
      });
    });
  });
});
