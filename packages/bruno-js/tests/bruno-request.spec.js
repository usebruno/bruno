const { describe, it, expect } = require('@jest/globals');
const BrunoRequest = require('../src/bruno-request');

describe('BrunoRequest', () => {
  describe('getUrl - enhanced with properties', () => {
    it('should return URL as string (backward compatible)', () => {
      const req = new BrunoRequest({
        url: 'https://api.example.com/users/123',
        method: 'GET',
        headers: {},
        data: undefined,
      });

      const url = req.getUrl();
      // Should work as a string
      expect(url.toString()).toBe('https://api.example.com/users/123');
      expect(String(url)).toBe('https://api.example.com/users/123');
    });

    it('should support string concatenation (backward compatible)', () => {
      const req = new BrunoRequest({
        url: 'https://api.example.com/users',
        method: 'GET',
        headers: {},
        data: undefined,
      });

      const url = req.getUrl();
      expect(url + '/123').toBe('https://api.example.com/users/123');
    });

    it('should have .host property with hostname', () => {
      const req = new BrunoRequest({
        url: 'https://api.example.com/users/123',
        method: 'GET',
        headers: {},
        data: undefined,
      });

      expect(req.getUrl().host).toBe('api.example.com');
    });

    it('should extract hostname from http URL', () => {
      const req = new BrunoRequest({
        url: 'http://localhost:3000/api/test',
        method: 'GET',
        headers: {},
        data: undefined,
      });

      expect(req.getUrl().host).toBe('localhost:3000');
    });

    it('should extract hostname from URL with query parameters', () => {
      const req = new BrunoRequest({
        url: 'https://httpbin.org/anything?foo=bar&baz=qux',
        method: 'GET',
        headers: {},
        data: undefined,
      });

      expect(req.getUrl().host).toBe('httpbin.org');
    });

    it('should extract hostname from URL with hash', () => {
      const req = new BrunoRequest({
        url: 'https://example.com/path#section',
        method: 'GET',
        headers: {},
        data: undefined,
      });

      expect(req.getUrl().host).toBe('example.com');
    });

    it('should return empty string for .host on invalid URL', () => {
      const req = new BrunoRequest({
        url: '',
        method: 'GET',
        headers: {},
        data: undefined,
      });

      expect(req.getUrl().host).toBe('');
    });

    it('should return empty string for .host on null URL', () => {
      const req = new BrunoRequest({
        url: null,
        method: 'GET',
        headers: {},
        data: undefined,
      });

      expect(req.getUrl().host).toBe('');
    });
  });

  describe('getUrl().path - path segments array', () => {
    it('should have .path property with path segments from simple URL', () => {
      const req = new BrunoRequest({
        url: 'https://api.example.com/users/123/posts',
        method: 'GET',
        headers: {},
        data: undefined,
      });

      expect(req.getUrl().path).toEqual(['users', '123', 'posts']);
    });

    it('should extract path segments from URL with query parameters', () => {
      const req = new BrunoRequest({
        url: 'https://httpbin.org/anything/foo/bar?page=1&limit=10',
        method: 'GET',
        headers: {},
        data: undefined,
      });

      expect(req.getUrl().path).toEqual(['anything', 'foo', 'bar']);
    });

    it('should extract path segments from URL with hash', () => {
      const req = new BrunoRequest({
        url: 'https://example.com/path/to/resource#section',
        method: 'GET',
        headers: {},
        data: undefined,
      });

      expect(req.getUrl().path).toEqual(['path', 'to', 'resource']);
    });

    it('should extract path segments from URL with both query and hash', () => {
      const req = new BrunoRequest({
        url: 'https://example.com/api/v1/users?active=true#top',
        method: 'GET',
        headers: {},
        data: undefined,
      });

      expect(req.getUrl().path).toEqual(['api', 'v1', 'users']);
    });

    it('should filter out empty segments', () => {
      const req = new BrunoRequest({
        url: 'https://example.com/path//to///resource',
        method: 'GET',
        headers: {},
        data: undefined,
      });

      expect(req.getUrl().path).toEqual(['path', 'to', 'resource']);
    });

    it('should return empty array for root path', () => {
      const req = new BrunoRequest({
        url: 'https://example.com/',
        method: 'GET',
        headers: {},
        data: undefined,
      });

      expect(req.getUrl().path).toEqual([]);
    });

    it('should return empty array for URL without path', () => {
      const req = new BrunoRequest({
        url: 'https://example.com',
        method: 'GET',
        headers: {},
        data: undefined,
      });

      expect(req.getUrl().path).toEqual([]);
    });

    it('should return empty array for invalid URL', () => {
      const req = new BrunoRequest({
        url: '',
        method: 'GET',
        headers: {},
        data: undefined,
      });

      expect(req.getUrl().path).toEqual([]);
    });

    it('should return empty array for null URL', () => {
      const req = new BrunoRequest({
        url: null,
        method: 'GET',
        headers: {},
        data: undefined,
      });

      expect(req.getUrl().path).toEqual([]);
    });

    it('should handle URL with encoded characters', () => {
      const req = new BrunoRequest({
        url: 'https://example.com/users/john%20doe/profile',
        method: 'GET',
        headers: {},
        data: undefined,
      });

      expect(req.getUrl().path).toEqual(['users', 'john%20doe', 'profile']);
    });

    it('should support array indexing on .path', () => {
      const req = new BrunoRequest({
        url: 'https://httpbin.org/anything/foo/bar',
        method: 'GET',
        headers: {},
        data: undefined,
      });

      const path = req.getUrl().path;
      expect(path[0]).toBe('anything');
      expect(path[1]).toBe('foo');
      expect(path[2]).toBe('bar');
    });
  });

  describe('backward compatibility', () => {
    it('should work in string comparisons', () => {
      const req = new BrunoRequest({
        url: 'https://api.example.com/users',
        method: 'GET',
        headers: {},
        data: undefined,
      });

      const url = req.getUrl();
      expect(url == 'https://api.example.com/users').toBe(true);
    });

    it('should work with string methods', () => {
      const req = new BrunoRequest({
        url: 'https://api.example.com/users',
        method: 'GET',
        headers: {},
        data: undefined,
      });

      const url = req.getUrl();
      expect(url.includes('example.com')).toBe(true);
      expect(url.startsWith('https://')).toBe(true);
    });

    it('should get method', () => {
      const req = new BrunoRequest({
        url: 'https://api.example.com/users',
        method: 'POST',
        headers: {},
        data: undefined,
      });

      expect(req.getMethod()).toBe('POST');
    });
  });
});
