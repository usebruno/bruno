const { stringifyRequest } = require('../../src');
const yaml = require('js-yaml');
const path = require('path');
const fs = require('fs');

describe('HTTP Request Handling', () => {
  const loadFixture = (filename) => {
    const filePath = path.join(__dirname, '__fixtures__', filename);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  };

  it('should generate exact YAML matching the fixture', () => {
    const json = loadFixture('http-request.json');
    const expectedYaml = fs.readFileSync(
      path.join(__dirname, '__fixtures__', 'http-request.yml'),
      'utf8'
    );
    const generatedYaml = stringifyRequest(json);

    // Normalize line endings and whitespace for comparison
    const normalizeString = (str) => str.replace(/\r\n/g, '\n').trim();
    expect(normalizeString(generatedYaml)).toBe(normalizeString(expectedYaml));
  });

  it('should correctly format basic HTTP request', () => {
    const json = loadFixture('http-request.json');
    const result = yaml.load(stringifyRequest(json));

    // Verify HTTP section exists instead of GraphQL
    expect(result.http).toBeDefined();
    expect(result.graphql).toBeUndefined();

    // Verify basic properties
    expect(result.meta.name).toBe('HTTP Methods');
    expect(result.meta.seq).toBe(1);
    expect(result.http.method).toBe('post');
    expect(result.http.url).toBe('https://api.example.com/users');
  });

  it('should handle request with query parameters', () => {
    const json = loadFixture('http-request.json');
    const result = yaml.load(stringifyRequest(json));

    expect(result.http.params.query).toEqual([
      {
        name: 'filter',
        value: 'active',
        type: 'query',
        disabled: true
      }
    ]);
  });

  it('should handle request with path parameters', () => {
    const json = loadFixture('http-request.json');
    const result = yaml.load(stringifyRequest(json));

    expect(result.http.params.path).toEqual([
      {
        name: 'userId',
        value: '123',
        type: 'path',
        description: 'User ID parameter'
      }
    ]);
  });

  it('should handle request with headers', () => {
    const json = loadFixture('http-request.json');
    const result = yaml.load(stringifyRequest(json));

    expect(result.http.headers).toEqual([
      {
        name: 'Content-Type',
        value: 'application/json',
        description: 'Content type header'
      },
      {
        name: 'Accept',
        value: 'application/json',
        disabled: true
      }
    ]);
  });

  describe('Body Handling', () => {
    it('should handle JSON body', () => {
      const json = loadFixture('http-request.json');
      const result = yaml.load(stringifyRequest(json));

      expect(result.http.body).toEqual({
        type: 'json',
        data: '{\n  "name": "John Doe",\n  "email": "john@example.com"\n}'
      });
    });

    it('should handle form-urlencoded body', () => {
      const json = loadFixture('http-request.json');
      json.request.body = {
        mode: 'formUrlEncoded',
        formUrlEncoded: [
          { name: 'username', value: 'johndoe', description: 'Username field', enabled: true },
          { name: 'password', value: 'secret', enabled: false }
        ]
      };
      const result = yaml.load(stringifyRequest(json));

      expect(result.http.body).toEqual({
        type: 'form-urlencoded',
        data: [
          { name: 'username', value: 'johndoe', description: 'Username field' },
          { name: 'password', value: 'secret', disabled: true }
        ]
      });
    });

    it('should handle multipart-form body', () => {
      const json = loadFixture('http-request.json');
      json.request.body = {
        mode: 'multipartForm',
        multipartForm: [
          { name: 'file', value: ['path/to/file'], type: 'file', enabled: true },
          { name: 'description', value: 'profile photo', type: 'text', enabled: true }
        ]
      };
      const result = yaml.load(stringifyRequest(json));

      expect(result.http.body).toEqual({
        type: 'multipart-form',
        data: [
          { name: 'file', value: ['path/to/file'], type: 'file' },
          { name: 'description', value: 'profile photo', type: 'text' }
        ]
      });
    });
  });

  describe('Auth Handling', () => {
    it('should handle basic auth', () => {
      const json = loadFixture('http-request.json');
      const result = yaml.load(stringifyRequest(json));

      expect(result.http.auth).toEqual({
        type: 'basic',
        basic: {
          username: 'admin',
          password: 'secret'
        }
      });
    });

    it('should handle bearer auth', () => {
      const json = loadFixture('http-request.json');
      json.request.auth = {
        mode: 'bearer',
        bearer: { token: 'xyz123' }
      };
      const result = yaml.load(stringifyRequest(json));

      expect(result.http.auth).toEqual({
        type: 'bearer',
        bearer: {
          token: 'xyz123'
        }
      });
    });

    it('should handle oauth2 password grant', () => {
      const json = loadFixture('http-request.json');
      json.request.auth = {
        mode: 'oauth2',
        oauth2: {
          grantType: 'password',
          accessTokenUrl: 'https://api.example.com/oauth/token',
          username: 'user',
          password: 'pass',
          clientId: 'client123',
          clientSecret: 'secret123',
          scope: 'read write'
        }
      };
      const result = yaml.load(stringifyRequest(json));

      expect(result.http.auth).toEqual({
        type: 'oauth2',
        oauth2: {
          grant_type: 'password',
          access_token_url: 'https://api.example.com/oauth/token',
          username: 'user',
          password: 'pass',
          client_id: 'client123',
          client_secret: 'secret123',
          scope: 'read write'
        }
      });
    });
  });

  describe('Variables and Scripts', () => {
    it('should handle pre-request variables', () => {
      const json = loadFixture('http-request.json');
      const result = yaml.load(stringifyRequest(json));

      expect(result.vars['pre-request']).toEqual([
        { name: 'userId', value: '123', description: 'User ID variable' }
      ]);
    });

    it('should handle post-response variables', () => {
      const json = loadFixture('http-request.json');
      const result = yaml.load(stringifyRequest(json));

      expect(result.vars['post-response']).toEqual([
        { name: 'token', value: 'response.token', disabled: true }
      ]);
    });

    it('should handle scripts', () => {
      const json = loadFixture('http-request.json');
      const result = yaml.load(stringifyRequest(json));

      expect(result.scripts['pre-request']).toBe('// Pre-request script\nconsole.log(\'pre-request\');');
      expect(result.scripts['post-response']).toBe('// Post-response script\nconsole.log(\'post-response\');');
    });
  });

  it('should handle tests and docs', () => {
    const json = loadFixture('http-request.json');
    const result = yaml.load(stringifyRequest(json));

    expect(result.tests).toBe('// Test script\nassert.response.status === 200;');
    expect(result.docs).toBe('# User Creation API\nThis endpoint creates a new user.');
  });

  it('should handle disabled components', () => {
    const json = loadFixture('http-request.json');
    json.request.headers[0].enabled = false;
    json.request.params[0].enabled = false;
    const result = yaml.load(stringifyRequest(json));

    expect(result.http.headers[0].disabled).toBe(true);
    expect(result.http.params.query[0].disabled).toBe(true);
  });
});
