const { describe, it, expect } = require('@jest/globals');

import {
  computeWordDiffForOld,
  computeWordDiffForNew,
  computeLineDiffForOld,
  computeLineDiffForNew
} from './diffUtils';

describe('diffUtils', () => {
  describe('computeWordDiffForOld', () => {
    it('should return unchanged for identical strings', () => {
      expect(computeWordDiffForOld('hello world', 'hello world')).toEqual([
        { text: 'hello world', status: 'unchanged' }
      ]);
    });

    it('should return empty array for empty old string', () => {
      expect(computeWordDiffForOld('', 'new text')).toEqual([]);
      expect(computeWordDiffForOld(null, 'new text')).toEqual([]);
      expect(computeWordDiffForOld(undefined, 'new text')).toEqual([]);
    });

    it('should return deleted for entire old string when new is empty', () => {
      expect(computeWordDiffForOld('old text', '')).toEqual([
        { text: 'old text', status: 'deleted' }
      ]);
      expect(computeWordDiffForOld('old text', null)).toEqual([
        { text: 'old text', status: 'deleted' }
      ]);
    });

    it('should detect deleted words', () => {
      const result = computeWordDiffForOld('hello world', 'hello');
      expect(result).toContainEqual({ text: 'hello', status: 'unchanged' });
      expect(result.some((s) => s.status === 'deleted' && s.text.includes('world'))).toBe(true);
    });

    it('should handle URL paths', () => {
      const result = computeWordDiffForOld(
        'https://api.example.com/users/123',
        'https://api.example.com/users/456'
      );
      expect(result.some((s) => s.status === 'unchanged')).toBe(true);
      expect(result.some((s) => s.status === 'deleted')).toBe(true);
    });

    it('should preserve separators', () => {
      const result = computeWordDiffForOld('a/b/c', 'a/b/c');
      expect(result).toEqual([{ text: 'a/b/c', status: 'unchanged' }]);
    });
  });

  describe('computeWordDiffForNew', () => {
    it('should return unchanged for identical strings', () => {
      expect(computeWordDiffForNew('hello world', 'hello world')).toEqual([
        { text: 'hello world', status: 'unchanged' }
      ]);
    });

    it('should return empty array for empty new string', () => {
      expect(computeWordDiffForNew('old text', '')).toEqual([]);
      expect(computeWordDiffForNew('old text', null)).toEqual([]);
      expect(computeWordDiffForNew('old text', undefined)).toEqual([]);
    });

    it('should return added for entire new string when old is empty', () => {
      expect(computeWordDiffForNew('', 'new text')).toEqual([
        { text: 'new text', status: 'added' }
      ]);
      expect(computeWordDiffForNew(null, 'new text')).toEqual([
        { text: 'new text', status: 'added' }
      ]);
    });

    it('should detect added words', () => {
      const result = computeWordDiffForNew('hello', 'hello world');
      expect(result).toContainEqual({ text: 'hello', status: 'unchanged' });
      expect(result.some((s) => s.status === 'added' && s.text.includes('world'))).toBe(true);
    });

    it('should handle URL paths', () => {
      const result = computeWordDiffForNew(
        'https://api.example.com/users/123',
        'https://api.example.com/users/456'
      );
      expect(result.some((s) => s.status === 'unchanged')).toBe(true);
      expect(result.some((s) => s.status === 'added')).toBe(true);
    });
  });

  describe('computeLineDiffForOld', () => {
    it('should return unchanged for identical multiline strings', () => {
      const text = 'line1\nline2\nline3';
      expect(computeLineDiffForOld(text, text)).toEqual([
        { text: 'line1', status: 'unchanged' },
        { text: 'line2', status: 'unchanged' },
        { text: 'line3', status: 'unchanged' }
      ]);
    });

    it('should return empty array for empty old string', () => {
      expect(computeLineDiffForOld('', 'new\ntext')).toEqual([]);
      expect(computeLineDiffForOld(null, 'new\ntext')).toEqual([]);
    });

    it('should return deleted for all lines when new is empty', () => {
      expect(computeLineDiffForOld('line1\nline2', '')).toEqual([
        { text: 'line1', status: 'deleted' },
        { text: 'line2', status: 'deleted' }
      ]);
    });

    it('should detect deleted lines', () => {
      const result = computeLineDiffForOld('line1\nline2\nline3', 'line1\nline3');
      expect(result).toContainEqual({ text: 'line1', status: 'unchanged' });
      expect(result).toContainEqual({ text: 'line2', status: 'deleted' });
      expect(result).toContainEqual({ text: 'line3', status: 'unchanged' });
    });

    it('should handle single line strings', () => {
      expect(computeLineDiffForOld('single line', 'single line')).toEqual([
        { text: 'single line', status: 'unchanged' }
      ]);
    });

    it('should handle code blocks', () => {
      const oldCode = 'function foo() {\n  return 1;\n}';
      const newCode = 'function foo() {\n  return 2;\n}';
      const result = computeLineDiffForOld(oldCode, newCode);
      expect(result).toContainEqual({ text: 'function foo() {', status: 'unchanged' });
      expect(result).toContainEqual({ text: '  return 1;', status: 'deleted' });
      expect(result).toContainEqual({ text: '}', status: 'unchanged' });
    });
  });

  describe('computeLineDiffForNew', () => {
    it('should return unchanged for identical multiline strings', () => {
      const text = 'line1\nline2\nline3';
      expect(computeLineDiffForNew(text, text)).toEqual([
        { text: 'line1', status: 'unchanged' },
        { text: 'line2', status: 'unchanged' },
        { text: 'line3', status: 'unchanged' }
      ]);
    });

    it('should return empty array for empty new string', () => {
      expect(computeLineDiffForNew('old\ntext', '')).toEqual([]);
      expect(computeLineDiffForNew('old\ntext', null)).toEqual([]);
    });

    it('should return added for all lines when old is empty', () => {
      expect(computeLineDiffForNew('', 'line1\nline2')).toEqual([
        { text: 'line1', status: 'added' },
        { text: 'line2', status: 'added' }
      ]);
    });

    it('should detect added lines', () => {
      const result = computeLineDiffForNew('line1\nline3', 'line1\nline2\nline3');
      expect(result).toContainEqual({ text: 'line1', status: 'unchanged' });
      expect(result).toContainEqual({ text: 'line2', status: 'added' });
      expect(result).toContainEqual({ text: 'line3', status: 'unchanged' });
    });

    it('should handle code blocks', () => {
      const oldCode = 'function foo() {\n  return 1;\n}';
      const newCode = 'function foo() {\n  return 2;\n}';
      const result = computeLineDiffForNew(oldCode, newCode);
      expect(result).toContainEqual({ text: 'function foo() {', status: 'unchanged' });
      expect(result).toContainEqual({ text: '  return 2;', status: 'added' });
      expect(result).toContainEqual({ text: '}', status: 'unchanged' });
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      expect(computeWordDiffForOld('', '')).toEqual([{ text: '', status: 'unchanged' }]);
      expect(computeWordDiffForNew('', '')).toEqual([{ text: '', status: 'unchanged' }]);
    });

    it('should handle strings with only whitespace', () => {
      const result = computeWordDiffForOld('   ', '   ');
      expect(result).toEqual([{ text: '   ', status: 'unchanged' }]);
    });

    it('should handle special characters in URLs', () => {
      const url = 'https://api.example.com/users?id=123&name=test';
      expect(computeWordDiffForOld(url, url)).toEqual([{ text: url, status: 'unchanged' }]);
    });

    it('should handle JSON-like content', () => {
      const json = '{"key": "value", "number": 123}';
      const result = computeLineDiffForOld(json, json);
      expect(result).toEqual([{ text: json, status: 'unchanged' }]);
    });
  });
});
