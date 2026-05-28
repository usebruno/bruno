/**
 * This test file is used to test the dictionary parser.
 */

const parser = require('../src/bruToJson');

const assertSingleHeader = (input) => {
  const output = parser(input);

  const expected = {
    headers: [
      {
        name: 'hello',
        value: 'world',
        enabled: true
      }
    ]
  };
  expect(output).toEqual(expected);
};

describe('headers parser', () => {
  it('should parse empty header', () => {
    const input = `
headers {
}`;

    const output = parser(input);
    const expected = {
      headers: []
    };
    expect(output).toEqual(expected);
  });

  it('should parse single header', () => {
    const input = `
headers {
  hello: world
}`;

    assertSingleHeader(input);
  });

  it('should parse single header with spaces', () => {
    const input = `
headers {
      hello: world   
}`;

    assertSingleHeader(input);
  });

  it('should parse single header with spaces and newlines', () => {
    const input = `
headers {

      hello: world   
  

}`;

    assertSingleHeader(input);
  });

  it('should parse single header with empty value', () => {
    const input = `
headers {
  hello:
}`;

    const output = parser(input);
    const expected = {
      headers: [
        {
          name: 'hello',
          value: '',
          enabled: true
        }
      ]
    };
    expect(output).toEqual(expected);
  });

  it('should parse single header with empty key', () => {
    const input = `
headers {
  : world
}`;

    const output = parser(input);
    const expected = {
      headers: [
        {
          name: '',
          value: 'world',
          enabled: true
        }
      ]
    };
    expect(output).toEqual(expected);
  });

  it('should parse multi headers', () => {
    const input = `
headers {
  content-type: application/json
    
  Authorization: JWT secret
}`;

    const output = parser(input);
    const expected = {
      headers: [
        {
          name: 'content-type',
          value: 'application/json',
          enabled: true
        },
        {
          name: 'Authorization',
          value: 'JWT secret',
          enabled: true
        }
      ]
    };
    expect(output).toEqual(expected);
  });

  it('should parse disabled headers', () => {
    const input = `
headers {
  ~content-type: application/json
}`;

    const output = parser(input);
    const expected = {
      headers: [
        {
          name: 'content-type',
          value: 'application/json',
          enabled: false
        }
      ]
    };
    expect(output).toEqual(expected);
  });

  it('should parse empty url', () => {
    const input = `
get {
  url: 
  body: json
}`;

    const output = parser(input);
    const expected = {
      http: {
        url: '',
        method: 'get',
        body: 'json'
      }
    };
    expect(output).toEqual(expected);
  });

  it('should throw error on invalid header', () => {
    const input = `
headers {
  hello: world
  foo
}`;

    expect(() => parser(input)).toThrow();
  });

  it('should throw error on invalid header', () => {
    const input = `
headers {
  hello: world
  foo: bar}`;

    expect(() => parser(input)).toThrow();
  });
});
