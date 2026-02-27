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
  Authorization: Bearer xxx @description('''API key for auth.''')
  X-Custom: val @description("Single-line desc")
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
  q: search @description('''Search term.''')
}
body:form-urlencoded {
  field: value @description("Field description")
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

    it('parses escaped characters in descriptions', () => {
      const input = `
headers {
  X-Quote: val @description("Say \\"hello\\"")
  X-Backslash: val @description("Path: \\\\usr\\\\bin")
  X-Newline: val @description("Line1\\nLine2")
}
params:query {
  q: x @description("Escaped \\" quote")
}
body:form-urlencoded {
  f: v @description("\\\\ and \\" and \\\\n")
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
  });
});
