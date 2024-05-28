const { describe, it, expect } = require('@jest/globals');

import { normalizeFileName, startsWith, humanizeDate, relativeDate } from './index';

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

  describe('humanizeDate', () => {
    it('should return a date string in the en-US locale', () => {
      expect(humanizeDate('2024-03-17')).toBe('March 17, 2024');
    });

    it('should return invalid date if the date is invalid', () => {
      expect(humanizeDate('9999-99-99')).toBe('Invalid Date');
    });
  });

  describe('relativeDate', () => {
    it('should return few seconds ago', () => {
      expect(relativeDate(new Date())).toBe('Few seconds ago');
    });

    it('should return minutes ago', () => {
      let date = new Date();
      date.setMinutes(date.getMinutes() - 30);
      expect(relativeDate(date)).toBe('30 minutes ago');
    });

    it('should return hours ago', () => {
      let date = new Date();
      date.setHours(date.getHours() - 10);
      expect(relativeDate(date)).toBe('10 hours ago');
    });

    it('should return days ago', () => {
      let date = new Date();
      date.setDate(date.getDate() - 5);
      expect(relativeDate(date)).toBe('5 days ago');
    });

    it('should return weeks ago', () => {
      let date = new Date();
      date.setDate(date.getDate() - 8);
      expect(relativeDate(date)).toBe('1 week ago');
    });

    it('should return months ago', () => {
      let date = new Date();
      date.setDate(date.getDate() - 60);
      expect(relativeDate(date)).toBe('2 months ago');
    });
  });
});
