const envToJson = require('../src/envToJson');

describe('env comments', () => {
  it('should parse # comments in env file', () => {
    const input = `# Environment configuration
vars {
  API_KEY: secret123
  BASE_URL: https://api.example.com
}`;

    const output = envToJson(input);
    expect(output).toEqual({
      variables: [
        { name: 'API_KEY', value: 'secret123', secret: false, enabled: true },
        { name: 'BASE_URL', value: 'https://api.example.com', secret: false, enabled: true }
      ]
    });
  });

  it('should parse // comments in env file', () => {
    const input = `// Environment configuration
vars {
  API_KEY: secret123
  BASE_URL: https://api.example.com
}`;

    const output = envToJson(input);
    expect(output).toEqual({
      variables: [
        { name: 'API_KEY', value: 'secret123', secret: false, enabled: true },
        { name: 'BASE_URL', value: 'https://api.example.com', secret: false, enabled: true }
      ]
    });
  });

  it('should parse comments between vars and secretvars', () => {
    const input = `vars {
  API_KEY: secret123
}

# Secret variables below
vars:secret [
  PASSWORD
]`;

    const output = envToJson(input);
    expect(output).toEqual({
      variables: [
        { name: 'API_KEY', value: 'secret123', secret: false, enabled: true },
        { name: 'PASSWORD', value: '', secret: true, enabled: true }
      ]
    });
  });
});
