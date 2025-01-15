const { describe, it, expect } = require('@jest/globals');

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
    let collectionRoot, request;

    beforeEach(() => {
      // Reset test fixtures
      collectionRoot = {
        request: {
          auth: {}
        }
      };

      request = {
        url: 'https://www.usebruno.com',
        auth: {
          mode: "inherit"
        },
        body: {
          mode: 'json',
          json: '{\n"test": {{someVar}} // comment\n}'
        }
      };
    });

    it('If collection auth is apikey in header', () => {
      collectionRoot.request.auth = {
        mode: "apikey",
        apikey: {
          key: "x-api-key",
          value: "{{apiKey}}",
          placement: "header"
        }
      };

      const result = prepareRequest(request, collectionRoot);
      expect(result.headers).toHaveProperty('x-api-key', '{{apiKey}}');
    });


    it('If collection auth is apikey in header and request has existing headers', () => {
      collectionRoot.request.auth = {
        mode: "apikey",
        apikey: {
          key: "x-api-key",
          value: "{{apiKey}}",
          placement: "header"
        }
      };
      
      request['headers'] = [{ name: 'Content-Type', value: 'application/json', enabled: true }];

      const result = prepareRequest(request, collectionRoot);
      expect(result.headers).toHaveProperty('Content-Type', 'application/json');
      expect(result.headers).toHaveProperty('x-api-key', '{{apiKey}}');
    });

    it('If collection auth is apikey in query parameters', () => {
      collectionRoot.request.auth = {
        mode: "apikey",
        apikey: {
          key: "apiKey",
          value: "{{apiKey}}",
          placement: "queryparams"
        }
      };

      const expected = `${request.url}?${collectionRoot.request.auth.apikey.key}=${collectionRoot.request.auth.apikey.value}`;
      const result = prepareRequest(request, collectionRoot);
      expect(result.url).toEqual(expected);
    });

    it('If request does not have auth configured', () => {
      delete request.auth;
      let result;
      expect(() => {
        result = prepareRequest(request, collectionRoot);
      }).not.toThrow();
      expect(result).toBeDefined();
    });

    it('If collection auth is basic auth', () => {
      collectionRoot.request.auth = {
        mode: 'basic',
        basic: {
          username: 'testUser',
          password: 'testPass123'
        }
      };

      const result = prepareRequest(request, collectionRoot);
      const expected = { username: 'testUser', password: 'testPass123' };
      expect(result.auth).toEqual(expected);
    });

    it('If collection auth is bearer token', () => {
      collectionRoot.request.auth = {
        mode: 'bearer',
        bearer: {
          token: 'token'
        }
      };

      const result = prepareRequest(request, collectionRoot);
      expect(result.headers).toHaveProperty('Authorization', 'Bearer token');
    });

    it('If collection auth is bearer token and request has existing headers', () => {
      collectionRoot.request.auth = {
        mode: 'bearer',
        bearer: {
          token: 'token'
        }
      };

      request['headers'] = [{ name: 'Content-Type', value: 'application/json', enabled: true }];

      const result = prepareRequest(request, collectionRoot);
      expect(result.headers).toHaveProperty('Authorization', 'Bearer token');
      expect(result.headers).toHaveProperty('Content-Type', 'application/json');
    });
  });
});
