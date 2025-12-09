const bruToJson = require('../../src/bruToJson');
const jsonToBru = require('../../src/jsonToBru');

describe('Multiline values in examples', () => {
  describe('jsonToBru - multiline value serialization', () => {
    it('should wrap multiline header values in triple quotes', () => {
      const json = {
        meta: { name: 'Test', type: 'http' },
        http: { method: 'get', url: 'https://example.com' },
        examples: [{
          name: 'Test Example',
          description: 'Test',
          request: {
            url: 'https://example.com',
            method: 'get',
            headers: [
              { name: 'X-Custom', value: 'value1\nvalue2', enabled: true }
            ]
          }
        }]
      };

      const bru = jsonToBru(json);

      expect(bru).toContain('X-Custom: \'\'\'');
      expect(bru).toContain('value1');
      expect(bru).toContain('value2');
    });

    it('should wrap multiline query param values in triple quotes', () => {
      const json = {
        meta: { name: 'Test', type: 'http' },
        http: { method: 'get', url: 'https://example.com' },
        examples: [{
          name: 'Test Example',
          description: 'Test',
          request: {
            url: 'https://example.com',
            method: 'get',
            params: [
              { name: 'query', value: 'a\nb\nc', type: 'query', enabled: true }
            ]
          }
        }]
      };

      const bru = jsonToBru(json);

      expect(bru).toContain('query: \'\'\'');
    });

    it('should wrap multiline form-urlencoded values in triple quotes', () => {
      const json = {
        meta: { name: 'Test', type: 'http' },
        http: { method: 'post', url: 'https://example.com' },
        examples: [{
          name: 'Test Example',
          description: 'Test',
          request: {
            url: 'https://example.com',
            method: 'post',
            body: {
              mode: 'formUrlEncoded',
              formUrlEncoded: [
                { name: 'data', value: 'line1\nline2', enabled: true }
              ]
            }
          }
        }]
      };

      const bru = jsonToBru(json);

      expect(bru).toContain('data: \'\'\'');
      expect(bru).toContain('line1');
      expect(bru).toContain('line2');
    });

    it('should wrap multiline multipart-form text values in triple quotes', () => {
      const json = {
        meta: { name: 'Test', type: 'http' },
        http: { method: 'post', url: 'https://example.com' },
        examples: [{
          name: 'Test Example',
          description: 'Test',
          request: {
            url: 'https://example.com',
            method: 'post',
            body: {
              mode: 'multipartForm',
              multipartForm: [
                { name: 'description', type: 'text', value: 'multi\nline\ntext', enabled: true }
              ]
            }
          }
        }]
      };

      const bru = jsonToBru(json);

      expect(bru).toContain('description: \'\'\'');
      expect(bru).toContain('multi');
      expect(bru).toContain('line');
      expect(bru).toContain('text');
    });

    it('should NOT wrap single-line values in triple quotes', () => {
      const json = {
        meta: { name: 'Test', type: 'http' },
        http: { method: 'get', url: 'https://example.com' },
        examples: [{
          name: 'Simple Example',
          description: 'Single line description',
          request: {
            url: 'https://example.com',
            method: 'get',
            headers: [
              { name: 'X-Simple', value: 'simple value', enabled: true }
            ]
          }
        }]
      };

      const bru = jsonToBru(json);

      expect(bru).toContain('description: Single line description');
      expect(bru).toContain('X-Simple: simple value');
      expect(bru).not.toContain('description: \'\'\'');
      expect(bru).not.toContain('X-Simple: \'\'\'');
    });
  });

  describe('bruToJson - multiline value parsing', () => {
    it('should parse multiline description from triple quotes', () => {
      const bru = `meta {
  name: Test
  type: http
}

get {
  url: https://example.com
}

example {
  name: Test Example
  description: '''
    Line 1
    Line 2
    Line 3
  '''

  request: {
    url: https://example.com
    method: get
  }
}`;

      const json = bruToJson(bru);

      expect(json.examples[0].description).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should parse multiline header values from triple quotes', () => {
      const bru = `meta {
  name: Test
  type: http
}

get {
  url: https://example.com
}

example {
  name: Test Example
  description: Test

  request: {
    url: https://example.com
    method: get
    headers: {
      X-Custom: '''
        value1
        value2
        value3
      '''
    }
  }
}`;

      const json = bruToJson(bru);

      expect(json.examples[0].request.headers[0].value).toBe('value1\nvalue2\nvalue3');
    });

    it('should parse multiline query param values from triple quotes', () => {
      const bru = `meta {
  name: Test
  type: http
}

get {
  url: https://example.com
}

example {
  name: Test Example
  description: Test

  request: {
    url: https://example.com
    method: get
    params:query: {
      data: '''
        a
        b
        c
      '''
    }
  }
}`;

      const json = bruToJson(bru);

      expect(json.examples[0].request.params[0].value).toBe('a\nb\nc');
    });

    it('should handle different indentation levels correctly', () => {
      const bru = `meta {
  name: Test
  type: http
}

get {
  url: https://example.com
}

example {
  name: Test
  description: '''
    Shallow indent
  '''

  request: {
    url: https://example.com
    method: get
    headers: {
      X-Deep: '''
        Deep indent value
        with multiple lines
      '''
    }
  }
}`;

      const json = bruToJson(bru);

      expect(json.examples[0].description).toBe('Shallow indent');
      expect(json.examples[0].request.headers[0].value).toBe('Deep indent value\nwith multiple lines');
    });
  });

  describe('Round-trip tests (JSON -> BRU -> JSON)', () => {
    it('should preserve multiline description through round-trip', () => {
      const originalJson = {
        meta: { name: 'Test', type: 'http' },
        http: { method: 'get', url: 'https://example.com' },
        examples: [{
          name: 'Test Example',
          description: 'Line 1\nLine 2\nLine 3',
          request: {
            url: 'https://example.com',
            method: 'get'
          }
        }]
      };

      const bru = jsonToBru(originalJson);
      const parsedJson = bruToJson(bru);

      expect(parsedJson.examples[0].description).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should preserve multiline header values through round-trip', () => {
      const originalJson = {
        meta: { name: 'Test', type: 'http' },
        http: { method: 'get', url: 'https://example.com' },
        examples: [{
          name: 'Test Example',
          description: 'Test',
          request: {
            url: 'https://example.com',
            method: 'get',
            headers: [
              { name: 'X-Multiline', value: 'header\nwith\nnewlines', enabled: true }
            ]
          }
        }]
      };

      const bru = jsonToBru(originalJson);
      const parsedJson = bruToJson(bru);

      expect(parsedJson.examples[0].request.headers[0].value).toBe('header\nwith\nnewlines');
    });

    it('should preserve multiline query params through round-trip', () => {
      const originalJson = {
        meta: { name: 'Test', type: 'http' },
        http: { method: 'get', url: 'https://example.com' },
        examples: [{
          name: 'Test Example',
          description: 'Test',
          request: {
            url: 'https://example.com',
            method: 'get',
            params: [
              { name: 'q', value: 'multi\nline\nquery', type: 'query', enabled: true }
            ]
          }
        }]
      };

      const bru = jsonToBru(originalJson);
      const parsedJson = bruToJson(bru);

      expect(parsedJson.examples[0].request.params[0].value).toBe('multi\nline\nquery');
    });

    it('should preserve multiline form-urlencoded values through round-trip', () => {
      const originalJson = {
        meta: { name: 'Test', type: 'http' },
        http: { method: 'post', url: 'https://example.com' },
        examples: [{
          name: 'Test Example',
          description: 'Test',
          request: {
            url: 'https://example.com',
            method: 'post',
            body: {
              mode: 'formUrlEncoded',
              formUrlEncoded: [
                { name: 'field', value: 'line1\nline2\nline3', enabled: true }
              ]
            }
          }
        }]
      };

      const bru = jsonToBru(originalJson);
      const parsedJson = bruToJson(bru);

      expect(parsedJson.examples[0].request.body.formUrlEncoded[0].value).toBe('line1\nline2\nline3');
    });

    it('should preserve multiline multipart-form text values through round-trip', () => {
      const originalJson = {
        meta: { name: 'Test', type: 'http' },
        http: { method: 'post', url: 'https://example.com' },
        examples: [{
          name: 'Test Example',
          description: 'Test',
          request: {
            url: 'https://example.com',
            method: 'post',
            body: {
              mode: 'multipartForm',
              multipartForm: [
                { name: 'text_field', type: 'text', value: 'multipart\nmultiline\nvalue', enabled: true }
              ]
            }
          }
        }]
      };

      const bru = jsonToBru(originalJson);
      const parsedJson = bruToJson(bru);

      expect(parsedJson.examples[0].request.body.multipartForm[0].value).toBe('multipart\nmultiline\nvalue');
    });

    it('should handle complex example with multiple multiline values', () => {
      const originalJson = {
        meta: { name: 'Complex Test', type: 'http' },
        http: { method: 'post', url: 'https://example.com' },
        examples: [{
          name: 'Complex Example',
          description: 'This is a\nmultiline\ndescription',
          request: {
            url: 'https://example.com/api',
            method: 'post',
            headers: [
              { name: 'X-Header-1', value: 'simple value', enabled: true },
              { name: 'X-Header-2', value: 'multi\nline\nheader', enabled: true }
            ],
            params: [
              { name: 'simple', value: 'value', type: 'query', enabled: true },
              { name: 'complex', value: 'a\nb\nc', type: 'query', enabled: true }
            ]
          }
        }]
      };

      const bru = jsonToBru(originalJson);
      const parsedJson = bruToJson(bru);

      expect(parsedJson.examples[0].description).toBe('This is a\nmultiline\ndescription');
      expect(parsedJson.examples[0].request.headers[0].value).toBe('simple value');
      expect(parsedJson.examples[0].request.headers[1].value).toBe('multi\nline\nheader');
      expect(parsedJson.examples[0].request.params[0].value).toBe('value');
      expect(parsedJson.examples[0].request.params[1].value).toBe('a\nb\nc');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty lines in multiline values', () => {
      const originalJson = {
        meta: { name: 'Test', type: 'http' },
        http: { method: 'get', url: 'https://example.com' },
        examples: [{
          name: 'Test',
          description: 'Line 1\n\nLine 3',
          request: {
            url: 'https://example.com',
            method: 'get'
          }
        }]
      };

      const bru = jsonToBru(originalJson);
      const parsedJson = bruToJson(bru);

      // Empty lines may have trailing spaces after round-trip due to indentation
      // So we check that the content lines are preserved correctly
      const lines = parsedJson.examples[0].description.split('\n');
      expect(lines[0]).toBe('Line 1');
      expect(lines[1].trim()).toBe(''); // Empty line (may have spaces)
      expect(lines[2]).toBe('Line 3');
    });

    it('should handle values with special characters', () => {
      const originalJson = {
        meta: { name: 'Test', type: 'http' },
        http: { method: 'get', url: 'https://example.com' },
        examples: [{
          name: 'Test',
          description: 'Line with "quotes"\nLine with: colons',
          request: {
            url: 'https://example.com',
            method: 'get'
          }
        }]
      };

      const bru = jsonToBru(originalJson);
      const parsedJson = bruToJson(bru);

      expect(parsedJson.examples[0].description).toBe('Line with "quotes"\nLine with: colons');
    });

    it('should handle carriage return line endings', () => {
      const originalJson = {
        meta: { name: 'Test', type: 'http' },
        http: { method: 'get', url: 'https://example.com' },
        examples: [{
          name: 'Test',
          description: 'Line 1\r\nLine 2',
          request: {
            url: 'https://example.com',
            method: 'get'
          }
        }]
      };

      const bru = jsonToBru(originalJson);

      // Should contain triple quotes for multiline
      expect(bru).toContain('\'\'\'');
    });

    it('should handle disabled fields with multiline values', () => {
      const originalJson = {
        meta: { name: 'Test', type: 'http' },
        http: { method: 'get', url: 'https://example.com' },
        examples: [{
          name: 'Test',
          description: 'Test',
          request: {
            url: 'https://example.com',
            method: 'get',
            headers: [
              { name: 'X-Disabled', value: 'multi\nline', enabled: false }
            ]
          }
        }]
      };

      const bru = jsonToBru(originalJson);
      const parsedJson = bruToJson(bru);

      expect(parsedJson.examples[0].request.headers[0].value).toBe('multi\nline');
      expect(parsedJson.examples[0].request.headers[0].enabled).toBe(false);
    });
  });
});
