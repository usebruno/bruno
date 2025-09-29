const interpolateVars = require('../../src/ipc/network/interpolate-vars');

describe('interpolate-vars: interpolateVars', () => {
  describe('Interpolates string', () => {
    describe('With environment variables', () => {
      it("If there's a var with only alphanumeric characters in its name", async () => {
        const request = { method: 'GET', url: '{{testUrl1}}' };

        const result = interpolateVars(request, { testUrl1: 'test.com' }, null, null);
        expect(result.url).toEqual('test.com');
      });

      it("If there's a var with a '.' in its name", async () => {
        const request = { method: 'GET', url: '{{test.url}}' };

        const result = interpolateVars(request, { 'test.url': 'test.com' }, null, null);
        expect(result.url).toEqual('test.com');
      });

      it("If there's a var with a '-' in its name", async () => {
        const request = { method: 'GET', url: '{{test-url}}' };

        const result = interpolateVars(request, { 'test-url': 'test.com' }, null, null);
        expect(result.url).toEqual('test.com');
      });

      it("If there's a var with a '_' in its name", async () => {
        const request = { method: 'GET', url: '{{test_url}}' };

        const result = interpolateVars(request, { test_url: 'test.com' }, null, null);
        expect(result.url).toEqual('test.com');
      });

      it('If there are multiple variables', async () => {
        const body =
          '{\n  "firstElem": {{body-var-1}},\n  "secondElem": [{{body.var.2}}],\n  "thirdElem": {\n    "fourthElem": {{body_var_3}},\n    "{{varAsKey}}": {{valueForKey}} }}';
        const expectedBody =
          '{\n  "firstElem": Test1,\n  "secondElem": [Test2],\n  "thirdElem": {\n    "fourthElem": Test3,\n    "TestKey": TestValueForKey }}';

        const request = { method: 'POST', url: 'test', data: body, headers: { 'content-type': 'json' } };
        const result = interpolateVars(
          request,
          {
            'body-var-1': 'Test1',
            'body.var.2': 'Test2',
            body_var_3: 'Test3',
            varAsKey: 'TestKey',
            valueForKey: 'TestValueForKey'
          },
          null,
          null
        );
        expect(result.data).toEqual(expectedBody);
      });
    });

    describe('With path params', () => {
      it('keeps the original url search params as is', async () => {
        const request = {
          method: 'GET',
          url: 'http://example.com/:param/?search=hello world',
          pathParams: [
            {
              type: 'path',
              name: 'param',
              value: 'foobar'
            }
          ]
        };

        const result = interpolateVars(request, null, null, null);
        expect(result.url).toBe('http://example.com/foobar/?search=hello world');
      });

      it('keeps the original url search params as is even when url might not have protocl ', async () => {
        const request = {
          method: 'GET',
          url: 'example.com/:param/?search=hello world',
          pathParams: [
            {
              type: 'path',
              name: 'param',
              value: 'foobar'
            }
          ]
        };

        const result = interpolateVars(request, null, null, null);
        expect(result.url).toBe('http://example.com/foobar/?search=hello world');
      });

      it('keeps the original url search params as is even when encoded', async () => {
        const request = {
          method: 'GET',
          url: 'http://example.com/:param?search=hello%20world',
          pathParams: [
            {
              type: 'path',
              name: 'param',
              value: 'foobar'
            }
          ]
        };

        const result = interpolateVars(request, null, null, null);
        expect(result.url).toBe('http://example.com/foobar?search=hello%20world');
      });

      it('keeps the original url search params as is with edge cases', async () => {
        const requestOne = {
          method: 'GET',
          url: 'https://example.com/:param?x=1#section',
          pathParams: [
            {
              type: 'path',
              name: 'param',
              value: 'foobar'
            }
          ]
        };

        const requestTwo = {
          method: 'GET',
          url: 'https://example.com/:param?x?y=2',
          pathParams: [
            {
              type: 'path',
              name: 'param',
              value: 'foobar'
            }
          ]
        };

        const resultOne = interpolateVars(requestOne, null, null, null);
        expect(resultOne.url).toBe('https://example.com/foobar?x=1#section');

        const resultTwo = interpolateVars(requestTwo, null, null, null);
        expect(resultTwo.url).toBe('https://example.com/foobar?x?y=2');
      });

      it('keeps the original url even without search', async () => {
        const request = {
          method: 'GET',
          url: 'http://example.com/:param',
          pathParams: [
            {
              type: 'path',
              name: 'param',
              value: 'foobar'
            }
          ]
        };

        const result = interpolateVars(request, null, null, null);
        expect(result.url).toBe('http://example.com/foobar');
      });

      it('updates the path with odata style params | smoke', async () => {
        const request = {
          method: 'GET',
          url: 'http://example.com/Category(\':CategoryID\')/Item(:ItemId)/:xpath/Tags("tag test")',
          pathParams: [
            {
              type: 'path',
              name: 'CategoryID',
              value: 'foobar',
            },
            {
              type: 'path',
              name: 'ItemId',
              value: 1,
            },
            {
              type: 'path',
              name: 'xpath',
              value: 'foobar',
            },
          ],
        };

        const result = interpolateVars(request, null, null, null);
        expect(result.url).toBe('http://example.com/Category(\'foobar\')/Item(1)/foobar/Tags(%22tag%20test%22)');
      });
    });

    describe('With process environment variables', () => {
      /*
       * It should NOT turn process env vars into literal segments.
       * Otherwise, Handlebars will try to access the var literally
       */
      it("If there's a var that starts with 'process.env.'", async () => {
        const request = { method: 'GET', url: '{{process.env.TEST_VAR}}' };

        const result = interpolateVars(request, null, null, { TEST_VAR: 'test.com' });
        expect(result.url).toEqual('test.com');
      });
    });

    describe('With gRPC requests and all variable types', () => {
      it('Should interpolate collection variables, global environment variables, etc. in gRPC requests', async () => {
        const request = { 
          method: '/random.Service/randomMethod', 
          url: '{{baseUrl}}/{{service}}/{{method}}',
          mode: 'grpc',
          body: {
            json: '{"message": "{{message}}", "id": {{id}}}'
          },
          // Set variable properties on the request object
          globalEnvironmentVariables: {},
          collectionVariables: { service: 'greeter' },
          folderVariables: { method: 'SayHello' },
          requestVariables: { message: 'Hello World' },
          oauth2CredentialVariables: {}
        };

        const result = interpolateVars(
          request,
          { baseUrl: 'grpc://localhost:50051' }, // envVars
          { id: 123 }, // runtimeVariables
          {} // processEnvVars
        );

        expect(result.url).toEqual('grpc://localhost:50051/greeter/SayHello');
        expect(result.body.json).toEqual('{"message": "Hello World", "id": 123}');
      });

      it('Should handle gRPC requests with global environment variables', async () => {
        const request = { 
          method: '/random.Service/randomMethod', 
          url: '{{globalBaseUrl}}/{{service}}',
          mode: 'grpc',
          body: {
            json: '{"token": "{{globalToken}}"}'
          },
          // Set variable properties on the request object
          globalEnvironmentVariables: { globalBaseUrl: 'grpcs://api.example.com', globalToken: 'abc123' },
          collectionVariables: { service: 'auth' },
          folderVariables: {},
          requestVariables: {},
          oauth2CredentialVariables: {}
        };

        const result = interpolateVars(
          request,
          {}, // envVars
          {}, // runtimeVariables
          {} // processEnvVars
        );

        expect(result.url).toEqual('grpcs://api.example.com/auth');
        expect(result.body.json).toEqual('{"token": "abc123"}');
      });
    });
  });

  describe('Does NOT interpolate string', () => {
    describe('With environment variables', () => {
      it("If it's not a var (no braces)", async () => {
        const request = { method: 'GET', url: 'test' };

        const result = interpolateVars(request, { 'test.url': 'test.com' }, null, null);
        expect(result.url).toEqual('test');
      });

      it("If it's not a var (only 1 set of braces)", async () => {
        const request = { method: 'GET', url: '{test.url}' };

        const result = interpolateVars(request, { 'test.url': 'test.com' }, null, null);
        expect(result.url).toEqual('{test.url}');
      });

      it("If it's not a var (1 opening & 2 closing braces)", async () => {
        const request = { method: 'GET', url: '{test.url}}' };

        const result = interpolateVars(request, { 'test.url': 'test.com' }, null, null);
        expect(result.url).toEqual('{test.url}}');
      });

      it('If there are no variables (multiple)', async () => {
        let gqlBody = `{"query":"mutation {\\n  test(input: { native: { firstElem: \\"{should-not-get-interpolated}\\", secondElem: \\"{should-not-get-interpolated}}"}}) {\\n    __typename\\n    ... on TestType {\\n      id\\n      identifier\\n    }\\n  }\\n}","variables":"{}"}`;

        const request = { method: 'POST', url: 'test', data: gqlBody };
        const result = interpolateVars(request, { 'should-not-get-interpolated': 'ERROR' }, null, null);
        expect(result.data).toEqual(gqlBody);
      });
    });
  });

  describe('Handles content-type header set to false', () => {
    it('Should result empty data', async () => {
      const request = { method: 'POST', url: 'test', data: undefined, headers: { 'content-type': false } };

      const result = interpolateVars(request, { 'test.url': 'test.com' }, null, null);
      expect(result.data).toEqual(undefined);
    });
  });
});
