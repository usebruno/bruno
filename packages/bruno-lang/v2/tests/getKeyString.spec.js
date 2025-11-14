const { getKeyString } = require('../src/utils');

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
  });
});
