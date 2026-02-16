import { normalizeName, generateUniqueName } from './index';

describe('BulkImportCollectionLocation helpers', () => {
  describe('normalizeName', () => {
    it('should trim and lowercase names', () => {
      expect(normalizeName('  Beta  ')).toBe('beta');
      expect(normalizeName('TEST')).toBe('test');
      expect(normalizeName(null)).toBe('');
    });
  });

  describe('generateUniqueName', () => {
    it('should return original name if no conflict', () => {
      const checkExists = () => false;
      expect(generateUniqueName('Beta', checkExists)).toBe('Beta');
    });

    it('should add "copy" suffix on first conflict', () => {
      const existing = new Set(['beta']);
      const checkExists = (name) => existing.has(name);
      expect(generateUniqueName('Beta', checkExists)).toBe('Beta copy');
    });

    it('should increment copy number on multiple conflicts', () => {
      const existing = new Set(['beta', 'beta copy']);
      const checkExists = (name) => existing.has(name);
      expect(generateUniqueName('Beta', checkExists)).toBe('Beta copy 2');
    });
  });
});
