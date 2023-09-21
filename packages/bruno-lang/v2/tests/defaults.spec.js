const bruToJson = require('../src/bruToJson');

describe('defaults', () => {
  it('should parse the default type and seq', () => {
    const input = `
meta {
  name: Create user
}

post {
  url: /users
}
`;
    const expected = {
      meta: {
        name: 'Create user',
        seq: 1,
        type: 'http'
      },
      http: {
        method: 'post',
        url: '/users'
      }
    };
    const output = bruToJson(input);
    expect(output).toEqual(expected);
  });

  it('should parse the default body mode as json if the body is found', () => {
    const input = `
meta {
  name: Create user
}

post {
  url: /users
}

body {
  {
    name: John
    age: 30
  }
}
`;

    const expected = {
      meta: {
        name: 'Create user',
        seq: 1,
        type: 'http'
      },
      http: {
        method: 'post',
        url: '/users',
        body: 'json'
      },
      body: {
        json: '{\n  name: John\n  age: 30\n}'
      }
    };

    const output = bruToJson(input);
    expect(output).toEqual(expected);
  });
});
