import { describe, it, expect } from '@jest/globals';
import { sanitizeTag, sanitizeTags } from '../../src/common/index.js';

describe('sanitizeTag', () => {
  describe('basic functionality', () => {
    it('should return null for null input', () => {
      expect(sanitizeTag(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(sanitizeTag(undefined)).toBeNull();
    });

    it('should return null for non-string input', () => {
      expect(sanitizeTag(123)).toBeNull();
      expect(sanitizeTag({})).toBeNull();
      expect(sanitizeTag([])).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(sanitizeTag('')).toBeNull();
    });

    it('should return null for whitespace-only string', () => {
      expect(sanitizeTag('   ')).toBeNull();
      expect(sanitizeTag('\t\n')).toBeNull();
    });
  });

  describe('valid tags', () => {
    it('should preserve alphanumeric tags', () => {
      expect(sanitizeTag('valid')).toBe('valid');
      expect(sanitizeTag('ValidTag')).toBe('ValidTag');
      expect(sanitizeTag('tag123')).toBe('tag123');
    });

    it('should preserve tags with hyphens', () => {
      expect(sanitizeTag('valid-tag')).toBe('valid-tag');
      expect(sanitizeTag('my-api-endpoint')).toBe('my-api-endpoint');
    });

    it('should preserve tags with underscores', () => {
      expect(sanitizeTag('valid_tag')).toBe('valid_tag');
      expect(sanitizeTag('my_api_endpoint')).toBe('my_api_endpoint');
    });

    it('should replace spaces with underscores', () => {
      expect(sanitizeTag('User Management')).toBe('User_Management');
      expect(sanitizeTag('API v1')).toBe('API_v1');
    });

    it('should preserve tags with mixed valid characters (spaces become underscores)', () => {
      expect(sanitizeTag('valid-tag_name')).toBe('valid-tag_name');
      expect(sanitizeTag('API v1-endpoint')).toBe('API_v1-endpoint');
      expect(sanitizeTag('User Management API')).toBe('User_Management_API');
    });
  });

  describe('space handling', () => {
    it('should replace spaces with underscores in the middle of tags', () => {
      expect(sanitizeTag('User Management')).toBe('User_Management');
      expect(sanitizeTag('API v1')).toBe('API_v1');
    });

    it('should collapse multiple spaces into a single underscore', () => {
      expect(sanitizeTag('User  Management')).toBe('User_Management');
      expect(sanitizeTag('API   v1')).toBe('API_v1');
    });

    it('should trim leading and trailing spaces', () => {
      expect(sanitizeTag('  tag  ')).toBe('tag');
      expect(sanitizeTag('\ttag\n')).toBe('tag');
    });

    it('should remove leading/trailing spaces and replace internal spaces with underscores', () => {
      expect(sanitizeTag('  User Management  ')).toBe('User_Management');
    });
  });

  describe('special character handling', () => {
    it('should replace dots with underscores', () => {
      expect(sanitizeTag('api.v1')).toBe('api_v1');
      expect(sanitizeTag('api.v1.0')).toBe('api_v1_0');
    });

    it('should replace colons with underscores', () => {
      expect(sanitizeTag('api:v1')).toBe('api_v1');
    });

    it('should replace slashes with underscores', () => {
      expect(sanitizeTag('api/v1')).toBe('api_v1');
      expect(sanitizeTag('api/v1/users')).toBe('api_v1_users');
    });

    it('should replace parentheses with underscores', () => {
      // 'API (v1)' has space before parenthesis, both become underscores
      expect(sanitizeTag('API (v1)')).toBe('API_v1');
      // 'API(v1)' has no space, so it becomes 'API_v1'
      expect(sanitizeTag('API(v1)')).toBe('API_v1');
    });

    it('should replace multiple special characters', () => {
      // 'API v1.0 (beta)' - spaces, dots, parentheses all become underscores
      // Result: 'API_v1_0_beta' (collapsed to single underscores)
      expect(sanitizeTag('API v1.0 (beta)')).toBe('API_v1_0_beta');
      expect(sanitizeTag('api.v1:beta')).toBe('api_v1_beta');
    });

    it('should handle special characters at start and end', () => {
      expect(sanitizeTag('.api')).toBe('api');
      expect(sanitizeTag('api.')).toBe('api');
      expect(sanitizeTag('-api')).toBe('api');
      expect(sanitizeTag('api-')).toBe('api');
      expect(sanitizeTag('_api')).toBe('api');
      expect(sanitizeTag('api_')).toBe('api');
      expect(sanitizeTag(' api')).toBe('api');
      expect(sanitizeTag('api ')).toBe('api');
    });

    it('should return null when result is only special characters', () => {
      expect(sanitizeTag('...')).toBeNull();
      expect(sanitizeTag('---')).toBeNull();
      expect(sanitizeTag('___')).toBeNull();
      expect(sanitizeTag('.-_')).toBeNull();
    });
  });

  describe('options handling', () => {
    it('should ignore collectionFormat option and always sanitize', () => {
      // The collectionFormat option is no longer used - always sanitize
      // Spaces are replaced with underscores for BRU format compatibility
      expect(sanitizeTag('User Management', { collectionFormat: 'yml' })).toBe('User_Management');
      expect(sanitizeTag('api.v1', { collectionFormat: 'yml' })).toBe('api_v1');
      // 'API (v1)' becomes 'API_v1' (space and parentheses become underscores)
      expect(sanitizeTag('API (v1)', { collectionFormat: 'yml' })).toBe('API_v1');
    });
  });
});

describe('sanitizeTags', () => {
  it('should return empty array for null input', () => {
    expect(sanitizeTags(null)).toEqual([]);
  });

  it('should return empty array for undefined input', () => {
    expect(sanitizeTags(undefined)).toEqual([]);
  });

  it('should return empty array for non-array input', () => {
    expect(sanitizeTags('string')).toEqual([]);
    expect(sanitizeTags(123)).toEqual([]);
    expect(sanitizeTags({})).toEqual([]);
  });

  it('should return empty array for empty array input', () => {
    expect(sanitizeTags([])).toEqual([]);
  });

  it('should sanitize all tags in array', () => {
    // Spaces are replaced with underscores
    expect(sanitizeTags(['User Management', 'API v1'])).toEqual(['User_Management', 'API_v1']);
  });

  it('should remove null values from result', () => {
    expect(sanitizeTags(['valid', '...', 'also-valid'])).toEqual(['valid', 'also-valid']);
  });

  it('should remove duplicates from result', () => {
    expect(sanitizeTags(['User Management', 'User Management'])).toEqual(['User_Management']);
    expect(sanitizeTags(['api.v1', 'api_v1'])).toEqual(['api_v1']);
  });

  it('should preserve order of first occurrence', () => {
    expect(sanitizeTags(['tag1', 'tag2', 'tag1'])).toEqual(['tag1', 'tag2']);
  });

  it('should handle mixed valid and invalid tags', () => {
    // Spaces are replaced with underscores
    expect(sanitizeTags(['valid-tag', 'invalid.tag', 'another valid'])).toEqual(['valid-tag', 'invalid_tag', 'another_valid']);
  });
});
