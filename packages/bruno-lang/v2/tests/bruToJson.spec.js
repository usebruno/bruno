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

  describe('vars:pre-request decorators', () => {
    it('should parse all datatype decorators', () => {
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
        { name: 'port', value: 3000, enabled: true, local: false, annotations: [{ name: 'number' }], datatype: 'number' },
        { name: 'isEnabled', value: true, enabled: true, local: false, annotations: [{ name: 'boolean' }], datatype: 'boolean' },
        { name: 'config', value: { name: 'John Doe', age: 30 }, enabled: true, local: false, annotations: [{ name: 'object' }], datatype: 'object' }
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
          datatype: 'object'
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
          datatype: 'number'
        }
      ]);
    });

    it('should keep only the last datatype decorator when multiple are present', () => {
      const input = `
vars:pre-request {
  @object
  @number
  port: 3000
}
`;

      const output = parser(input);
      expect(output.vars.req).toEqual([
        { name: 'port', value: 3000, enabled: true, local: false, annotations: [{ name: 'object' }, { name: 'number' }], datatype: 'number' }
      ]);
    });

    it('should preserve the declared datatype and the raw value when coercion is impossible', () => {
      // The UI's DatatypeSelector surfaces a warning icon for these rows; the
      // declared datatype is retained so the user sees their intent.
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
        { name: 'port', value: 'not-a-number', enabled: true, local: false, annotations: [{ name: 'number' }], datatype: 'number' },
        { name: 'flag', value: 'maybe', enabled: true, local: false, annotations: [{ name: 'boolean' }], datatype: 'boolean' },
        { name: 'config', value: 'plain', enabled: true, local: false, annotations: [{ name: 'object' }], datatype: 'object' }
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
  });
});
