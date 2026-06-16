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

  describe('typed environment variables', () => {
    it('should parse @number decorator and coerce value to number', () => {
      const input = `
vars {
  @number
  port: 3000
}
`;

      const output = parser(input);
      expect(output).toEqual({
        variables: [
          {
            name: 'port',
            value: 3000,
            enabled: true,
            secret: false,
            annotations: [{ name: 'number' }],
            dataType: 'number'
          }
        ]
      });
    });

    it('should parse @boolean decorator and coerce value to boolean', () => {
      const input = `
vars {
  @boolean
  isEnabled: true
}
`;

      const output = parser(input);
      expect(output.variables[0]).toEqual({
        name: 'isEnabled',
        value: true,
        enabled: true,
        secret: false,
        annotations: [{ name: 'boolean' }],
        dataType: 'boolean'
      });
    });

    it('should parse @object decorator and coerce multiline JSON value', () => {
      const input = `
vars {
  @object
  config: '''
    {"a": 1, "b": "x"}
  '''
}
`;

      const output = parser(input);
      expect(output.variables[0]).toEqual({
        name: 'config',
        value: { a: 1, b: 'x' },
        enabled: true,
        secret: false,
        annotations: [{ name: 'object' }],
        dataType: 'object'
      });
    });

    it('should leave plain vars without dataType', () => {
      const input = `
vars {
  apiKey: abc123
}
`;

      const output = parser(input);
      expect(output.variables[0]).toEqual({
        name: 'apiKey',
        value: 'abc123',
        enabled: true,
        secret: false
      });
      expect(output.variables[0].dataType).toBeUndefined();
    });

    it('extracts the dataType from a secret var decorator', () => {
      const input = `
vars:secret [
  @number
  api_key
]
`;

      const output = parser(input);
      expect(output.variables[0].secret).toBe(true);
      expect(output.variables[0].dataType).toBe('number');
    });

    it('leaves a bare secret var without a dataType', () => {
      const input = `
vars:secret [
  api_key
]
`;

      const output = parser(input);
      expect(output.variables[0].secret).toBe(true);
      expect(output.variables[0].dataType).toBeUndefined();
    });

    it('should preserve the declared dataType and the raw value when coercion is impossible', () => {
      // The UI's DataTypeSelector surfaces a warning icon for these rows; the
      // declared dataType is retained so the user sees their intent.
      const input = `
vars {
  @number
  port: not-a-number
  @boolean
  flag: maybe
  @object
  config: plain
}
`;

      const output = parser(input);
      expect(output.variables).toEqual([
        {
          name: 'port',
          value: 'not-a-number',
          enabled: true,
          secret: false,
          annotations: [{ name: 'number' }],
          dataType: 'number'
        },
        {
          name: 'flag',
          value: 'maybe',
          enabled: true,
          secret: false,
          annotations: [{ name: 'boolean' }],
          dataType: 'boolean'
        },
        {
          name: 'config',
          value: 'plain',
          enabled: true,
          secret: false,
          annotations: [{ name: 'object' }],
          dataType: 'object'
        }
      ]);
    });

    it('should keep only the last dataType when multiple are stacked', () => {
      const input = `
vars {
  @object
  @number
  port: 3000
}
`;

      const output = parser(input);
      expect(output.variables[0].dataType).toBe('number');
      expect(output.variables[0].value).toBe(3000);
    });
  });
});
