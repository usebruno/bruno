const { getKeyString } = require('../src/utils');
const bruToJson = require('../src/bruToJson');
const jsonToBru = require('../src/jsonToBru');

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

    it('should return mixed alphanumeric with hyphens and underscores as-is', () => {
      expect(getKeyString('api_key_123')).toBe('api_key_123');
      expect(getKeyString('test-value_2')).toBe('test-value_2');
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

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(getKeyString('')).toBe('');
    });

    it('should handle single special character', () => {
      expect(getKeyString(':')).toBe('":"');
      expect(getKeyString('"')).toBe('"\\""');
      expect(getKeyString('{')).toBe('"{"');
      expect(getKeyString('}')).toBe('"}"');
      expect(getKeyString(' ')).toBe('" "');
      expect(getKeyString('\n')).toBe('\'\'\'\n\n\n\'\'\'');
      expect(getKeyString('\r')).toBe('\'\'\'\n\n\n\'\'\'');
    });

    it('should handle keys that are only quotes', () => {
      expect(getKeyString('""')).toBe('"\\"\\""');
      expect(getKeyString('"""')).toBe('"\\"\\"\\""');
    });

    it('should handle keys with mixed valid and quotable characters', () => {
      expect(getKeyString('api-key:v1')).toBe('"api-key:v1"');
      expect(getKeyString('user_name with space')).toBe('"user_name with space"');
    });
  });

  describe('real-world examples from fixtures', () => {
    it('should quote keys matching fixture examples', () => {
      // Examples from fixtures/request.bru
      expect(getKeyString('key with spaces')).toBe('"key with spaces"');
      expect(getKeyString('colon:parameter')).toBe('"colon:parameter"');
      expect(getKeyString('nested escaped "quote"')).toBe('"nested escaped \\"quote\\""');
      expect(getKeyString('{braces}')).toBe('"{braces}"');
      expect(getKeyString('disabled:colon:header')).toBe('"disabled:colon:header"');
    });

    it('should not quote standard header names', () => {
      expect(getKeyString('content-type')).toBe('content-type');
      expect(getKeyString('Authorization')).toBe('Authorization');
      expect(getKeyString('transaction-id')).toBe('transaction-id');
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

    it('should handle disabled headers with multiline keys', () => {
      const input = {
        headers: [
          {
            name: 'multiline\nkey',
            value: 'value',
            enabled: false
          }
        ]
      };

      // Convert JSON to BRU
      const bru = jsonToBru(input);

      // Verify the BRU format has disabled prefix
      expect(bru).toContain('~');
      expect(bru).toContain('\'\'\'');

      // Convert BRU back to JSON
      const output = bruToJson(bru);

      // Verify the round-trip maintains the data including enabled flag
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
});
