import { validateTagName } from './index';

describe('validateTagName', () => {
  describe('bru-format collections', () => {
    it('accepts alphanumeric, underscore, hyphen tags', () => {
      expect(validateTagName('smoke', 'bru')).toBeNull();
      expect(validateTagName('regression_1', 'bru')).toBeNull();
      expect(validateTagName('api-v1', 'bru')).toBeNull();
      expect(validateTagName('Äiti123', 'bru')).toBeNull();
    });

    it('rejects ampersand, spaces, and other special characters', () => {
      expect(validateTagName('Pets & Dogs', 'bru')).toMatch(/BRU format/);
      expect(validateTagName('R&D', 'bru')).toMatch(/BRU format/);
      expect(validateTagName('&', 'bru')).toMatch(/BRU format/);
      expect(validateTagName('api.v1', 'bru')).toMatch(/BRU format/);
      expect(validateTagName('API (v1)', 'bru')).toMatch(/BRU format/);
      expect(validateTagName('tag@name', 'bru')).toMatch(/BRU format/);
    });

    it('error message names BRU format so user understands the restriction', () => {
      expect(validateTagName('&', 'bru')).toContain('BRU format');
    });
  });

  describe('yml / opencollection collections (BRU-3175 follow-up)', () => {
    it('accepts ampersand, spaces, and other special characters', () => {
      expect(validateTagName('Pets & Dogs', 'yml')).toBeNull();
      expect(validateTagName('R&D', 'yml')).toBeNull();
      expect(validateTagName('&', 'yml')).toBeNull();
      expect(validateTagName('api.v1', 'yml')).toBeNull();
      expect(validateTagName('API (v1)', 'yml')).toBeNull();
      expect(validateTagName('tag@name', 'yml')).toBeNull();
    });

    it('accepts unicode + emoji', () => {
      expect(validateTagName('Café', 'yml')).toBeNull();
      expect(validateTagName('模型管理', 'yml')).toBeNull();
      expect(validateTagName('🔥tag', 'yml')).toBeNull();
    });

    it('falls back to permissive behavior for unknown collectionFormat (defensive)', () => {
      expect(validateTagName('Pets & Dogs', undefined)).toBeNull();
      expect(validateTagName('Pets & Dogs', null)).toBeNull();
      expect(validateTagName('Pets & Dogs', 'unknown')).toBeNull();
    });
  });

  describe('empty / whitespace input', () => {
    it('returns null for empty / whitespace-only input (caller handles)', () => {
      expect(validateTagName('', 'bru')).toBeNull();
      expect(validateTagName('   ', 'bru')).toBeNull();
      expect(validateTagName('', 'yml')).toBeNull();
      expect(validateTagName(null, 'yml')).toBeNull();
      expect(validateTagName(undefined, 'bru')).toBeNull();
    });
  });
});
