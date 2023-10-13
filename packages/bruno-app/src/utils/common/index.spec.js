const { describe, it, expect } = require('@jest/globals');

import { normalizeFileName } from './index';

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
});
