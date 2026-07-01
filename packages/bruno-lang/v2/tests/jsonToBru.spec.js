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

  describe('body:multipart-form file values', () => {
    it('stringifies an empty file value without a leading pipe', () => {
      const input = {
        body: {
          multipartForm: [
            {
              name: 'file',
              value: [],
              enabled: true,
              type: 'file',
              contentType: ''
            }
          ]
        }
      };

      const output = stringify(input);
      expect(output).toContain('file: @file()');
      expect(output).not.toContain('@file(|');
    });

    it('drops empty entries when stringifying multiple file paths', () => {
      const input = {
        body: {
          multipartForm: [
            {
              name: 'file',
              value: ['', '/path/to/file.csv'],
              enabled: true,
              type: 'file',
              contentType: ''
            }
          ]
        }
      };

      const output = stringify(input);
      expect(output).toContain('file: @file(/path/to/file.csv)');
      expect(output).not.toContain('@file(|');
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

  describe('vars:pre-request dataType decorators', () => {
    const baseMeta = { name: 'test', type: 'http', seq: 1 };
    const baseHttp = { method: 'get', url: 'http://localhost' };

    it('emits dataType decorators for typed variables', () => {
      const output = stringify({
        meta: baseMeta,
        http: baseHttp,
        vars: {
          req: [
            { name: 'apiKey', value: 'abc', enabled: true, local: false },
            { name: 'port', value: 3000, enabled: true, local: false, dataType: 'number' },
            { name: 'flag', value: true, enabled: true, local: false, dataType: 'boolean' }
          ]
        }
      });

      expect(output).toContain('apiKey: abc');
      expect(output).toContain('@number\n  port: 3000');
      expect(output).toContain('@boolean\n  flag: true');
    });

    it('serializes @object values as multiline JSON', () => {
      const output = stringify({
        meta: baseMeta,
        http: baseHttp,
        vars: {
          req: [
            { name: 'config', value: { a: 1, b: 'x' }, enabled: true, local: false, dataType: 'object' }
          ]
        }
      });

      expect(output).toContain('@object');
      expect(output).toContain('"a": 1');
      expect(output).toContain('"b": "x"');
    });

    it('preserves local, disabled and disabled+local prefixes alongside dataType', () => {
      const output = stringify({
        meta: baseMeta,
        http: baseHttp,
        vars: {
          req: [
            { name: 'a', value: 1, enabled: true, local: true, dataType: 'number' },
            { name: 'b', value: 2, enabled: false, local: false, dataType: 'number' },
            { name: 'c', value: 3, enabled: false, local: true, dataType: 'number' }
          ]
        }
      });

      expect(output).toContain('@number\n  @a: 1');
      expect(output).toContain('@number\n  ~b: 2');
      expect(output).toContain('@number\n  ~@c: 3');
    });

    it('does not emit a dataType decorator for the string default', () => {
      const output = stringify({
        meta: baseMeta,
        http: baseHttp,
        vars: {
          req: [
            { name: 'apiKey', value: 'abc', enabled: true, local: false, dataType: 'string' }
          ]
        }
      });

      expect(output).not.toContain('@string');
      expect(output).toContain('apiKey: abc');
    });

    it('drops a stale dataType annotation in favour of the dataType field', () => {
      const output = stringify({
        meta: baseMeta,
        http: baseHttp,
        vars: {
          req: [
            {
              name: 'port',
              value: 3000,
              enabled: true,
              local: false,
              annotations: [{ name: 'string' }, { name: 'description', value: 'service port' }],
              dataType: 'number'
            }
          ]
        }
      });

      expect(output).toContain('@number');
      expect(output).not.toContain('@string');
      expect(output).toContain('@description(\'service port\')');
    });
  });
});
