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

  it('should parse single var line', () => {
    const input = `
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
      ]
    };

    expect(output).toEqual(expected);
  });

  it('should parse @description in vars', () => {
    const input = `
vars {
  @description('''Base API URL.''')
  url: http://localhost:3000
  @description("Server port")
  port: 3000
}`;

    const output = parser(input);
    const expected = {
      variables: [
        {
          name: 'url',
          value: 'http://localhost:3000',
          enabled: true,
          secret: false,
          description: 'Base API URL.'
        },
        {
          name: 'port',
          value: '3000',
          enabled: true,
          secret: false,
          description: 'Server port'
        }
      ]
    };

    expect(output).toEqual(expected);
  });

  it('should parse disabled variable with @description', () => {
    const input = `
vars {
  @description("Disabled base URL")
  ~url: http://localhost:3000
}`;

    const output = parser(input);
    const expected = {
      variables: [
        {
          name: 'url',
          value: 'http://localhost:3000',
          enabled: false,
          secret: false,
          description: 'Disabled base URL'
        }
      ]
    };

    expect(output).toEqual(expected);
  });

  it('should parse multiple var lines', () => {
    const input = `
vars {
  url: http://localhost:3000
  port: 3000
  ~token: secret
}`;

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

vars {
      url:     http://localhost:3000   
  port: 3000
}

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
          value: '',
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
          value: '',
          enabled: true,
          secret: true
        },
        {
          name: 'access_secret',
          value: '',
          enabled: true,
          secret: true
        },
        {
          name: 'access_password',
          value: '',
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
          value: '',
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
          value: '',
          enabled: true,
          secret: true
        },
        {
          name: 'access_secret',
          value: '',
          enabled: true,
          secret: true
        },
        {
          name: 'access_password',
          value: '',
          enabled: true,
          secret: true
        }
      ]
    };

    expect(output).toEqual(expected);
  });

  it('should parse multiline variable values', () => {
    const input = `
vars {
  json_data: '''
    {
      "name": "test",
      "value": 123
    }
  '''
}`;

    const output = parser(input);
    const expected = {
      variables: [
        {
          name: 'json_data',
          value: '{\n  "name": "test",\n  "value": 123\n}',
          enabled: true,
          secret: false
        }
      ]
    };

    expect(output).toEqual(expected);
  });

  it('should parse multiline variable that has indentation', () => {
    const input = `
vars {
  script: '''
    function test() {
      console.log("hello");
      return true;
    }
  '''
}`;

    const output = parser(input);
    const expected = {
      variables: [
        {
          name: 'script',
          value: 'function test() {\n  console.log("hello");\n  return true;\n}',
          enabled: true,
          secret: false
        }
      ]
    };

    expect(output).toEqual(expected);
  });

  it('should parse disabled multiline variable', () => {
    const input = `
vars {
  ~disabled_multiline: '''
    line 1
    line 2
    line 3
  '''
}`;

    const output = parser(input);
    const expected = {
      variables: [
        {
          name: 'disabled_multiline',
          value: 'line 1\nline 2\nline 3',
          enabled: false,
          secret: false
        }
      ]
    };

    expect(output).toEqual(expected);
  });

  it('should parse @description with emoji', () => {
    const input = `
vars {
  @description('''API key 🔐 required''')
  token: secret
  @description('''Region 🌍 selector''')
  region: us-east
}`;

    const output = parser(input);
    const expected = {
      variables: [
        {
          name: 'token',
          value: 'secret',
          enabled: true,
          secret: false,
          description: 'API key 🔐 required'
        },
        {
          name: 'region',
          value: 'us-east',
          enabled: true,
          secret: false,
          description: 'Region 🌍 selector'
        }
      ]
    };

    expect(output).toEqual(expected);
  });

  it('should parse @description with double-quoted \\n escape sequence as LF', () => {
    const input = `
vars {
  @description("First\\nSecond\\nThird")
  note: val
}`;

    const output = parser(input);
    expect(output.variables[0]).toMatchObject({
      name: 'note',
      value: 'val',
      description: 'First\nSecond\nThird'
    });
  });

  it('should parse @description with double-quoted \\r\\n escape sequence as CRLF', () => {
    const input = `
vars {
  @description("Line one\\r\\nLine two")
  note: val
}`;

    const output = parser(input);
    expect(output.variables[0]).toMatchObject({
      name: 'note',
      value: 'val',
      description: 'Line one\r\nLine two'
    });
  });

  it('should parse triple-quoted @description with literal newlines', () => {
    const input = `
vars {
  @description('''
    Line one
    Line two
  ''')
  note: val
}`;

    const output = parser(input);
    expect(output.variables[0]).toMatchObject({
      name: 'note',
      value: 'val',
      description: 'Line one\nLine two'
    });
  });

  it('should parse multiple multiline variables', () => {
    const input = `
vars {
  config: '''
    debug=true
    port=3000
  '''
  template: '''
    <html>
      <body>Hello World</body>
    </html>
  '''
}`;

    const output = parser(input);
    const expected = {
      variables: [
        {
          name: 'config',
          value: 'debug=true\nport=3000',
          enabled: true,
          secret: false
        },
        {
          name: 'template',
          value: '<html>\n  <body>Hello World</body>\n</html>',
          enabled: true,
          secret: false
        }
      ]
    };

    expect(output).toEqual(expected);
  });

  it('consecutive @description prefixes: first orphaned becomes empty row, last applies to key', () => {
    const input = `
vars {
  @description('''Single-line desc''')
  host: http://localhost:3000
  @description('''empty description''')
  @description('''
    Line one
    Line two
  ''')
  token: abc123
  plain: no-description
  @description("has ''' triple quotes inside")
  tricky: value
}`;

    const output = parser(input);
    expect(output.variables).toHaveLength(5);

    // host — single-line description
    expect(output.variables[0]).toMatchObject({
      name: 'host',
      value: 'http://localhost:3000',
      enabled: true,
      secret: false,
      description: 'Single-line desc'
    });

    // orphaned @description('''empty description''') — becomes an empty-key row with that description
    expect(output.variables[1]).toMatchObject({
      name: '',
      value: '',
      enabled: true,
      secret: false,
      description: 'empty description'
    });

    // token — gets the LAST (multiline) description; the first was consumed by the orphaned row above
    expect(output.variables[2]).toMatchObject({
      name: 'token',
      value: 'abc123',
      enabled: true,
      secret: false,
      description: 'Line one\nLine two'
    });

    // plain — no description
    expect(output.variables[3]).toMatchObject({
      name: 'plain',
      value: 'no-description',
      enabled: true,
      secret: false
    });
    expect(output.variables[3].description).toBeUndefined();

    // tricky — description containing ''' stored as double-quoted form
    expect(output.variables[4]).toMatchObject({
      name: 'tricky',
      value: 'value',
      enabled: true,
      secret: false,
      description: 'has \'\'\' triple quotes inside'
    });
  });
});
