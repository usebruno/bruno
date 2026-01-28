const fs = require('fs');
const path = require('path');
const bruToJson = require('../../src/bruToJson');
const jsonToBru = require('../../src/jsonToBru');

describe('Examples functionality', () => {
  describe('Fixture-based tests', () => {
    it('should parse examples-simple.bru correctly', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'bru', 'examples-simple.bru'), 'utf8');
      const expected = require('./fixtures/json/examples-simple.json');
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });

    it('should parse examples-complex.bru correctly', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'bru', 'examples-complex.bru'), 'utf8');
      const output = bruToJson(input);

      // Basic structure validation
      expect(output.meta).toBeDefined();
      expect(output.http).toBeDefined();
      expect(output.examples).toBeDefined();
      expect(Array.isArray(output.examples)).toBe(true);
      expect(output.examples).toHaveLength(3);

      // Check each example has the expected structure
      output.examples.forEach((example, index) => {
        expect(example.name).toBeDefined();
        expect(example.description).toBeDefined();
        expect(example.request).toBeDefined();
        expect(example.request.url).toBeDefined();
        if (example.response) {
          expect(example.response.status).toBeDefined();
          expect(example.response.body).toBeDefined();
        }
      });

      // Check specific examples
      const jsonExample = output.examples[0];
      expect(jsonExample.name).toBe('JSON API Example');
      expect(jsonExample.request.url).toBeDefined();
      if (jsonExample.request.body && jsonExample.request.body.json) {
        expect(jsonExample.request.body.json).toContain('"format": "json"');
      }

      const xmlExample = output.examples[1];
      expect(xmlExample.name).toBe('XML API Example');
      if (xmlExample.request.body && xmlExample.request.body.xml) {
        expect(xmlExample.request.body.xml).toContain('<format>xml</format>');
      }

      const textExample = output.examples[2];
      expect(textExample.name).toBe('Text API Example');
    });
  });

  describe('Basic examples parsing', () => {
    it('should parse a single example block', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'bru', 'bruToJson-single-example.bru'), 'utf8');
      const expected = require('./fixtures/json/bruToJson-single-example.json');
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });

    it('should parse multiple example blocks', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'bru', 'bruToJson-multiple-examples.bru'), 'utf8');
      const expected = require('./fixtures/json/bruToJson-multiple-examples.json');
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });

    it('should handle examples with response blocks', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'bru', 'bruToJson-response-example.bru'), 'utf8');
      const expected = require('./fixtures/json/bruToJson-response-example.json');
      const output = bruToJson(input);
      expect(output).toEqual(expected);
    });
  });

  describe('Examples with different body types', () => {
    it('should handle examples with JSON body', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'bru', 'bruToJson-json-body.bru'), 'utf8');
      const expected = require('./fixtures/json/bruToJson-json-body.json');
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });

    it('should handle examples with XML body', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'bru', 'bruToJson-xml-body.bru'), 'utf8');
      const expected = require('./fixtures/json/bruToJson-xml-body.json');
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });

    it('should handle examples with text body', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'bru', 'bruToJson-text-body.bru'), 'utf8');
      const expected = require('./fixtures/json/bruToJson-text-body.json');
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty example blocks', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'bru', 'bruToJson-empty-example.bru'), 'utf8');
      const expected = require('./fixtures/json/bruToJson-empty-example.json');
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });

    it('should work without any examples', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'bru', 'bruToJson-no-examples.bru'), 'utf8');
      const expected = require('./fixtures/json/bruToJson-no-examples.json');
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });
  });

  describe('jsonToBru conversion', () => {
    it('should convert JSON with examples to BRU format', () => {
      const jsonInput = require('./fixtures/json/jsonToBru-simple.json');
      const expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'bru', 'jsonToBru-simple.bru'), 'utf8');
      const output = jsonToBru(jsonInput);
      expect(output).toEqual(expected);
    });

    it('should handle multiple examples correctly', () => {
      const jsonInput = require('./fixtures/json/jsonToBru-multiple.json');
      const expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'bru', 'jsonToBru-multiple.bru'), 'utf8');
      const output = jsonToBru(jsonInput);

      expect(output).toEqual(expected);
    });

    it('should handle examples with response blocks', () => {
      const jsonInput = require('./fixtures/json/jsonToBru-response.json');
      const expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'bru', 'jsonToBru-response.bru'), 'utf8');
      const output = jsonToBru(jsonInput);
      expect(output).toEqual(expected);
    });

    it('should handle examples with different body types', () => {
      const jsonInput = require('./fixtures/json/jsonToBru-bodytypes.json');
      const expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'bru', 'jsonToBru-bodytypes.bru'), 'utf8');
      const output = jsonToBru(jsonInput);

      expect(output).toEqual(expected);
    });

    it('should handle round-trip conversion correctly', () => {
      const originalBru = fs.readFileSync(path.join(__dirname, 'fixtures', 'bru', 'examples-simple.bru'), 'utf8');
      const jsonFromBru = bruToJson(originalBru);
      const bruFromJson = jsonToBru(jsonFromBru);
      const jsonFromBruAgain = bruToJson(bruFromJson);

      // The examples should be preserved through the round-trip
      expect(jsonFromBruAgain.examples).toBeDefined();
      expect(Array.isArray(jsonFromBruAgain.examples)).toBe(true);
      expect(jsonFromBruAgain.examples).toHaveLength(2);
      expect(jsonFromBruAgain.examples[0].name).toBe('Get User by ID');
      expect(jsonFromBruAgain.examples[1].name).toBe('Create New User');
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

    it('should handle examples with minimal structure', () => {
      const jsonInput = {
        meta: {
          name: 'Test API',
          type: 'http'
        },
        http: {
          url: 'https://api.example.com/test',
          method: 'get'
        },
        examples: [
          {
            name: 'Example Request',
            description: 'A simple example',
            request: {
              url: 'https://api.example.com/example',
              method: 'get'
            }
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
  name: Example Request
  description: A simple example
  
  request: {
    url: https://api.example.com/example
    method: get
  }
}
`;

      const output = jsonToBru(jsonInput);

      expect(output).toEqual(expected);
    });

    it('should handle examples without description', () => {
      const jsonInput = {
        meta: {
          name: 'Test API',
          type: 'http'
        },
        http: {
          url: 'https://api.example.com/test',
          method: 'get'
        },
        examples: [
          {
            name: 'Example Request',
            request: {
              url: 'https://api.example.com/example',
              method: 'get'
            }
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
  name: Example Request
  
  request: {
    url: https://api.example.com/example
    method: get
  }
}
`;

      const output = jsonToBru(jsonInput);

      expect(output).toEqual(expected);
    });
  });

  describe('Complex examples with auth', () => {
    it('should parse complex-with-auth.bru correctly', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'bru', 'complex-with-auth.bru'), 'utf8');
      const expected = require('./fixtures/json/complex-with-auth.json');
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });

    it('should parse form-data-complex.bru correctly', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'bru', 'form-data-complex.bru'), 'utf8');
      const expected = require('./fixtures/json/form-data-complex.json');
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });

    it('should parse multiple-examples-variations.bru correctly', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'bru', 'multiple-examples-variations.bru'), 'utf8');
      const expected = require('./fixtures/json/multiple-examples-variations.json');
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });

    it('should parse oauth2-examples.bru correctly', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'bru', 'oauth2-examples.bru'), 'utf8');
      const expected = require('./fixtures/json/oauth2-examples.json');
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });

    describe('jsonToBru conversion for complex fixtures', () => {
      it('should convert complex-with-auth.json to BRU format and preserve examples', () => {
        const jsonInput = require('./fixtures/json/complex-with-auth.json');
        const expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'bru', 'complex-with-auth.bru'), 'utf8');
        const output = jsonToBru(jsonInput);
        expect(output).toEqual(expected);
      });

      it('should convert form-data-complex.json to BRU format and preserve examples', () => {
        const jsonInput = require('./fixtures/json/form-data-complex.json');
        const expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'bru', 'form-data-complex.bru'), 'utf8');
        const output = jsonToBru(jsonInput);
        expect(output).toEqual(expected);
      });

      it('should convert multiple-examples-variations.json to BRU format and preserve examples', () => {
        const jsonInput = require('./fixtures/json/multiple-examples-variations.json');
        const expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'bru', 'multiple-examples-variations.bru'), 'utf8');
        const output = jsonToBru(jsonInput);
        expect(output).toEqual(expected);
      });

      it('should convert oauth2-examples.json to BRU format and preserve examples', () => {
        const jsonInput = require('./fixtures/json/oauth2-examples.json');
        const expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'bru', 'oauth2-examples.bru'), 'utf8');
        const output = jsonToBru(jsonInput);
        expect(output).toEqual(expected);
      });
    });
  });

  describe('Examples with multiline descriptions', () => {
    it('should parse examples with multiline descriptions', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'bru', 'examples-multiline-description.bru'), 'utf8');
      const expected = require('./fixtures/json/examples-multiline-description.json');
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });

    it('should convert examples with multiline descriptions to BRU format', () => {
      const jsonInput = require('./fixtures/json/examples-multiline-description.json');
      const expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'bru', 'examples-multiline-description.bru'), 'utf8');
      const output = jsonToBru(jsonInput);

      expect(output).toEqual(expected);
    });

    it('should parse example without description field', () => {
      const bruInput = `meta {
  name: Test API
  type: http
}

example {
  name: Example Request
  
  request: {
    url: https://api.example.com/example
    method: get
  }
}
`;

      const output = bruToJson(bruInput);

      expect(output.examples).toBeDefined();
      expect(output.examples).toHaveLength(1);
      expect(output.examples[0].name).toBe('Example Request');
      expect(output.examples[0].description).toBeUndefined();
    });
  });

  describe('Examples with multiline strings and contentType', () => {
    it('should parse examples with multiline strings and @contentType annotations', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'bru', 'examples-multiline-contenttype.bru'), 'utf8');
      const expected = require('./fixtures/json/examples-multiline-contenttype.json');
      const output = bruToJson(input);

      expect(output).toEqual(expected);
    });

    it('should correctly extract contentType from multiline values', () => {
      const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'bru', 'examples-multiline-contenttype.bru'), 'utf8');
      const output = bruToJson(input);

      const example = output.examples[0];
      const multipartForm = example.request.body.multipartForm;

      // Check that multiline values with @contentType are parsed correctly
      const testField = multipartForm.find((f) => f.name === 'test');
      expect(testField).toBeDefined();
      expect(testField.value).toContain('"hello"');
      expect(testField.contentType).toBe('application/json');

      // Check single-line value with @contentType
      const simpleField = multipartForm.find((f) => f.name === 'simple');
      expect(simpleField).toBeDefined();
      expect(simpleField.value).toBe('cat and mouse');
      expect(simpleField.contentType).toBe('text/plain');

      // Check multiline value without @contentType
      const arrayField = multipartForm.find((f) => f.name === 'array');
      expect(arrayField).toBeDefined();
      expect(arrayField.value).toContain('"coolade"');
      expect(arrayField.contentType).toBe('');

      // Check complex multiline JSON with @contentType
      const jsonValueField = multipartForm.find((f) => f.name === 'jsonValue');
      expect(jsonValueField).toBeDefined();
      expect(jsonValueField.value).toContain('"key": "value"');
      expect(jsonValueField.contentType).toBe('application/json');
    });

    it('should handle round-trip conversion for multiline strings with contentType', () => {
      const originalBru = fs.readFileSync(path.join(__dirname, 'fixtures', 'bru', 'examples-multiline-contenttype.bru'), 'utf8');
      const jsonFromBru = bruToJson(originalBru);
      const bruFromJson = jsonToBru(jsonFromBru);
      const jsonFromBruAgain = bruToJson(bruFromJson);

      // The examples should be preserved through the round-trip
      expect(jsonFromBruAgain.examples).toBeDefined();
      expect(Array.isArray(jsonFromBruAgain.examples)).toBe(true);
      expect(jsonFromBruAgain.examples).toHaveLength(1);

      const example = jsonFromBruAgain.examples[0];
      const multipartForm = example.request.body.multipartForm;

      // Verify contentType is preserved
      const testField = multipartForm.find((f) => f.name === 'test');
      expect(testField.contentType).toBe('application/json');
      expect(testField.value).toContain('"hello"');

      const jsonValueField = multipartForm.find((f) => f.name === 'jsonValue');
      expect(jsonValueField.contentType).toBe('application/json');
      expect(jsonValueField.value).toContain('"key": "value"');
    });
  });
});
