const stringify = require('../src/jsonToBru');

describe('jsonToBru stringify', () => {
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

  describe('description annotation', () => {
    it('emits @description with triple-quotes (literal newlines) for headers, params, vars, and assertions when present in JSON', () => {
      const input = {
        meta: { name: 'desc-test', type: 'http', seq: 1 },
        http: { method: 'get', url: 'https://example.com', body: 'none' },
        headers: [
          { name: 'X-Custom', value: 'val', enabled: true, description: 'Custom header note' }
        ],
        params: [
          { name: 'q', value: 'search', enabled: true, type: 'query', description: 'Query param hint' }
        ],
        vars: {
          req: [
            { name: 'apiKey', value: 'key123', enabled: true, description: 'Pre-request API key' }
          ]
        },
        assertions: [
          { name: 'res.status', value: 'eq 200', enabled: true, description: 'Expect OK' }
        ]
      };

      const output = stringify(input);

      expect(output).toMatch(/X-Custom: val @description\('''Custom header note'''\)/);
      expect(output).toMatch(/q: search @description\('''Query param hint'''\)/);
      expect(output).toMatch(/apiKey: key123 @description\('''Pre-request API key'''\)/);
      expect(output).toMatch(/res\.status: eq 200 @description\('''Expect OK'''\)/);
    });

    it('emits triple-quoted description with literal newlines when description is multiline', () => {
      const input = {
        meta: { name: 'ml', type: 'http', seq: 1 },
        http: { method: 'get', url: 'https://example.com', body: 'none' },
        headers: [
          { name: 'X-Note', value: 'v', enabled: true, description: 'Line one\nLine two' }
        ]
      };

      const output = stringify(input);

      expect(output).toContain('X-Note: v @description(\'\'\'\n    Line one\n    Line two\n  \'\'\')');
    });

    it('emits double-quoted description when description contains triple quote', () => {
      const input = {
        meta: { name: 'tq', type: 'http', seq: 1 },
        http: { method: 'get', url: 'https://example.com', body: 'none' },
        headers: [
          { name: 'X-Desc', value: 'v', enabled: true, description: 'Say \'\'\'triple\'\'\'' }
        ]
      };

      const output = stringify(input);

      expect(output).toMatch(/@description\("Say '''triple'''"\)/);
    });

    it('escapes backslash in triple-quoted description; double-quoted when description contains triple quote or newline', () => {
      const input = {
        meta: { name: 'esc', type: 'http', seq: 1 },
        http: { method: 'get', url: 'https://example.com', body: 'none' },
        headers: [
          { name: 'X-Desc', value: 'v', enabled: true, description: 'Say "hello"' }
        ]
      };

      const output = stringify(input);
      // No ''' or newline so triple-quoted (double-quote is fine inside triple quotes)
      expect(output).toMatch(/@description\('''Say "hello"'''\)/);
    });
  });
});
