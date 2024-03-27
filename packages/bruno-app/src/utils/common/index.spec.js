const { describe, it, expect } = require('@jest/globals');

import { normalizeFileName, startsWith } from './index';

describe('common utils', () => {
  describe('normalizeFileName', () => {
    it('should remove special characters', () => {
      expect(normalizeFileName('hello world')).toBe('hello world');
      expect(normalizeFileName('hello-world')).toBe('hello-world');
      expect(normalizeFileName('hello_world')).toBe('hello_world');
      expect(normalizeFileName('hello_world-')).toBe('hello_world-');
      expect(normalizeFileName('hello_world-123')).toBe('hello_world-123');
      expect(normalizeFileName('hello_world-123!@#$%^&*()')).toBe('hello_world-123----------');
      expect(normalizeFileName('hello_world?')).toBe('hello_world-');
      expect(normalizeFileName('foo/bar/')).toBe('foo-bar-');
      expect(normalizeFileName('foo\\bar\\')).toBe('foo-bar-');
    });
    it('should support unicode', () => {
      // more unicode languages
      expect(normalizeFileName('你好世界!?@#$%^&*()')).toBe('你好世界-----------');
      expect(normalizeFileName('こんにちは世界!?@#$%^&*()')).toBe('こんにちは世界-----------');
      expect(normalizeFileName('안녕하세요 세계!?@#$%^&*()')).toBe('안녕하세요 세계-----------');
      expect(normalizeFileName('مرحبا بالعالم!?@#$%^&*()')).toBe('مرحبا بالعالم-----------');
      expect(normalizeFileName('Здравствуй мир!?@#$%^&*()')).toBe('Здравствуй мир-----------');
      expect(normalizeFileName('नमस्ते दुनिया!?@#$%^&*()')).toBe('नमस्ते दुनिया-----------');
      expect(normalizeFileName('สวัสดีชาวโลก!?@#$%^&*()')).toBe('สวัสดีชาวโลก-----------');
      expect(normalizeFileName('γειά σου κόσμος!?@#$%^&*()')).toBe('γειά σου κόσμος-----------');
    });
  });

  describe('startsWith', () => {
    it('should return false if str is not a string', () => {
      expect(startsWith(null, 'foo')).toBe(false);
      expect(startsWith(undefined, 'foo')).toBe(false);
      expect(startsWith(123, 'foo')).toBe(false);
      expect(startsWith({}, 'foo')).toBe(false);
      expect(startsWith([], 'foo')).toBe(false);
    });

    it('should return false if search is not a string', () => {
      expect(startsWith('foo', null)).toBe(false);
      expect(startsWith('foo', undefined)).toBe(false);
      expect(startsWith('foo', 123)).toBe(false);
      expect(startsWith('foo', {})).toBe(false);
      expect(startsWith('foo', [])).toBe(false);
    });

    it('should return false if str does not start with search', () => {
      expect(startsWith('foo', 'bar')).toBe(false);
      expect(startsWith('foo', 'baz')).toBe(false);
      expect(startsWith('foo', 'bar')).toBe(false);
      expect(startsWith('foo', 'baz')).toBe(false);
      expect(startsWith('foo', 'bar')).toBe(false);
      expect(startsWith('foo', 'baz')).toBe(false);
    });

    it('should return true if str starts with search', () => {
      expect(startsWith('foo', 'f')).toBe(true);
      expect(startsWith('foo', 'fo')).toBe(true);
      expect(startsWith('foo', 'foo')).toBe(true);
    });
  });
});
