const { safeParseJson, indentString, outdentString, get } = require('../src/utils');

describe('utils', () => {
  describe('safeParseJson', () => {
    it('should parse valid json', () => {
      const input = '{"a": 1}';
      const result = safeParseJson(input);
      expect(result).toEqual({ a: 1 });
    });

    it('should return null for invalid json', () => {
      const input = '{"a": 1';
      const result = safeParseJson(input);
      expect(result).toBeNull();
    });
  });

  describe('indentString', () => {
    it('correctly indents a multiline string', () => {
      const input = 'line1\nline2\nline3';
      const expectedOutput = '  line1\n  line2\n  line3';
      expect(indentString(input)).toBe(expectedOutput);
    });
  });

  describe('outdentString', () => {
    it('correctly outdents a multiline string', () => {
      const input = '  line1\n  line2\n  line3';
      const expectedOutput = 'line1\nline2\nline3';
      expect(outdentString(input)).toBe(expectedOutput);
    });
  });
});
