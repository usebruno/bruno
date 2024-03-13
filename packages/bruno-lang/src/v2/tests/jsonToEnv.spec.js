const parser = require('../src/jsonToEnv');

describe('env parser', () => {
  it('should parse empty vars', () => {
    const input = {
      variables: [],
      name: 'test'
    };

    const output = parser(input);
    const expected = `meta {
  name: test
}

vars {
}
`;

    expect(output).toEqual(expected);
  });

  it('should parse single var line', () => {
    const input = {
      variables: [
        {
          name: 'url',
          value: 'http://localhost:3000',
          enabled: true
        }
      ],
      name: 'test'
    };

    const output = parser(input);
    const expected = `meta {
  name: test
}

vars {
  url: http://localhost:3000
}
`;
    expect(output).toEqual(expected);
  });

  it('should parse multiple var lines', () => {
    const input = {
      variables: [
        {
          name: 'url',
          value: 'http://localhost:3000',
          enabled: true
        },
        {
          name: 'port',
          value: '3000',
          enabled: false
        }
      ],
      name: 'test'
    };

    const expected = `meta {
  name: test
}

vars {
  url: http://localhost:3000
  ~port: 3000
}
`;
    const output = parser(input);
    expect(output).toEqual(expected);
  });

  it('should parse secret vars', () => {
    const input = {
      variables: [
        {
          name: 'url',
          value: 'http://localhost:3000',
          enabled: true
        },
        {
          name: 'token',
          value: 'abracadabra',
          enabled: true,
          secret: true
        }
      ],
      name: 'test'
    };

    const output = parser(input);
    const expected = `meta {
  name: test
}

vars {
  url: http://localhost:3000
}
vars:secret [
  token
]
`;
    expect(output).toEqual(expected);
  });

  it('should parse multiple secret vars', () => {
    const input = {
      variables: [
        {
          name: 'url',
          value: 'http://localhost:3000',
          enabled: true
        },
        {
          name: 'access_token',
          value: 'abracadabra',
          enabled: true,
          secret: true
        },
        {
          name: 'access_secret',
          value: 'abracadabra',
          enabled: false,
          secret: true
        }
      ],
      name: 'test'
    };

    const output = parser(input);
    const expected = `meta {
  name: test
}

vars {
  url: http://localhost:3000
}
vars:secret [
  access_token,
  ~access_secret
]
`;
    expect(output).toEqual(expected);
  });

  it('should parse even if the only secret vars are present', () => {
    const input = {
      variables: [
        {
          name: 'token',
          value: 'abracadabra',
          enabled: true,
          secret: true
        }
      ],
      name: 'test'
    };

    const output = parser(input);
    const expected = `meta {
  name: test
}

vars:secret [
  token
]
`;
    expect(output).toEqual(expected);
  });
});
