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
              type: 'json',
              selected: false
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

    it('parses a single message flagged with selected: true', () => {
      const input = `
body:ws {
    type: json
    name: message 1
    selected: true
    content: '''
      {"foo":"bar"}
    '''
}
`;

      const expected = {
        body: {
          mode: 'ws',
          ws: [
            {
              content: '{"foo":"bar"}',
              name: 'message 1',
              type: 'json',
              selected: true
            }
          ]
        }
      };

      const output = parser(input);
      expect(output).toEqual(expected);
    });

    it('parses multiple messages with none marked as selected', () => {
      const input = `
body:ws {
  name: message 1
  type: json
  content: '''
    {"action":"subscribe"}
  '''
}

body:ws {
  name: message 2
  type: text
  content: '''
    hello world
  '''
}
`;

      const expected = {
        body: {
          mode: 'ws',
          ws: [
            {
              name: 'message 1',
              type: 'json',
              content: '{"action":"subscribe"}',
              selected: false
            },
            {
              name: 'message 2',
              type: 'text',
              content: 'hello world',
              selected: false
            }
          ]
        }
      };

      const output = parser(input);
      expect(output).toEqual(expected);
    });

    it('parses multiple messages with exactly one marked as selected', () => {
      const input = `
body:ws {
  name: message 1
  type: json
  content: '''
    {"action":"subscribe"}
  '''
}

body:ws {
  name: message 2
  type: text
  selected: true
  content: '''
    hello world
  '''
}

body:ws {
  name: message 3
  type: xml
  content: '''
    <ping/>
  '''
}
`;

      const expected = {
        body: {
          mode: 'ws',
          ws: [
            {
              name: 'message 1',
              type: 'json',
              content: '{"action":"subscribe"}',
              selected: false
            },
            {
              name: 'message 2',
              type: 'text',
              content: 'hello world',
              selected: true
            },
            {
              name: 'message 3',
              type: 'xml',
              content: '<ping/>',
              selected: false
            }
          ]
        }
      };

      const output = parser(input);
      expect(output).toEqual(expected);
    });

    it('treats selected: false as not selected', () => {
      const input = `
body:ws {
  name: message 1
  type: text
  selected: false
  content: '''
    hello
  '''
}
`;

      const output = parser(input);
      expect(output.body.ws[0].selected).toBe(false);
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

  describe('vars:pre-request decorators', () => {
    it('should parse all dataType decorators', () => {
      const input = `
vars:pre-request {
  apiKey: abc123
  @number
  port: 3000
  @boolean
  isEnabled: true
  @object
  config: '''
    {
      "name": "John Doe",
      "age": 30
    }
  '''
}
`;

      const output = parser(input);
      expect(output.vars.req).toEqual([
        { name: 'apiKey', value: 'abc123', enabled: true, local: false },
        { name: 'port', value: 3000, enabled: true, local: false, annotations: [{ name: 'number' }], dataType: 'number' },
        { name: 'isEnabled', value: true, enabled: true, local: false, annotations: [{ name: 'boolean' }], dataType: 'boolean' },
        { name: 'config', value: { name: 'John Doe', age: 30 }, enabled: true, local: false, annotations: [{ name: 'object' }], dataType: 'object' }
      ]);
    });

    it('should parse @description with multiline value', () => {
      const input = `
vars:pre-request {
  @description('''
    This is a certificate
    Use this when making request
  ''')
  certificate: some-value
  url: https://example.com
}
`;

      const output = parser(input);
      expect(output.vars.req).toEqual([
        { name: 'certificate', value: 'some-value', enabled: true, local: false, annotations: [{ name: 'description', value: 'This is a certificate\nUse this when making request' }], description: 'This is a certificate\nUse this when making request' },
        { name: 'url', value: 'https://example.com', enabled: true, local: false }
      ]);
    });

    it('should parse combined @object and @description on a multiline var', () => {
      const input = `
vars:pre-request {
  @object
  @description('''
    This is a certificate
    Use this when making request
  ''')
  certificate: '''
    {
      "name": "John Doe",
      "age": 30,
      "email": "john.doe@example.com",
      "signature": "John Doe"
    }
  '''
  @number
  @description('server port')
  ~port: 8080
}
`;

      const output = parser(input);
      expect(output.vars.req).toEqual([
        {
          name: 'certificate',
          value: { name: 'John Doe', age: 30, email: 'john.doe@example.com', signature: 'John Doe' },
          enabled: true,
          local: false,
          annotations: [
            { name: 'object' },
            { name: 'description', value: 'This is a certificate\nUse this when making request' }
          ],
          dataType: 'object',
          description: 'This is a certificate\nUse this when making request'
        },
        {
          name: 'port',
          value: 8080,
          enabled: false,
          local: false,
          annotations: [
            { name: 'number' },
            { name: 'description', value: 'server port' }
          ],
          dataType: 'number',
          description: 'server port'
        }
      ]);
    });

    it('should keep only the last dataType decorator when multiple are present', () => {
      const input = `
vars:pre-request {
  @object
  @number
  port: 3000
}
`;

      const output = parser(input);
      expect(output.vars.req).toEqual([
        { name: 'port', value: 3000, enabled: true, local: false, annotations: [{ name: 'object' }, { name: 'number' }], dataType: 'number' }
      ]);
    });

    it('should preserve the declared dataType and the raw value when coercion is impossible', () => {
      // The UI's DataTypeSelector surfaces a warning icon for these rows; the
      // declared dataType is retained so the user sees their intent.
      const input = `
vars:pre-request {
  @number
  port: not-a-number
  @boolean
  flag: maybe
  @object
  config: plain
}
`;

      const output = parser(input);
      expect(output.vars.req).toEqual([
        { name: 'port', value: 'not-a-number', enabled: true, local: false, annotations: [{ name: 'number' }], dataType: 'number' },
        { name: 'flag', value: 'maybe', enabled: true, local: false, annotations: [{ name: 'boolean' }], dataType: 'boolean' },
        { name: 'config', value: 'plain', enabled: true, local: false, annotations: [{ name: 'object' }], dataType: 'object' }
      ]);
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

    it('parses an empty multipart-form file value as an empty array', () => {
      const input = `
body:multipart-form {
  file: @file()
}
`;

      const expected = {
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

      const output = parser(input);
      expect(output).toEqual(expected);
    });

    it('drops empty entries when parsing multiple multipart-form file paths', () => {
      const input = `
body:multipart-form {
  file: @file(a.txt||b.txt)
}
`;

      const expected = {
        body: {
          multipartForm: [
            {
              name: 'file',
              value: ['a.txt', 'b.txt'],
              enabled: true,
              type: 'file',
              contentType: ''
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
        annotations: [
          {
            name: 'description',
            value: 'API key for auth.'
          }
        ],
        description: 'API key for auth.'
      });
      expect(output.headers[1]).toMatchObject({
        name: 'X-Custom',
        value: 'val',
        enabled: true,
        annotations: [
          {
            name: 'description',
            value: 'Single-line desc'
          }
        ],
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
        annotations: [
          {
            name: 'description',
            value: 'Search term.'
          }
        ],
        description: 'Search term.'
      });
      expect(output.body.formUrlEncoded).toHaveLength(1);
      expect(output.body.formUrlEncoded[0]).toMatchObject({
        name: 'field',
        value: 'value',
        enabled: true,
        annotations: [
          {
            name: 'description',
            value: 'Field description'
          }
        ],
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
        annotations: [
          {
            name: 'description',
            value: 'Pre-request auth token'
          }
        ],
        description: 'Pre-request auth token'
      });
      expect(output.vars.res).toHaveLength(1);
      expect(output.vars.res[0]).toMatchObject({
        name: 'saved',
        value: 'res.body.id',
        enabled: true,
        local: false,
        annotations: [
          {
            name: 'description',
            value: 'Saved ID from response'
          }
        ],
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
        annotations: [
          {
            name: 'description',
            value: 'Expect success status'
          }
        ],
        description: 'Expect success status'
      });
      expect(output.assertions[1]).toMatchObject({
        name: 'res.body.data',
        value: 'isDefined',
        enabled: true,
        annotations: [
          {
            name: 'description',
            value: 'Response must have data'
          }
        ],
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
        annotations: [
          {
            name: 'description',
            value: 'Line one\nLine two'
          }
        ],
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
        annotations: [
          {
            name: 'description',
            value: 'Line one\nLine two'
          }
        ],
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
        annotations: [
          {
            name: 'description',
            value: 'Say "hello"'
          }
        ],
        description: 'Say "hello"'
      });
      expect(output.headers[1]).toMatchObject({
        name: 'X-Backslash',
        value: 'val',
        enabled: true,
        annotations: [
          {
            name: 'description',
            value: 'Path: \\usr\\bin'
          }
        ],
        description: 'Path: \\usr\\bin'
      });
      expect(output.headers[2]).toMatchObject({
        name: 'X-Newline',
        value: 'val',
        enabled: true,
        annotations: [
          {
            name: 'description',
            value: 'Line1\nLine2'
          }
        ],
        description: 'Line1\nLine2'
      });
      expect(output.params[0]).toMatchObject({
        name: 'q',
        value: 'x',
        type: 'query',
        annotations: [
          {
            name: 'description',
            value: 'Escaped " quote'
          }
        ],
        description: 'Escaped " quote'
      });
      expect(output.body.formUrlEncoded[0]).toMatchObject({
        name: 'f',
        value: 'v',
        enabled: true,
        annotations: [
          {
            name: 'description',
            value: '\\ and " and \\n'
          }
        ],
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
        annotations: [
          {
            name: 'description',
            value: 'Auth token 🔑'
          }
        ],
        description: 'Auth token 🔑'
      });
      expect(output.headers[1]).toMatchObject({
        name: 'X-Region',
        value: 'us-east',
        annotations: [
          {
            name: 'description',
            value: 'Region 🌍 selector'
          }
        ],
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
        annotations: [
          {
            name: 'description',
            value: 'API key 🔐 required'
          }
        ],
        description: 'API key 🔐 required'
      });
      expect(output.assertions[0]).toMatchObject({
        name: 'res.status',
        value: 'eq 200',
        annotations: [
          {
            name: 'description',
            value: 'Status check ✅'
          }
        ],
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
        annotations: [
          {
            name: 'description',
            value: 'Launch 🚀\nSecond line'
          }
        ],
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
        annotations: [
          {
            name: 'description',
            value: 'Line one\r\nLine two'
          }
        ],
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
        annotations: [
          {
            name: 'description',
            value: 'First\nSecond\nThird'
          }
        ],
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
        annotations: [
          {
            name: 'description',
            value: 'Line one'
          }
        ],
        description: 'Line one'
      });
    });

    it('parses multiline triple-quoted prefix with CRLF file line endings', () => {
      const input = 'headers {\r\n  @description(\'\'\'\r\n    Line one\r\n    Line two\r\n  \'\'\')\r\n  X-Note: val\r\n}';

      const output = parser(input);
      expect(output.headers[0]).toMatchObject({
        name: 'X-Note',
        value: 'val',
        annotations: [
          {
            name: 'description',
            value: 'Line one\r\nLine two'
          }
        ],
        description: 'Line one\r\nLine two'
      });
    });

    it('parses multiline triple-quoted prefix with CRLF across three lines', () => {
      const input = 'headers {\r\n  @description(\'\'\'\r\n    Line one\r\n    Line two\r\n    Line three\r\n  \'\'\')\r\n  X-Note: val\r\n}';

      const output = parser(input);
      expect(output.headers[0]).toMatchObject({
        name: 'X-Note',
        value: 'val',
        annotations: [
          {
            name: 'description',
            value: 'Line one\r\nLine two\r\nLine three'
          }
        ],
        description: 'Line one\r\nLine two\r\nLine three'
      });
    });

    it('multiple consecutive @description prefixes stack as annotations on the next row', () => {
      const input = `
headers {
  @description('''hello''')
  @description('''hi''')
  a: b
}`;

      const output = parser(input);
      expect(output.headers).toHaveLength(1);
      expect(output.headers[0]).toMatchObject({
        name: 'a',
        value: 'b',
        enabled: true,
        annotations: [
          {
            name: 'description',
            value: 'hello'
          },
          {
            name: 'description',
            value: 'hi'
          }
        ],
        description: 'hello'
      });
    });
  });

  // The v2 grammar matches the ohm grammar character-by-character across the
  // whole file, including the large opaque body/script/docs/tests content that
  // the grammar simply returns verbatim. That parse scales super-linearly with
  // block size — a ~1MB JSON body takes several seconds, and larger bodies
  // effectively freeze the parser. To avoid that, the parser hoists each text
  // block behind a sentinel, parses the small remaining skeleton, then splices
  // the real content back into the AST (falling back to a full parse if a
  // sentinel does not land as a standalone value).
  //
  // These tests pin both halves of that contract: the output must be identical
  // to a plain parse, and the parse time must no longer explode with body size.
  describe('large text blocks (parse performance)', () => {
    it('parses a ~1MB JSON body in a fraction of the time a full grammar parse needs', () => {
      const rows = [];
      for (let i = 0; i < 30000; i++) {
        rows.push(`    { "id": ${i}, "name": "row ${i}" }`);
      }
      const json = `{\n  "rows": [\n${rows.join(',\n')}\n  ]\n}`;
      // Bruno indents body content by 2 spaces; only the block's own closing
      // brace sits at column 0, which is the boundary both the grammar and the
      // hoisting pre-pass key off.
      const indentedJson = json
        .split('\n')
        .map((line) => '  ' + line)
        .join('\n');
      const input = `get {\n  url: https://example.com\n}\n\nbody:json {\n${indentedJson}\n}\n`;

      // Sanity: this really is a large body (the regression only bites at scale).
      expect(input.length).toBeGreaterThan(1024 * 1024);

      const start = process.hrtime.bigint();
      const output = parser(input);
      const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;

      // Correctness: the body round-trips exactly to its outdented source form.
      expect(output.http.method).toBe('get');
      expect(output.body.json).toBe(json);

      // Necessity: parsing this same input through the full grammar takes ~3s
      // and grows super-linearly beyond it; the hoisting path is a few
      // milliseconds. The 1s budget separates the two with a ~100x margin, so it
      // flags a regression to the slow path without being timing-fragile.
      expect(elapsedMs).toBeLessThan(1000);
    }, 20000);

    it('produces identical output for a large pretty-printed JSON body as for a small one', () => {
      const json = `{\n  "rows": [\n${Array.from({ length: 2000 }, (_v, i) => `    { "id": ${i} }`).join(',\n')}\n  ]\n}`;
      const indentedJson = json
        .split('\n')
        .map((line) => '  ' + line)
        .join('\n');
      const input = `get {\n  url: https://example.com\n}\n\nbody:json {\n${indentedJson}\n}\n`;

      const output = parser(input);

      expect(output).toEqual({
        http: {
          method: 'get',
          url: 'https://example.com'
        },
        body: {
          json
        }
      });
      // The sentinel used internally must never leak into the result.
      expect(JSON.stringify(output)).not.toContain('\u0000');
    });

    it('hoists and restores every text block when several appear in one file', () => {
      const input = `get {
  url: https://example.com
}

body:json {
  {
    "a": 1
  }
}

script:pre-request {
  console.log('hi');
}

docs {
  # Title
  some docs
}
`;

      const output = parser(input);

      expect(output).toEqual({
        http: {
          method: 'get',
          url: 'https://example.com'
        },
        body: {
          json: '{\n  "a": 1\n}'
        },
        script: {
          req: 'console.log(\'hi\');'
        },
        docs: '# Title\nsome docs'
      });
    });

    it('handles CRLF line endings inside a text block', () => {
      const input = 'get {\r\n  url: https://example.com\r\n}\r\n\r\nbody:json {\r\n  {\r\n    "a": 1\r\n  }\r\n}\r\n';

      const output = parser(input);

      expect(output).toEqual({
        http: {
          method: 'get',
          url: 'https://example.com'
        },
        body: {
          json: '{\n  "a": 1\n}'
        }
      });
    });

    it('falls back to a full parse and stays correct when a hoisted block is dropped by the reducer', () => {
      // Duplicate text blocks are valid .bru: the grammar accepts them and the
      // reducer keeps the last one. Both blocks get hoisted, but only the
      // surviving block's sentinel remains in the merged AST, so the number of
      // spliced sentinels no longer matches the number hoisted. That mismatch
      // makes the parser discard the fast path and fall back to a full parse,
      // which yields exactly the stock result — the optimization never changes
      // the output, only (in this rare case) the speed.
      const input = `get {
  url: https://example.com
}

docs {
  first docs
}

docs {
  second docs
}
`;

      const output = parser(input);

      expect(output).toEqual({
        http: {
          method: 'get',
          url: 'https://example.com'
        },
        docs: 'second docs'
      });
    });
  });
});
