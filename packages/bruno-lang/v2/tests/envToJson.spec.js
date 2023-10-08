const parser = require('../src/envToJson');

describe('env parser', () => {
  it('should parse empty vars', () => {
    const input = `
vars {
}`;

    const output = parser(input);
    const expected = {
      variables: []
    };

    expect(output).toEqual(expected);
  });

  it('should parse empty vars with meta', () => {
    const input = `
meta {
  name: This is a test
}

vars {
}`;

    const output = parser(input);
    const expected = {
      variables: [],
      name: 'This is a test'
    };

    expect(output).toEqual(expected);
  });

  it('should parse single var line', () => {
    const input = `
meta {
  name: This is a test
}

vars {
  url: http://localhost:3000
}`;

    const output = parser(input);
    const expected = {
      variables: [
        {
          name: 'url',
          value: 'http://localhost:3000',
          enabled: true,
          secret: false
        }
      ],
      name: 'This is a test'
    };

    expect(output).toEqual(expected);
  });

  it('should parse multiple var lines', () => {
    const input = `
meta {
  name: This is a test
}

vars {
  url: http://localhost:3000
  port: 3000
  ~token: secret
}`;

    const output = parser(input);
    const expected = {
      name: 'This is a test',
      variables: [
        {
          name: 'url',
          value: 'http://localhost:3000',
          enabled: true,
          secret: false
        },
        {
          name: 'port',
          value: '3000',
          enabled: true,
          secret: false
        },
        {
          name: 'token',
          value: 'secret',
          enabled: false,
          secret: false
        }
      ]
    };

    expect(output).toEqual(expected);
  });

  it('should gracefully handle empty lines and spaces', () => {
    const input = `

meta {
    name: Yet another test
    other-thing: ignore me
}

vars {
      url:     http://localhost:3000   
  port: 3000
}

`;

    const output = parser(input);
    const expected = {
      name: 'Yet another test',
      variables: [
        {
          name: 'url',
          value: 'http://localhost:3000',
          enabled: true,
          secret: false
        },
        {
          name: 'port',
          value: '3000',
          enabled: true,
          secret: false
        }
      ]
    };

    expect(output).toEqual(expected);
  });

  it('should parse vars with empty values', () => {
    const input = `
vars {
  url: 
  phone: 
  api-key:
}
`;

    const output = parser(input);
    const expected = {
      variables: [
        {
          name: 'url',
          value: '',
          enabled: true,
          secret: false
        },
        {
          name: 'phone',
          value: '',
          enabled: true,
          secret: false
        },
        {
          name: 'api-key',
          value: '',
          enabled: true,
          secret: false
        }
      ]
    };

    expect(output).toEqual(expected);
  });

  it('should parse empty secret vars', () => {
    const input = `
vars {
  url: http://localhost:3000
}

vars:secret [

]
`;

    const output = parser(input);
    const expected = {
      variables: [
        {
          name: 'url',
          value: 'http://localhost:3000',
          enabled: true,
          secret: false
        }
      ]
    };

    expect(output).toEqual(expected);
  });

  it('should parse secret vars', () => {
    const input = `
vars {
  url: http://localhost:3000
}

vars:secret [
  token
]
`;

    const output = parser(input);
    const expected = {
      variables: [
        {
          name: 'url',
          value: 'http://localhost:3000',
          enabled: true,
          secret: false
        },
        {
          name: 'token',
          value: null,
          enabled: true,
          secret: true
        }
      ]
    };

    expect(output).toEqual(expected);
  });

  it('should parse multiline secret vars', () => {
    const input = `
vars {
  url: http://localhost:3000
}

vars:secret [
  access_token,
  access_secret,

  ~access_password
]
`;

    const output = parser(input);
    const expected = {
      variables: [
        {
          name: 'url',
          value: 'http://localhost:3000',
          enabled: true,
          secret: false
        },
        {
          name: 'access_token',
          value: null,
          enabled: true,
          secret: true
        },
        {
          name: 'access_secret',
          value: null,
          enabled: true,
          secret: true
        },
        {
          name: 'access_password',
          value: null,
          enabled: false,
          secret: true
        }
      ]
    };

    expect(output).toEqual(expected);
  });

  it('should parse inline secret vars', () => {
    const input = `
vars {
  url: http://localhost:3000
}

vars:secret [access_key]
`;

    const output = parser(input);
    const expected = {
      variables: [
        {
          name: 'url',
          value: 'http://localhost:3000',
          enabled: true,
          secret: false
        },
        {
          name: 'access_key',
          value: null,
          enabled: true,
          secret: true
        }
      ]
    };

    expect(output).toEqual(expected);
  });

  it('should parse inline multiple secret vars', () => {
    const input = `
vars {
  url: http://localhost:3000
}

vars:secret [access_key,access_secret,    access_password  ]
`;

    const output = parser(input);
    const expected = {
      variables: [
        {
          name: 'url',
          value: 'http://localhost:3000',
          enabled: true,
          secret: false
        },
        {
          name: 'access_key',
          value: null,
          enabled: true,
          secret: true
        },
        {
          name: 'access_secret',
          value: null,
          enabled: true,
          secret: true
        },
        {
          name: 'access_password',
          value: null,
          enabled: true,
          secret: true
        }
      ]
    };

    expect(output).toEqual(expected);
  });
});
