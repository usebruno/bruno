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

    it('should have .host property as array of hostname parts (matching Postman)', () => {
      const req = new BrunoRequest({
        url: 'https://api.example.com/users/123',
        method: 'GET',
        headers: {},
        data: undefined,
      });

      expect(req.getUrl().host).toEqual(['api', 'example', 'com']);
    });

    it('should extract hostname parts from http URL with port', () => {
      const req = new BrunoRequest({
        url: 'http://localhost:3000/api/test',
        method: 'GET',
        headers: {},
        data: undefined,
      });

      expect(req.getUrl().host).toEqual(['localhost:3000']);
    });

    it('should extract hostname parts from URL with query parameters', () => {
      const req = new BrunoRequest({
        url: 'https://httpbin.org/anything?foo=bar&baz=qux',
        method: 'GET',
        headers: {},
        data: undefined,
      });

      expect(req.getUrl().host).toEqual(['httpbin', 'org']);
    });

    it('should extract hostname parts from URL with hash', () => {
      const req = new BrunoRequest({
        url: 'https://example.com/path#section',
        method: 'GET',
        headers: {},
        data: undefined,
      });

      expect(req.getUrl().host).toEqual(['example', 'com']);
    });

    it('should return empty array for .host on invalid URL', () => {
      const req = new BrunoRequest({
        url: '',
        method: 'GET',
        headers: {},
        data: undefined,
      });

      expect(req.getUrl().host).toEqual([]);
    });

    it('should return empty array for .host on null URL', () => {
      const req = new BrunoRequest({
        url: null,
        method: 'GET',
        headers: {},
        data: undefined,
      });

      expect(req.getUrl().host).toEqual([]);
    });
  });

  describe('getUrl().getHost() - hostname as string', () => {
    it('should have .getHost() method that returns hostname as string', () => {
      const req = new BrunoRequest({
        url: 'https://api.example.com/users/123',
        method: 'GET',
        headers: {},
        data: undefined,
      });

      expect(typeof req.getUrl().getHost).toBe('function');
      expect(req.getUrl().getHost()).toBe('api.example.com');
    });

    it('should return joined hostname from .host array', () => {
      const req = new BrunoRequest({
        url: 'https://postman-echo.com/get',
        method: 'GET',
        headers: {},
        data: undefined,
      });

      const url = req.getUrl();
      expect(url.host).toEqual(['postman-echo', 'com']);
      expect(url.getHost()).toBe('postman-echo.com');
    });

    it('should return empty string for URL without hostname', () => {
      const req = new BrunoRequest({
        url: '',
        method: 'GET',
        headers: {},
        data: undefined,
      });

      expect(req.getUrl().getHost()).toBe('');
    });

    it('should match Postman API behavior: .host is array, .getHost() is string', () => {
      const req = new BrunoRequest({
        url: 'https://httpbin.org/anything',
        method: 'GET',
        headers: {},
        data: undefined,
      });

      const url = req.getUrl();
      // pm.request.url.host returns array
      expect(Array.isArray(url.host)).toBe(true);
      expect(url.host).toEqual(['httpbin', 'org']);

      // pm.request.url.getHost() returns string
      expect(typeof url.getHost()).toBe('string');
      expect(url.getHost()).toBe('httpbin.org');
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
