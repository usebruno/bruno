const interpolateVars = require('../../src/ipc/network/interpolate-vars');

describe('interpolate-vars: interpolateVars', () => {
  describe('Interpolates string', () => {
    describe('With environment variables', () => {
      it('If there\'s a var with only alphanumeric characters in its name', async () => {
        const request = { method: 'GET', url: '{{testUrl1}}' };

        const result = interpolateVars(request, { testUrl1: 'test.com' }, null, null);
        expect(result.url).toEqual('test.com');
      });

      it('If there\'s a var with a \'.\' in its name', async () => {
        const request = { method: 'GET', url: '{{test.url}}' };

        const result = interpolateVars(request, { 'test.url': 'test.com' }, null, null);
        expect(result.url).toEqual('test.com');
      });

      it('If there\'s a var with a \'-\' in its name', async () => {
        const request = { method: 'GET', url: '{{test-url}}' };

        const result = interpolateVars(request, { 'test-url': 'test.com' }, null, null);
        expect(result.url).toEqual('test.com');
      });

      it('If there\'s a var with a \'_\' in its name', async () => {
        const request = { method: 'GET', url: '{{test_url}}' };

        const result = interpolateVars(request, { test_url: 'test.com' }, null, null);
        expect(result.url).toEqual('test.com');
      });

      it('If there are multiple variables', async () => {
        const body
          = '{\n  "firstElem": {{body-var-1}},\n  "secondElem": [{{body.var.2}}],\n  "thirdElem": {\n    "fourthElem": {{body_var_3}},\n    "{{varAsKey}}": {{valueForKey}} }}';
        const expectedBody
          = '{\n  "firstElem": Test1,\n  "secondElem": [Test2],\n  "thirdElem": {\n    "fourthElem": Test3,\n    "TestKey": TestValueForKey }}';

        const request = { method: 'POST', url: 'test', data: body, headers: { 'content-type': 'json' } };
        const result = interpolateVars(
          request,
          {
            'body-var-1': 'Test1',
            'body.var.2': 'Test2',
            'body_var_3': 'Test3',
            'varAsKey': 'TestKey',
            'valueForKey': 'TestValueForKey'
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
              value: 'foobar'
            },
            {
              type: 'path',
              name: 'ItemId',
              value: 1
            },
            {
              type: 'path',
              name: 'xpath',
              value: 'foobar'
            }
          ]
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
      it('If there\'s a var that starts with \'process.env.\'', async () => {
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
      it('If it\'s not a var (no braces)', async () => {
        const request = { method: 'GET', url: 'test' };

        const result = interpolateVars(request, { 'test.url': 'test.com' }, null, null);
        expect(result.url).toEqual('test');
      });

      it('If it\'s not a var (only 1 set of braces)', async () => {
        const request = { method: 'GET', url: '{test.url}' };

        const result = interpolateVars(request, { 'test.url': 'test.com' }, null, null);
        expect(result.url).toEqual('{test.url}');
      });

      it('If it\'s not a var (1 opening & 2 closing braces)', async () => {
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

  describe('Multipart body (multipart/form-data and multipart/mixed)', () => {
    it('interpolates value in each part when Content-Type is multipart/form-data', () => {
      const request = {
        method: 'POST',
        url: 'http://api.example/upload',
        headers: { 'Content-Type': 'multipart/form-data; boundary=----boundary' },
        data: [
          { name: 'field1', value: '{{token}}', type: 'text' },
          { name: 'field2', value: 'static', type: 'text' },
          { name: 'field3', value: '{{prefix}}-suffix', type: 'text' }
        ]
      };

      const result = interpolateVars(
        request,
        { token: 'secret123', prefix: 'my' },
        null,
        null
      );

      expect(result.data).toEqual([
        { name: 'field1', value: 'secret123', type: 'text' },
        { name: 'field2', value: 'static', type: 'text' },
        { name: 'field3', value: 'my-suffix', type: 'text' }
      ]);
    });

    it('interpolates value in each part when Content-Type is multipart/mixed', () => {
      const request = {
        method: 'POST',
        url: 'http://api.example/send',
        headers: { 'Content-Type': 'multipart/mixed; boundary=----mixed' },
        data: [
          { name: 'part1', value: '{{envVar}}', type: 'text' },
          { name: 'part2', value: '{{another}}', type: 'text' }
        ]
      };

      const result = interpolateVars(
        request,
        { envVar: 'first', another: 'second' },
        null,
        null
      );

      expect(result.data).toEqual([
        { name: 'part1', value: 'first', type: 'text' },
        { name: 'part2', value: 'second', type: 'text' }
      ]);
    });

    it('leaves part keys (name, type, etc.) intact and only interpolates value', () => {
      const request = {
        method: 'POST',
        url: 'http://api.example/upload',
        headers: { 'Content-Type': 'multipart/form-data' },
        data: [
          { name: 'file', value: '{{path}}', type: 'file', fileName: 'doc.pdf' }
        ]
      };

      const result = interpolateVars(request, { path: '/tmp/doc.pdf' }, null, null);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('file');
      expect(result.data[0].type).toBe('file');
      expect(result.data[0].fileName).toBe('doc.pdf');
      expect(result.data[0].value).toBe('/tmp/doc.pdf');
    });

    it('handles empty multipart array', () => {
      const request = {
        method: 'POST',
        url: 'http://api.example/upload',
        headers: { 'Content-Type': 'multipart/form-data' },
        data: []
      };

      const result = interpolateVars(request, { x: 'y' }, null, null);

      expect(result.data).toEqual([]);
    });

    it('handles part with missing or undefined value', () => {
      const request = {
        method: 'POST',
        url: 'http://api.example/upload',
        headers: { 'Content-Type': 'multipart/form-data' },
        data: [
          { name: 'a', value: '{{present}}' },
          { name: 'b' },
          { name: 'c', value: undefined }
        ]
      };

      const result = interpolateVars(request, { present: 'ok' }, null, null);

      expect(result.data[0].value).toBe('ok');
      expect(result.data[1].value).toBeUndefined();
      expect(result.data[2].value).toBeUndefined();
    });

    it('preserves raw string body when Content-Type is multipart/mixed (manually constructed multipart)', () => {
      // Equivalent to: curl -X POST https://httpbin.dev/post \
      //   -H 'content-type: multipart/mixed; boundary=TestBoundary123' \
      //   --data '--TestBoundary123\r\nContent-Type: application/json\r\n\r\n{"test": true}\r\n--TestBoundary123--\r\n'
      const rawMultipartBody = [
        '--TestBoundary123',
        'Content-Type: application/json',
        '',
        '{"test": true}',
        '--TestBoundary123--',
        ''
      ].join('\r\n');

      const request = {
        method: 'POST',
        url: 'https://httpbin.dev/post',
        headers: { 'content-type': 'multipart/mixed; boundary=TestBoundary123' },
        data: rawMultipartBody
      };

      const result = interpolateVars(request, {}, null, null);

      expect(result.data).toBe(rawMultipartBody);
      expect(result.data).toContain('--TestBoundary123');
      expect(result.data).toContain('Content-Type: application/json');
      expect(result.data).toContain('{"test": true}');
      expect(result.data).toContain('--TestBoundary123--');
    });
  });
});
