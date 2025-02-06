const { stringifyRequest } = require('../../src');
const yaml = require('js-yaml');
const path = require('path');
const fs = require('fs');

describe('GraphQL Request Handling', () => {
  const loadFixture = (filename) => {
    const filePath = path.join(__dirname, '__fixtures__', filename);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  };

  it('should generate exact YAML matching the fixture', () => {
    const json = loadFixture('graphql-request.json');
    const expectedYaml = fs.readFileSync(
      path.join(__dirname, '__fixtures__', 'graphql-request.yml'),
      'utf8'
    );
    const generatedYaml = stringifyRequest(json);

    // Normalize line endings and whitespace for comparison
    const normalizeString = (str) => str.replace(/\r\n/g, '\n').trim();
    expect(normalizeString(generatedYaml)).toBe(normalizeString(expectedYaml));
  });

  it('should correctly format GraphQL request', () => {
    const json = loadFixture('graphql-request.json');
    const result = yaml.load(stringifyRequest(json));

    // Verify GraphQL section exists instead of HTTP
    expect(result.graphql).toBeDefined();
    expect(result.http).toBeUndefined();

    // Verify basic properties
    expect(result.graphql.method).toBe('post');
    expect(result.graphql.url).toBe('https://api.example.com/graphql');

    // Verify headers
    expect(result.graphql.headers).toHaveLength(1);
    expect(result.graphql.headers[0]).toEqual({
      name: 'Content-Type',
      value: 'application/json'
    });

    // Verify body
    expect(result.graphql.body).toEqual({
      type: 'graphql',
      query: 'query GetUser($id: ID!) {\n  user(id: $id) {\n    id\n    name\n    email\n  }\n}',
      variables: '{\n  \"id\": \"123\"\n}'
    });

    // Verify auth
    expect(result.graphql.auth).toEqual({
      type: 'bearer',
      bearer: {
        token: 'jwt-token'
      }
    });

    // Verify vars
    expect(result.vars['pre-request']).toHaveLength(1);
    expect(result.vars['pre-request'][0]).toEqual({
      name: 'userId',
      value: '123'
    });

    // Verify scripts
    expect(result.scripts['pre-request']).toBe('// Pre-request script for GraphQL');
  });

  it('should handle GraphQL request without variables', () => {
    const json = loadFixture('graphql-request.json');
    json.request.body.graphql.variables = '';

    const result = yaml.load(stringifyRequest(json));
    expect(result.graphql.body.variables).toBe('');
  });

  it('should handle GraphQL request without optional components', () => {
    const json = loadFixture('graphql-request.json');
    
    // Remove optional components
    delete json.request.auth;
    delete json.request.vars;
    delete json.request.script;

    const result = yaml.load(stringifyRequest(json));

    expect(result.graphql.auth).toEqual({ type: 'none' });
    expect(result.vars).toBeUndefined();
    expect(result.scripts).toBeUndefined();
  });

  it('should detect GraphQL request based on body mode', () => {
    const json = loadFixture('graphql-request.json');
    
    // Change URL but keep GraphQL body
    json.request.url = 'https://api.example.com/not-graphql';
    const result = yaml.load(stringifyRequest(json));
    
    expect(result.graphql).toBeDefined();
    expect(result.http).toBeUndefined();
  });
}); 