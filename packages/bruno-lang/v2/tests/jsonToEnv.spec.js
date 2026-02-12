const parser = require('../src/jsonToEnv');

describe('jsonToEnv', () => {
  it('should stringify empty vars', () => {
    const input = {
      variables: []
    };

    const output = parser(input);
    const expected = `vars {
}
`;

    expect(output).toEqual(expected);
  });

  it('should stringify single var line', () => {
    const input = {
      variables: [
        {
          name: 'url',
          value: 'http://localhost:3000',
          enabled: true
        }
      ]
    };

    const output = parser(input);
    const expected = `vars {
  url: http://localhost:3000
}
`;
    expect(output).toEqual(expected);
  });

  it('should stringify multiple var lines', () => {
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
      ]
    };

    const expected = `vars {
  url: http://localhost:3000
  ~port: 3000
}
`;
    const output = parser(input);
    expect(output).toEqual(expected);
  });

  it('should stringify description in vars (triple-quoted when single-line)', () => {
    const input = {
      variables: [
        {
          name: 'url',
          value: 'http://localhost:3000',
          enabled: true,
          description: 'Base API URL.'
        }
      ]
    };

    const output = parser(input);
    expect(output).toEqual(`vars {
  @description('''Base API URL.''')
  url: http://localhost:3000
}
`);
  });

  it('should stringify multiline description with triple-quoted literal newlines', () => {
    const input = {
      variables: [
        {
          name: 'url',
          value: 'http://localhost:3000',
          enabled: true,
          description: 'Line one\nLine two'
        }
      ]
    };

    const output = parser(input);
    expect(output).toContain('@description(\'\'\'\n    Line one\n    Line two\n  \'\'\')');
  });

  it('should stringify description with emoji (single-line triple-quoted)', () => {
    const input = {
      variables: [
        {
          name: 'token',
          value: 'secret',
          enabled: true,
          description: 'API key 🔐 required'
        }
      ]
    };

    const output = parser(input);
    expect(output).toContain('@description(\'\'\'API key 🔐 required\'\'\')');
    expect(output).toContain('token: secret');
  });

  it('should stringify multiline description with emoji using triple-quoted literal newlines', () => {
    const input = {
      variables: [
        {
          name: 'note',
          value: 'val',
          enabled: true,
          description: 'Launch 🚀\nSecond line'
        }
      ]
    };

    const output = parser(input);
    expect(output).toContain('@description(\'\'\'\n    Launch 🚀\n    Second line\n  \'\'\')');
  });

  it('should stringify description with LF (\\n) as multiline triple-quoted', () => {
    const input = {
      variables: [
        {
          name: 'note',
          value: 'val',
          enabled: true,
          description: 'First\nSecond\nThird'
        }
      ]
    };

    const output = parser(input);
    expect(output).toContain('@description(\'\'\'\n    First\n    Second\n    Third\n  \'\'\')');
  });

  it('should stringify description with CRLF (\\r\\n) as multiline triple-quoted with LF normalization', () => {
    const input = {
      variables: [
        {
          name: 'note',
          value: 'val',
          enabled: true,
          description: 'Line one\r\nLine two'
        }
      ]
    };

    const output = parser(input);
    // indentString normalizes \r\n to \n when serializing
    expect(output).toContain('@description(\'\'\'\n    Line one\n    Line two\n  \'\'\')');
  });

  it('should stringify secret vars', () => {
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
      ]
    };

    const output = parser(input);
    const expected = `vars {
  url: http://localhost:3000
}
vars:secret [
  token
]
`;
    expect(output).toEqual(expected);
  });

  it('should stringify multiple secret vars', () => {
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
      ]
    };

    const output = parser(input);
    const expected = `vars {
  url: http://localhost:3000
}
vars:secret [
  access_token,
  ~access_secret
]
`;
    expect(output).toEqual(expected);
  });

  it('should stringify even if the only secret vars are present', () => {
    const input = {
      variables: [
        {
          name: 'token',
          value: 'abracadabra',
          enabled: true,
          secret: true
        }
      ]
    };

    const output = parser(input);
    const expected = `vars:secret [
  token
]
`;
    expect(output).toEqual(expected);
  });

  it('should emit @description prefix even for multiline variables', () => {
    const input = {
      variables: [
        {
          name: 'json_data',
          value: '{\n  "name": "test"\n}',
          enabled: true,
          description: 'A multiline JSON blob'
        }
      ]
    };

    const output = parser(input);
    expect(output).toEqual(`vars {
  @description('''A multiline JSON blob''')
  json_data: '''
    {
      "name": "test"
    }
  '''
}
`);
  });

  it('should stringify multiline variables', () => {
    const input = {
      variables: [
        {
          name: 'json_data',
          value: '{\n  "name": "test",\n  "value": 123\n}',
          enabled: true
        }
      ]
    };

    const output = parser(input);
    const expected = `vars {
  json_data: '''
    {
      "name": "test",
      "value": 123
    }
  '''
}
`;
    expect(output).toEqual(expected);
  });

  it('should stringify multiline variables containing indentation', () => {
    const input = {
      variables: [
        {
          name: 'script',
          value: 'function test() {\n  console.log("hello");\n  return true;\n}',
          enabled: true
        }
      ]
    };

    const output = parser(input);
    const expected = `vars {
  script: '''
    function test() {
      console.log("hello");
      return true;
    }
  '''
}
`;
    expect(output).toEqual(expected);
  });

  it('should stringify disabled multiline variable', () => {
    const input = {
      variables: [
        {
          name: 'disabled_multiline',
          value: 'line 1\nline 2\nline 3',
          enabled: false
        }
      ]
    };

    const output = parser(input);
    const expected = `vars {
  ~disabled_multiline: '''
    line 1
    line 2
    line 3
  '''
}
`;
    expect(output).toEqual(expected);
  });

  it('should stringify multiple multiline variables', () => {
    const input = {
      variables: [
        {
          name: 'config',
          value: 'debug=true\nport=3000',
          enabled: true
        },
        {
          name: 'template',
          value: '<html>\n  <body>Hello World</body>\n</html>',
          enabled: true
        }
      ]
    };

    const output = parser(input);
    const expected = `vars {
  config: '''
    debug=true
    port=3000
  '''
  template: '''
    <html>
      <body>Hello World</body>
    </html>
  '''
}
`;
    expect(output).toEqual(expected);
  });
});
