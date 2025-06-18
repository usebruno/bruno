const { describe, it, expect } = require('@jest/globals');

import { normalizeFileName, startsWith, humanizeDate, relativeDate, getContentType, formatSize } from './index';

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

    it('should return "Invalid Date" if the date is null', () => {
      expect(humanizeDate(null)).toBe('Invalid Date');
    });

    it('should return a humanized date for a valid date in ISO format', () => {
      expect(humanizeDate('2024-11-28T00:00:00Z')).toBe('November 28, 2024');
    });

    it('should return "Invalid Date" for a non-date string', () => {
      expect(humanizeDate('some random text')).toBe('Invalid Date');
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

  describe('getContentType', () => {
    it('should handle JSON content types correctly', () => {
      expect(getContentType({ 'content-type': 'application/json' })).toBe('application/ld+json');
      expect(getContentType({ 'content-type': 'text/json' })).toBe('application/ld+json');
      expect(getContentType({ 'content-type': 'application/ld+json' })).toBe('application/ld+json');
    });

    it('should handle XML content types correctly', () => {
      expect(getContentType({ 'content-type': 'text/xml' })).toBe('application/xml');
      expect(getContentType({ 'content-type': 'application/xml' })).toBe('application/xml');
      expect(getContentType({ 'content-type': 'application/atom+xml' })).toBe('application/xml');
    });

    it('should handle image content types correctly', () => {
      expect(getContentType({ 'content-type': 'image/svg+xml;charset=utf-8' })).toBe('image/svg+xml');
      expect(getContentType({ 'content-type': 'IMAGE/SVG+xml' })).toBe('image/svg+xml');
    });

    it('should return original content type when no pattern matches', () => {
      expect(getContentType({ 'content-type': 'image/jpeg' })).toBe('image/jpeg');
      expect(getContentType({ 'content-type': 'application/pdf' })).toBe('application/pdf');
    });

    it('should not be case sensitive', () => {
      expect(getContentType({ 'content-type': 'text/json' })).toBe('application/ld+json');
      expect(getContentType({ 'Content-Type': 'text/json' })).toBe('application/ld+json');
    });

    it('should handle empty content type', () => {
      expect(getContentType({ 'content-type': '' })).toBe('');
      expect(getContentType({ 'content-type': null })).toBe('');
      expect(getContentType({ 'content-type': undefined })).toBe('');
    });

    it('should handle empty or invalid inputs', () => {
      expect(getContentType({})).toBe('');
      expect(getContentType(null)).toBe('');
      expect(getContentType(undefined)).toBe('');
    });
  });

  describe('formatSize', () => {
    it('should format bytes', () => {
      expect(formatSize(0)).toBe('0B');
      expect(formatSize(1023)).toBe('1023B');
    });

    it('should format kilobytes', () => {
      expect(formatSize(1024)).toBe('1.0KB');
      expect(formatSize(1048575)).toBe('1024.0KB');
    });

    it('should format megabytes', () => {
      expect(formatSize(1048576)).toBe('1.0MB');
      expect(formatSize(1073741823)).toBe('1024.0MB');
    });

    it('should format gigabytes', () => {
      expect(formatSize(1073741824)).toBe('1.0GB');
      expect(formatSize(1099511627776)).toBe('1024.0GB');
    });

    it('should format decimal values', () => {
      expect(formatSize(1126.5)).toBe('1.1KB');
      expect(formatSize(1153433.6)).toBe('1.1MB');
      expect(formatSize(1153433600)).toBe('1.1GB');
      expect(formatSize(1024.1)).toBe('1.0KB');
      expect(formatSize(1048576.1)).toBe('1.0MB');
    });

    it('should format invalid inputs', () => {
      expect(formatSize(null)).toBe('0B');
      expect(formatSize(undefined)).toBe('0B');
      expect(formatSize(NaN)).toBe('0B');
    });
  });
});
