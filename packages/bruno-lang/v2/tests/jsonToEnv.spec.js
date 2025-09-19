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
