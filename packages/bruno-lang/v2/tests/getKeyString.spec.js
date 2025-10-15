const { getKeyString } = require('../src/utils');
const bruToJson = require('../src/bruToJson');
const jsonToBru = require('../src/jsonToBru');
const collectionBruToJson = require('../src/collectionBruToJson');
const jsonToCollectionBru = require('../src/jsonToCollectionBru');

describe('getKeyString', () => {
  describe('should not quote keys without special characters', () => {
    it('should return simple alphanumeric keys as-is', () => {
      expect(getKeyString('hello')).toBe('hello');
      expect(getKeyString('world123')).toBe('world123');
      expect(getKeyString('API')).toBe('API');
    });

    it('should return keys with hyphens as-is', () => {
      expect(getKeyString('api-key')).toBe('api-key');
      expect(getKeyString('content-type')).toBe('content-type');
    });

    it('should return keys with underscores as-is', () => {
      expect(getKeyString('api_key')).toBe('api_key');
      expect(getKeyString('user_name')).toBe('user_name');
    });
  });

  describe('should quote keys with special characters', () => {
    it('should quote keys with colons', () => {
      expect(getKeyString('key:value')).toBe('"key:value"');
      expect(getKeyString('disabled:colon:header')).toBe('"disabled:colon:header"');
      expect(getKeyString(':startsWithColon')).toBe('":startsWithColon"');
      expect(getKeyString('endsWithColon:')).toBe('"endsWithColon:"');
    });

    it('should quote keys with spaces', () => {
      expect(getKeyString('key with spaces')).toBe('"key with spaces"');
      expect(getKeyString(' leadingSpace')).toBe('" leadingSpace"');
      expect(getKeyString('trailingSpace ')).toBe('"trailingSpace "');
      expect(getKeyString('multiple   spaces')).toBe('"multiple   spaces"');
    });

    it('should quote keys with curly braces', () => {
      expect(getKeyString('{braces}')).toBe('"{braces}"');
      expect(getKeyString('{only-open')).toBe('"{only-open"');
      expect(getKeyString('only-close}')).toBe('"only-close}"');
      expect(getKeyString('nested{brace}here')).toBe('"nested{brace}here"');
    });

    it('should quote keys with double quotes and escape them', () => {
      expect(getKeyString('nested "quote"')).toBe('"nested \\"quote\\""');
      expect(getKeyString('"quoted"')).toBe('"\\"quoted\\""');
      expect(getKeyString('multiple "quotes" here "too"')).toBe('"multiple \\"quotes\\" here \\"too\\""');
    });

    it('should quote keys with multiple special characters', () => {
      expect(getKeyString('key: value')).toBe('"key: value"');
      expect(getKeyString('{key}: "value"')).toBe('"{key}: \\"value\\""');
      expect(getKeyString('complex:key with {braces}')).toBe('"complex:key with {braces}"');
    });

    it('should use triple quotes for keys with newlines', () => {
      expect(getKeyString('key\nwith\nnewlines')).toBe('\'\'\'\nkey\nwith\nnewlines\n\'\'\'');
      expect(getKeyString('single\nline')).toBe('\'\'\'\nsingle\nline\n\'\'\'');
    });

    it('should normalize different newline types and use triple quotes', () => {
      expect(getKeyString('key\r\nwith\r\nwindows\r\nnewlines')).toBe('\'\'\'\nkey\nwith\nwindows\nnewlines\n\'\'\'');
      expect(getKeyString('key\rwith\rcarriage\rreturns')).toBe('\'\'\'\nkey\nwith\ncarriage\nreturns\n\'\'\'');
    });

    it('should handle keys with both newlines and other content', () => {
      expect(getKeyString('line1\nline2\nline3')).toBe('\'\'\'\nline1\nline2\nline3\n\'\'\'');
      expect(getKeyString('start\nmiddle\nend')).toBe('\'\'\'\nstart\nmiddle\nend\n\'\'\'');
    });
  });

  describe('round-trip conversion with multiline keys', () => {
    it('should handle headers with multiline keys - JSON to BRU to JSON', () => {
      const input = {
        headers: [
          {
            name: 'key\nwith\nnewlines',
            value: 'test-value',
            enabled: true
          }
        ]
      };

      // Convert JSON to BRU
      const bru = jsonToBru(input);

      // Verify the BRU format contains triple quotes for the key
      expect(bru).toContain('\'\'\'');
      expect(bru).toContain('key');
      expect(bru).toContain('with');
      expect(bru).toContain('newlines');

      // Convert BRU back to JSON
      const output = bruToJson(bru);

      // Verify the round-trip maintains the data
      expect(output).toEqual(input);
    });

    it('should handle multiple headers with mix of regular and multiline keys', () => {
      const input = {
        headers: [
          {
            name: 'regular-key',
            value: 'value1',
            enabled: true
          },
          {
            name: 'key\nwith\nnewlines',
            value: 'value2',
            enabled: true
          },
          {
            name: 'key:with:colon',
            value: 'value3',
            enabled: true
          }
        ]
      };

      // Convert JSON to BRU
      const bru = jsonToBru(input);

      // Convert BRU back to JSON
      const output = bruToJson(bru);

      // Verify the round-trip maintains all data
      expect(output).toEqual(input);
    });
  });

  describe('round-trip conversion with multiline keys for collections', () => {
    it('should handle collection headers with multiline keys - JSON to BRU to JSON', () => {
      const input = {
        headers: [
          {
            name: 'key\nwith\nnewlines',
            value: 'test-value',
            enabled: true
          }
        ]
      };

      // Convert JSON to BRU (collection format)
      const bru = jsonToCollectionBru(input);

      // Verify the BRU format contains triple quotes for the key
      expect(bru).toContain('\'\'\'');
      expect(bru).toContain('key');
      expect(bru).toContain('with');
      expect(bru).toContain('newlines');

      // Convert BRU back to JSON
      const output = collectionBruToJson(bru);

      // Verify the round-trip maintains the data
      expect(output).toEqual(input);
    });

    it('should handle collection query params with multiline keys', () => {
      const input = {
        query: [
          {
            name: 'param\nwith\nnewlines',
            value: 'test-value',
            enabled: true
          }
        ]
      };

      // Convert JSON to BRU (collection format)
      const bru = jsonToCollectionBru(input);

      // Verify the BRU format contains triple quotes for the key
      expect(bru).toContain('\'\'\'');
      expect(bru).toContain('param');
      expect(bru).toContain('with');
      expect(bru).toContain('newlines');

      // Convert BRU back to JSON
      const output = collectionBruToJson(bru);

      // Verify the round-trip maintains the data
      expect(output).toEqual(input);
    });

    it('should handle multiple collection headers with mix of regular and multiline keys', () => {
      const input = {
        headers: [
          {
            name: 'regular-key',
            value: 'value1',
            enabled: true
          },
          {
            name: 'key\nwith\nnewlines',
            value: 'value2',
            enabled: true
          },
          {
            name: 'key:with:colon',
            value: 'value3',
            enabled: true
          }
        ]
      };

      // Convert JSON to BRU (collection format)
      const bru = jsonToCollectionBru(input);

      // Convert BRU back to JSON
      const output = collectionBruToJson(bru);

      // Verify the round-trip maintains all data
      expect(output).toEqual(input);
    });
  });
});
