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
        { name: 'certificate', value: 'some-value', enabled: true, local: false, annotations: [{ name: 'description', value: 'This is a certificate\nUse this when making request' }] },
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
          dataType: 'object'
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
          dataType: 'number'
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
});
