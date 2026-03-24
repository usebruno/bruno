const parser = require('../src/bruToJson');

describe('bruToJson parser', () => {
  describe('body:ws', () => {
    it('infers message and settings | smoke', () => {
      const input = `
body:ws {
    type: json
    name: message 1
    content: '''
      {"foo":"bar"}
    '''
}

settings {
      timeout: 30
}
`;

      const expected = {
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
          encodeUrl: false,
          timeout: 30
        }
      };

      const output = parser(input);
      expect(output).toEqual(expected);
    });
  });

  describe('body:grpc', () => {
    it('parses message content with name and content', () => {
      const input = `
body:grpc {
    name: message 1
    content: '''
      {"foo":"bar"}
    '''
}
`;

      const expected = {
        body: {
          mode: 'grpc',
          grpc: [
            {
              content: '{"foo":"bar"}',
              name: 'message 1'
            }
          ]
        }
      };

      const output = parser(input);
      expect(output).toEqual(expected);
    });

    it('parses message with variables in content', () => {
      const input = `
body:grpc {
    name: message 1
    content: '''
      {"id":{{userId}},"name":"{{userName}}"}
    '''
}
`;

      const expected = {
        body: {
          mode: 'grpc',
          grpc: [
            {
              content: '{"id":{{userId}},"name":"{{userName}}"}',
              name: 'message 1'
            }
          ]
        }
      };

      const output = parser(input);
      expect(output).toEqual(expected);
    });
  });

  describe('multi-line values', () => {
    it('parses multi-line values in URL, headers, params, and vars', () => {
      const input = `
meta {
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
`;

      const expected = {
        meta: {
          name: 'new-line',
          type: 'http',
          seq: '1'
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
              enabled: true,
              local: false
            }
          ]
        }
      };

      const output = parser(input);
      expect(output).toEqual(expected);
    });

    it('parses multiline body parts with content type annotation', () => {
      const input = `
body:multipart-form {
  filePart: '''
    Line1
    Line2
  ''' @contentType(text/plain)
}
`;

      const expected = {
        body: {
          multipartForm: [
            {
              name: 'filePart',
              value: 'Line1\nLine2',
              enabled: true,
              type: 'text',
              contentType: 'text/plain'
            }
          ]
        }
      };

      const output = parser(input);
      expect(output).toEqual(expected);
    });
  });

  describe('description annotation', () => {
    it('parses @description in headers', () => {
      const input = `
headers {
  @description('''API key for auth.''')
  Authorization: Bearer xxx
  @description("Single-line desc")
  X-Custom: val
}`;

      const output = parser(input);
      expect(output.headers).toHaveLength(2);
      expect(output.headers[0]).toMatchObject({
        name: 'Authorization',
        value: 'Bearer xxx',
        enabled: true,
        description: 'API key for auth.'
      });
      expect(output.headers[1]).toMatchObject({
        name: 'X-Custom',
        value: 'val',
        enabled: true,
        description: 'Single-line desc'
      });
    });

    it('parses @description in params and body form-urlencoded', () => {
      const input = `
params:query {
  @description('''Search term.''')
  q: search
}
body:form-urlencoded {
  @description("Field description")
  field: value
}`;

      const output = parser(input);
      expect(output.params).toHaveLength(1);
      expect(output.params[0]).toMatchObject({
        name: 'q',
        value: 'search',
        type: 'query',
        description: 'Search term.'
      });
      expect(output.body.formUrlEncoded).toHaveLength(1);
      expect(output.body.formUrlEncoded[0]).toMatchObject({
        name: 'field',
        value: 'value',
        enabled: true,
        description: 'Field description'
      });
    });

    it('parses @description in vars:pre-request and vars:post-response', () => {
      const input = `
vars:pre-request {
  @description("Pre-request auth token")
  token: secret
}
vars:post-response {
  @description("Saved ID from response")
  saved: res.body.id
}`;

      const output = parser(input);
      expect(output.vars).toBeDefined();
      expect(output.vars.req).toHaveLength(1);
      expect(output.vars.req[0]).toMatchObject({
        name: 'token',
        value: 'secret',
        enabled: true,
        local: false,
        description: 'Pre-request auth token'
      });
      expect(output.vars.res).toHaveLength(1);
      expect(output.vars.res[0]).toMatchObject({
        name: 'saved',
        value: 'res.body.id',
        enabled: true,
        local: false,
        description: 'Saved ID from response'
      });
    });

    it('parses @description in assert', () => {
      const input = `
assert {
  @description("Expect success status")
  res.body.status: eq 200
  @description("Response must have data")
  res.body.data: isDefined
}`;

      const output = parser(input);
      expect(output.assertions).toHaveLength(2);
      expect(output.assertions[0]).toMatchObject({
        name: 'res.body.status',
        value: 'eq 200',
        enabled: true,
        description: 'Expect success status'
      });
      expect(output.assertions[1]).toMatchObject({
        name: 'res.body.data',
        value: 'isDefined',
        enabled: true,
        description: 'Response must have data'
      });
    });

    it('parses double-quoted @description with escaped newline', () => {
      const input = `
headers {
  @description("Line one\\nLine two")
  X-Note: v
}`;

      const output = parser(input);
      expect(output.headers).toHaveLength(1);
      expect(output.headers[0]).toMatchObject({
        name: 'X-Note',
        value: 'v',
        enabled: true,
        description: 'Line one\nLine two'
      });
    });

    it('parses triple-quoted @description with literal newlines', () => {
      const input = `
headers {
  @description('''
    Line one
    Line two
  ''')
  X-Note: v
}`;

      const output = parser(input);
      expect(output.headers).toHaveLength(1);
      expect(output.headers[0]).toMatchObject({
        name: 'X-Note',
        value: 'v',
        enabled: true,
        description: 'Line one\nLine two'
      });
    });

    it('parses escaped characters in descriptions', () => {
      const input = `
headers {
  @description("Say \\"hello\\"")
  X-Quote: val
  @description("Path: \\\\usr\\\\bin")
  X-Backslash: val
  @description("Line1\\nLine2")
  X-Newline: val
}
params:query {
  @description("Escaped \\" quote")
  q: x
}
body:form-urlencoded {
  @description("\\\\ and \\" and \\\\n")
  f: v
}`;

      const output = parser(input);
      expect(output.headers).toHaveLength(3);
      expect(output.headers[0]).toMatchObject({
        name: 'X-Quote',
        value: 'val',
        enabled: true,
        description: 'Say "hello"'
      });
      expect(output.headers[1]).toMatchObject({
        name: 'X-Backslash',
        value: 'val',
        enabled: true,
        description: 'Path: \\usr\\bin'
      });
      expect(output.headers[2]).toMatchObject({
        name: 'X-Newline',
        value: 'val',
        enabled: true,
        description: 'Line1\nLine2'
      });
      expect(output.params[0]).toMatchObject({
        name: 'q',
        value: 'x',
        type: 'query',
        description: 'Escaped " quote'
      });
      expect(output.body.formUrlEncoded[0]).toMatchObject({
        name: 'f',
        value: 'v',
        enabled: true,
        description: '\\ and " and \\n'
      });
    });

    it('parses emoji in triple-quoted prefix description', () => {
      const input = `
headers {
  @description('''Auth token 🔑''')
  Authorization: Bearer xxx
  @description('''Region 🌍 selector''')
  X-Region: us-east
}`;

      const output = parser(input);
      expect(output.headers[0]).toMatchObject({
        name: 'Authorization',
        value: 'Bearer xxx',
        description: 'Auth token 🔑'
      });
      expect(output.headers[1]).toMatchObject({
        name: 'X-Region',
        value: 'us-east',
        description: 'Region 🌍 selector'
      });
    });

    it('parses emoji in double-quoted description', () => {
      const input = `
vars:pre-request {
  @description("API key 🔐 required")
  token: secret
}
assert {
  @description("Status check ✅")
  res.status: eq 200
}`;

      const output = parser(input);
      expect(output.vars.req[0]).toMatchObject({
        name: 'token',
        value: 'secret',
        description: 'API key 🔐 required'
      });
      expect(output.assertions[0]).toMatchObject({
        name: 'res.status',
        value: 'eq 200',
        description: 'Status check ✅'
      });
    });

    it('parses emoji in multiline triple-quoted prefix description', () => {
      const input = `
headers {
  @description('''
    Launch 🚀
    Second line
  ''')
  X-Launch: val
}`;

      const output = parser(input);
      expect(output.headers[0]).toMatchObject({
        name: 'X-Launch',
        value: 'val',
        description: 'Launch 🚀\nSecond line'
      });
    });

    it('parses \\r\\n escape sequence in double-quoted description as CRLF', () => {
      const input = `
headers {
  @description("Line one\\r\\nLine two")
  X-Note: v
}`;

      const output = parser(input);
      expect(output.headers[0]).toMatchObject({
        name: 'X-Note',
        value: 'v',
        description: 'Line one\r\nLine two'
      });
    });

    it('parses \\n escape sequence in double-quoted description as LF', () => {
      const input = `
headers {
  @description("First\\nSecond\\nThird")
  X-Note: v
}`;

      const output = parser(input);
      expect(output.headers[0]).toMatchObject({
        name: 'X-Note',
        value: 'v',
        description: 'First\nSecond\nThird'
      });
    });

    it('parses triple-quoted prefix with CRLF file line endings', () => {
      // Simulate a .bru file saved with Windows CRLF line endings
      const input = 'headers {\r\n  @description(\'\'\'Line one\'\'\')\r\n  X-Note: val\r\n}';

      const output = parser(input);
      expect(output.headers[0]).toMatchObject({
        name: 'X-Note',
        value: 'val',
        description: 'Line one'
      });
    });

    it('parses multiline triple-quoted prefix with CRLF file line endings', () => {
      const input = 'headers {\r\n  @description(\'\'\'\r\n    Line one\r\n    Line two\r\n  \'\'\')\r\n  X-Note: val\r\n}';

      const output = parser(input);
      expect(output.headers[0]).toMatchObject({
        name: 'X-Note',
        value: 'val',
        description: 'Line one\r\nLine two'
      });
    });

    it('parses multiline triple-quoted prefix with CRLF across three lines', () => {
      const input = 'headers {\r\n  @description(\'\'\'\r\n    Line one\r\n    Line two\r\n    Line three\r\n  \'\'\')\r\n  X-Note: val\r\n}';

      const output = parser(input);
      expect(output.headers[0]).toMatchObject({
        name: 'X-Note',
        value: 'val',
        description: 'Line one\r\nLine two\r\nLine three'
      });
    });

    it('multiple consecutive @description prefixes: orphaned annotation becomes empty row, last one applies to the key', () => {
      const input = `
headers {
  @description('''hello''')
  @description('''hi''')
  a: b
}`;

      const output = parser(input);
      expect(output.headers).toHaveLength(2);
      expect(output.headers[0]).toMatchObject({
        name: '',
        value: '',
        enabled: true,
        description: 'hello'
      });
      expect(output.headers[1]).toMatchObject({
        name: 'a',
        value: 'b',
        enabled: true,
        description: 'hi'
      });
    });
  });
});
