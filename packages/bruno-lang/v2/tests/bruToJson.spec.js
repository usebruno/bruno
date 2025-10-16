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

settings {
  encodeUrl: false
}
`;

      const output = parser(input);

      expect(output.meta).toEqual({
        name: 'new-line',
        type: 'http',
        seq: '1'
      });

      expect(output.http.url).toBe('https://httpbin.io/anything?foo=hello\nworld');

      expect(output.params).toHaveLength(1);
      expect(output.params[0]).toEqual({
        name: 'foo',
        value: 'hello\nworld',
        enabled: true,
        type: 'query'
      });

      expect(output.headers).toHaveLength(1);
      expect(output.headers[0]).toEqual({
        name: 'test header',
        value: 't1\nt2',
        enabled: true
      });

      expect(output.vars.req).toHaveLength(1);
      expect(output.vars.req[0]).toEqual({
        name: 'test-var',
        value: 't1\nt2',
        enabled: true,
        local: false
      });
    });
  });
});
