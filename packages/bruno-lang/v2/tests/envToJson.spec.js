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
          annotations: [
            {
              name: 'description',
              value: 'Base API URL.'
            }
          ],
          description: 'Base API URL.'
        },
        {
          name: 'port',
          value: '3000',
          enabled: true,
          secret: false,
          annotations: [
            {
              name: 'description',
              value: 'Server port'
            }
          ],
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
          annotations: [
            {
              name: 'description',
              value: 'Disabled base URL'
            }
          ],
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
          annotations: [
            {
              name: 'description',
              value: 'API key 🔐 required'
            }
          ],
          description: 'API key 🔐 required'
        },
        {
          name: 'region',
          value: 'us-east',
          enabled: true,
          secret: false,
          annotations: [
            {
              name: 'description',
              value: 'Region 🌍 selector'
            }
          ],
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
      annotations: [
        {
          name: 'description',
          value: 'First\nSecond\nThird'
        }
      ],
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
      annotations: [
        {
          name: 'description',
          value: 'Line one\r\nLine two'
        }
      ],
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
      annotations: [
        {
          name: 'description',
          value: 'Line one\nLine two'
        }
      ],
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

  describe('extends', () => {
    it('should parse the parent environment declared before the vars block', () => {
      const input = `
extends: base
vars {
  url: http://localhost:3000
}
`;

      const output = parser(input);

      expect(output).toEqual({
        extends: 'base',
        variables: [{ name: 'url', value: 'http://localhost:3000', enabled: true, secret: false }]
      });
    });

    it('should parse the parent environment declared after the vars block', () => {
      const input = `
vars {
  url: http://localhost:3000
}
extends: base
`;

      const output = parser(input);

      expect(output.extends).toBe('base');
    });

    it('should parse the parent environment declared after the color', () => {
      const input = `
vars {
  url: http://localhost:3000
}
color: blue
extends: base
`;

      const output = parser(input);

      expect(output.color).toBe('blue');
      expect(output.extends).toBe('base');
    });

    it('should parse the blocks declared after the color', () => {
      const input = `
color: blue
extends: base
vars {
  url: http://localhost:3000
}
`;

      const output = parser(input);

      expect(output).toEqual({
        color: 'blue',
        extends: 'base',
        variables: [
          {
            name: 'url',
            value: 'http://localhost:3000',
            enabled: true,
            secret: false
          }
        ]
      });
    });

    it('should parse a parent name containing spaces', () => {
      const input = `
extends: Base Environment
vars {
}
`;

      const output = parser(input);

      expect(output.extends).toBe('Base Environment');
    });

    it('should omit extends when no parent is named', () => {
      const input = `
extends:
vars {
}
`;

      const output = parser(input);

      expect(output).toEqual({ variables: [] });
    });

    it('should leave extends absent for a file that does not declare it', () => {
      const input = `
vars {
  url: http://localhost:3000
}
color: blue
`;

      const output = parser(input);

      expect(output).not.toHaveProperty('extends');
    });

    it('should keep the last parent when extends is declared more than once', () => {
      const input = `
extends: base
extends: staging
vars {
}
`;

      const output = parser(input);

      expect(output.extends).toBe('staging');
    });

    it('should read a list of parents unresolved so that a save does not delete it', () => {
      const input = `
extends [
  base,
  staging
]
vars {
  url: http://localhost:3000
}
`;

      const output = parser(input);

      expect(output.extends).toEqual(['base', 'staging']);
    });

    it('should read a list of parents whose names contain spaces', () => {
      const input = `
extends [
  Base Environment,
  staging server
]
vars {
  url: http://localhost:3000
}
`;

      const output = parser(input);

      expect(output.extends).toEqual(['Base Environment', 'staging server']);
    });

    it('should read a quoted list entry whose name contains a comma as a single parent', () => {
      const input = `
extends [
  "acme, inc",
  staging
]
vars {
}
`;

      const output = parser(input);

      expect(output.extends).toEqual(['acme, inc', 'staging']);
    });

    it('should read a quoted list entry whose name contains brackets', () => {
      const input = `
extends [
  "env[1]",
  "[bracketed]",
  "list]end"
]
vars {
}
`;

      const output = parser(input);

      expect(output.extends).toEqual(['env[1]', '[bracketed]', 'list]end']);
    });

    it('should omit a quoted list entry whose escaped quote no environment name could carry', () => {
      const input = `
extends [
  "say \\"hi\\", ok"
]
vars {
}
`;

      const output = parser(input);

      expect(output).not.toHaveProperty('extends');
    });

    it('should omit the whole list when a bare entry carries a quote no environment name could carry', () => {
      const input = `
extends [
  a"b,
  staging
]
vars {
}
`;

      const output = parser(input);

      expect(output).not.toHaveProperty('extends');
    });

    it('should omit a parent named something no environment could be called', () => {
      const input = `
extends: reports/weekly
vars {
}
`;

      const output = parser(input);

      expect(output).not.toHaveProperty('extends');
    });

    it('should omit an empty list of parents', () => {
      const input = `
extends [
]
vars {
}
`;

      const output = parser(input);

      expect(output).not.toHaveProperty('extends');
    });

    it('should read a bracketed value after the colon as a parent name, the list form taking no colon', () => {
      const input = `
extends: [base, staging]
vars {
}
`;

      const output = parser(input);

      expect(output.extends).toBe('[base, staging]');
    });
  });
});
