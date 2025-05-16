const { isValidValue } = require('../../src/utils/common');

describe('isValidValue', () => {
    it('should return true for valid string values', () => {
      expect(isValidValue('test')).toBe(true);
      expect(isValidValue('')).toBe(true);
    });

    it('should return false for non-string values', () => {
      expect(isValidValue(null)).toBe(false);
      expect(isValidValue(undefined)).toBe(false);
      expect(isValidValue(123)).toBe(false);
      expect(isValidValue({})).toBe(false);
      expect(isValidValue([])).toBe(false);
      expect(isValidValue(true)).toBe(false);
    });
}); 