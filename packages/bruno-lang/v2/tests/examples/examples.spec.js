const fs = require('fs');
const path = require('path');
const bruToJson = require('../../src/bruToJson');
const jsonToBru = require('../../src/jsonToBru');

describe('Examples functionality', () => {
  describe('Fixture-based tests', () => {
    it('should parse examples-simple.bru correctly', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'examples-simple.bru'), 'utf8');
      const expected = require('./fixtures/examples-simple.json');
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });

    it('should parse examples-complex.bru correctly', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'examples-complex.bru'), 'utf8');
      const output = bruToJson(input);

      // Basic structure validation
      expect(output.meta).toBeDefined();
      expect(output.http).toBeDefined();
      expect(output.examples).toBeDefined();
      expect(Array.isArray(output.examples)).toBe(true);
      expect(output.examples).toHaveLength(3);

      // Check each example has the expected structure
      output.examples.forEach((example, index) => {
        expect(example.meta).toBeDefined();
        expect(example.http).toBeDefined();
        expect(example.headers).toBeDefined();
        expect(example.auth).toBeDefined();
        expect(example.body).toBeDefined();
        if (example.response) {
          expect(example.response.status).toBeDefined();
          expect(example.response.body).toBeDefined();
        }
      });

      // Check specific examples
      const jsonExample = output.examples[0];
      expect(jsonExample.meta.name).toBe('JSON API Example');
      expect(jsonExample.http.method).toBe('post');
      expect(jsonExample.auth.basic).toBeDefined();
      expect(jsonExample.body.json).toContain('"format": "json"');

      const xmlExample = output.examples[1];
      expect(xmlExample.meta.name).toBe('XML API Example');
      expect(xmlExample.auth.bearer).toBeDefined();
      expect(xmlExample.body.xml).toContain('<format>xml</format>');

      const textExample = output.examples[2];
      expect(textExample.meta.name).toBe('Text API Example');
      expect(textExample.auth.apikey).toBeDefined();
    });
  });

  describe('Basic examples parsing', () => {
    it('should parse a single example block', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'bruToJson-single-example.bru'), 'utf8');
      const expected = require('./fixtures/bruToJson-single-example.json');
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });

    it('should parse multiple example blocks', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'bruToJson-multiple-examples.bru'), 'utf8');
      const expected = require('./fixtures/bruToJson-multiple-examples.json');
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });

    it('should handle examples with response blocks', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'bruToJson-response-example.bru'), 'utf8');
      const expected = require('./fixtures/bruToJson-response-example.json');
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });
  });

  describe('Examples with different body types', () => {
    it('should handle examples with JSON body', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'bruToJson-json-body.bru'), 'utf8');
      const expected = require('./fixtures/bruToJson-json-body.json');
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });

    it('should handle examples with XML body', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'bruToJson-xml-body.bru'), 'utf8');
      const expected = require('./fixtures/bruToJson-xml-body.json');
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });

    it('should handle examples with text body', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'bruToJson-text-body.bru'), 'utf8');
      const expected = require('./fixtures/bruToJson-text-body.json');
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });
  });

  describe('Examples with authentication', () => {
    it('should handle examples with basic auth', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'bruToJson-basic-auth.bru'), 'utf8');
      const expected = require('./fixtures/bruToJson-basic-auth.json');
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });

    it('should handle examples with bearer token', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'bruToJson-bearer-auth.bru'), 'utf8');
      const expected = require('./fixtures/bruToJson-bearer-auth.json');
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty example blocks', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'bruToJson-empty-example.bru'), 'utf8');
      const expected = require('./fixtures/bruToJson-empty-example.json');
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });

    it('should handle malformed example content gracefully', () => {
      const input = `
meta {
  name: Test API
  type: http
}

example {
  meta {
    name: Malformed Example
    type: http
  }
  
  invalid-syntax {
    this is not valid bru syntax
  }
}`;

      const result = bruToJson(input);

      expect(result.examples).toBeDefined();
      expect(result.examples).toHaveLength(1);
      // Should handle malformed content gracefully - may contain error
      expect(result.examples[0]).toBeDefined();
      // Either parsed successfully or contains error
      expect(result.examples[0].error || result.examples[0].meta).toBeDefined();
    });

    it('should work without any examples', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'bruToJson-no-examples.bru'), 'utf8');
      const expected = require('./fixtures/bruToJson-no-examples.json');
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });
  });

  describe('Complex examples', () => {
    it('should handle examples with all features', () => {
      const input = `
meta {
  name: Complex API
  type: http
}

get {
  url: https://api.example.com/test
}

example {
  meta {
    name: Complete Example
    type: http
  }
  
  post {
    url: https://api.example.com/users
  }
  
  headers {
    content-type: application/json
    authorization: Bearer token123
  }
  
  params:query {
    page: 1
    limit: 10
  }
  
  auth:oauth2 {
    grant_type: client_credentials
    client_id: test-client
    client_secret: test-secret
    access_token_url: https://auth.example.com/token
  }
  
  body:json {
    {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
  
  script:pre-request {
    console.log('Making request to create user');
  }
  
  script:post-response {
    console.log('User created successfully');
  }
  
  response:headers {
    content-type: application/json
    location: https://api.example.com/users/123
  }
  
  response:status {
    code: 201
  }
  
  response:body {
    {
      "id": 123,
      "name": "John Doe",
      "email": "john@example.com",
      "created_at": "2023-01-15T10:30:00Z"
    }
  }
}`;

      const result = bruToJson(input);

      expect(result.examples).toBeDefined();
      expect(result.examples).toHaveLength(1);

      const example = result.examples[0];

      // Check all features are present
      expect(example.meta).toBeDefined();
      expect(example.http).toBeDefined();
      expect(example.headers).toBeDefined();
      expect(example.params).toBeDefined();
      expect(example.auth).toBeDefined();
      expect(example.body).toBeDefined();
      expect(example.script).toBeDefined();
      expect(example.response).toBeDefined();

      // Check specific values
      expect(example.meta.name).toBe('Complete Example');
      expect(example.http.method).toBe('post');
      expect(example.headers).toHaveLength(2);
      expect(example.params).toHaveLength(2);
      expect(example.auth.oauth2).toBeDefined();
      expect(example.body.json).toContain('"name": "John Doe"');
      expect(example.script.req).toContain('Making request');
      expect(example.script.res).toContain('User created successfully');
      expect(example.response.status.code).toBe('201');
      expect(example.response.body).toContain('"id": 123');
    });
  });

  describe('jsonToBru conversion', () => {
    it('should convert JSON with examples to BRU format', () => {
      const jsonInput = require('./fixtures/jsonToBru-simple.json');
      const expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'jsonToBru-simple.bru'), 'utf8');
      const output = jsonToBru(jsonInput);

      expect(output).toEqual(expected);
    });

    it('should handle multiple examples correctly', () => {
      const jsonInput = require('./fixtures/jsonToBru-multiple.json');
      const expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'jsonToBru-multiple.bru'), 'utf8');
      const output = jsonToBru(jsonInput);

      expect(output).toEqual(expected);
    });

    it('should handle examples with response blocks', () => {
      const jsonInput = require('./fixtures/jsonToBru-response.json');
      const expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'jsonToBru-response.bru'), 'utf8');
      const output = jsonToBru(jsonInput);

      expect(output).toEqual(expected);
    });

    it('should handle examples with authentication', () => {
      const jsonInput = require('./fixtures/jsonToBru-auth.json');
      const expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'jsonToBru-auth.bru'), 'utf8');
      const output = jsonToBru(jsonInput);

      expect(output).toEqual(expected);
    });

    it('should handle examples with different body types', () => {
      const jsonInput = require('./fixtures/jsonToBru-bodytypes.json');
      const expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'jsonToBru-bodytypes.bru'), 'utf8');
      const output = jsonToBru(jsonInput);

      expect(output).toEqual(expected);
    });

    it('should handle round-trip conversion correctly', () => {
      const originalBru = fs.readFileSync(path.join(__dirname, 'fixtures', 'examples-simple.bru'), 'utf8');
      const jsonFromBru = bruToJson(originalBru);
      const bruFromJson = jsonToBru(jsonFromBru);
      const jsonFromBruAgain = bruToJson(bruFromJson);

      // The examples should be preserved through the round-trip
      expect(jsonFromBruAgain.examples).toBeDefined();
      expect(Array.isArray(jsonFromBruAgain.examples)).toBe(true);
      expect(jsonFromBruAgain.examples).toHaveLength(2);
      expect(jsonFromBruAgain.examples[0].meta.name).toBe('Get User by ID');
      expect(jsonFromBruAgain.examples[1].meta.name).toBe('Create New User');
    });

    it('should handle empty examples array', () => {
      const jsonInput = {
        meta: {
          name: 'No Examples API',
          type: 'http'
        },
        http: {
          method: 'get',
          url: 'https://api.example.com/test'
        },
        examples: []
      };

      const expected = `meta {
  name: No Examples API
  type: http
}

get {
  url: https://api.example.com/test
}
`;

      const output = jsonToBru(jsonInput);

      expect(output).toEqual(expected);
    });

    it('should handle examples without meta block', () => {
      const jsonInput = {
        meta: {
          name: 'Test API',
          type: 'http'
        },
        http: {
          method: 'get',
          url: 'https://api.example.com/test'
        },
        examples: [
          {
            http: {
              method: 'post',
              url: 'https://api.example.com/example'
            },
            headers: [
              {
                name: 'authorization',
                value: 'Bearer token123',
                enabled: true
              }
            ]
          }
        ]
      };

      const expected = `meta {
  name: Test API
  type: http
}

get {
  url: https://api.example.com/test
}

example {
  post {
    url: https://api.example.com/example
  }
  
  headers {
    authorization: Bearer token123
  }
  
}
`;

      const output = jsonToBru(jsonInput);

      expect(output).toEqual(expected);
    });
  });
});
