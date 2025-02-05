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
        expect(result.auth).toEqual(expected);
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

    describe('No Authentication', () => {
      it('If request does not have auth configured', async () => {
        delete item.request.auth;
        let result;
        expect(async () => {
          result = await prepareRequest(item, collection);
        }).not.toThrow();
      });
    });
  });
});
