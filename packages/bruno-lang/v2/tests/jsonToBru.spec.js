const stringify = require('../src/jsonToBru');

describe('jsonToBru stringify', () => {
  describe('body:grpc', () => {
    it('stringifies grpc messages with enabled true (default)', () => {
      const input = {
        grpc: {
          url: 'grpc://localhost:50051',
          method: '/hello.HelloService/SayHello',
          body: 'grpc',
          auth: 'inherit',
          methodType: 'unary'
        },
        body: {
          mode: 'grpc',
          grpc: [
            {
              content: '{"greeting":"hello"}',
              name: 'message 1',
              enabled: true
            }
          ]
        }
      };

      const output = stringify(input);

      expect(output).toContain('body:grpc {');
      expect(output).toContain('name: message 1');
      expect(output).toContain('{"greeting":"hello"}');
      // enabled: true should NOT be written (it's the default)
      expect(output).not.toContain('enabled: true');
      expect(output).not.toContain('enabled: false');
    });

    it('stringifies grpc messages with enabled false', () => {
      const input = {
        grpc: {
          url: 'grpc://localhost:50051',
          method: '/hello.HelloService/SayHello',
          body: 'grpc',
          auth: 'inherit',
          methodType: 'client-streaming'
        },
        body: {
          mode: 'grpc',
          grpc: [
            {
              content: '{"greeting":"hello"}',
              name: 'message 1',
              enabled: true
            },
            {
              content: '{"greeting":"world"}',
              name: 'message 2',
              enabled: false
            }
          ]
        }
      };

      const output = stringify(input);

      expect(output).toContain('body:grpc {');
      // First message should not have enabled field
      expect(output).toMatch(/name: message 1\n\s*content:/);
      // Second message should have enabled: false
      expect(output).toContain('enabled: false');
    });
  });

  describe('body:ws', () => {
    it('stringifies a valid bruno request | smoke', () => {
      const input = {
        ws: {
          url: 'ws://localhost:3000',
          body: 'ws'
        },
        body: {
          mode: 'ws',
          ws: [
            {
              content: '{"foo":"bar"}',
              name: 'message 1',
              type: 'json'
            }
          ]
        },
        settings: {
          keepAliveInterval: 30,
          timeout: 250
        }
      };

      const output = stringify(input);

      // generic structure snapshot
      expect(output).toMatchInlineSnapshot(`
        "ws {
          url: ws://localhost:3000
          body: ws
        }

        body:ws {
          name: message 1
          type: json
          content: '''
            {"foo":"bar"}
          '''
        }

        settings {
          keepAliveInterval: 30
          timeout: 250
        }
        "
      `);

      // Hard check if the input settings were stored as is
      expect(output).toMatch(new RegExp(`keepAliveInterval: ${input.settings.keepAliveInterval}`));
      expect(output).toMatch(new RegExp(`timeout: ${input.settings.timeout}`));
    });
  });

  describe('multi-line values', () => {
    it('handles multi-line values in URL, headers, params, and vars', () => {
      const input = {
        meta: {
          name: 'new-line',
          type: 'http',
          seq: 1
        },
        http: {
          method: 'get',
          url: 'https://httpbin.io/anything?foo=hello\nworld',
          body: 'none',
          auth: 'oauth2'
        },
        params: [
          {
            name: 'foo',
            value: 'hello\nworld',
            enabled: true,
            type: 'query'
          }
        ],
        headers: [
          {
            name: 'test header',
            value: 't1\nt2',
            enabled: true
          }
        ],
        vars: {
          req: [
            {
              name: 'test-var',
              value: 't1\nt2',
              enabled: true
            }
          ]
        }
      };

      const output = stringify(input);

      expect(output).toMatchInlineSnapshot(`
        "meta {
          name: new-line
          type: http
          seq: 1
        }

        get {
          url: '''
            https://httpbin.io/anything?foo=hello
            world
        '''
          body: none
          auth: oauth2
        }

        params:query {
          foo: '''
            hello
            world
          '''
        }

        headers {
          "test header": '''
            t1
            t2
          '''
        }

        vars:pre-request {
          test-var: '''
            t1
            t2
          '''
        }
        "
      `);
    });
  });
});
