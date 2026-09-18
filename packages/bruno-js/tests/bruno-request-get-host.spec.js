const { describe, it, expect } = require('@jest/globals');
const BrunoRequest = require('../src/bruno-request');

const getHost = (url) => new BrunoRequest({ url, method: 'GET', headers: {} }).getHost();

describe('BrunoRequest - getHost()', () => {
  describe('interpolated urls', () => {
    it('returns the host and port', () => {
      expect(getHost('http://localhost:5000/api')).toBe('localhost:5000');
    });

    it('lowercases a literal hostname, as URL does', () => {
      expect(getHost('https://API.Example.com/users')).toBe('api.example.com');
    });

    it('returns an empty string for a url it cannot parse', () => {
      expect(getHost('not a url')).toBe('');
    });
  });

  describe('urls still holding {{variables}}', () => {
    it('keeps the case of a variable in the hostname', () => {
      // #9234: `new URL()` lowercased this to `{{host}}`, which no longer interpolates
      expect(getHost('https://{{HOST}}/test')).toBe('{{HOST}}');
    });

    it('returns the variable when it carries the scheme as well', () => {
      // #9233: `{{HOST}}/test` has no scheme, so `new URL()` threw and this was ''
      expect(getHost('{{HOST}}/test')).toBe('{{HOST}}');
    });

    it('keeps a port, literal or variable', () => {
      expect(getHost('http://{{host}}:{{port}}/x')).toBe('{{host}}:{{port}}');
      expect(getHost('http://{{Host}}:8080/x')).toBe('{{Host}}:8080');
    });

    it('stops at a query string or fragment', () => {
      expect(getHost('{{baseUrl}}?page=1')).toBe('{{baseUrl}}');
      expect(getHost('https://{{HOST}}#section')).toBe('{{HOST}}');
    });

    it('drops userinfo', () => {
      expect(getHost('https://{{user}}:{{pass}}@{{HOST}}/x')).toBe('{{HOST}}');
    });

    it('leaves a literal host alone when only the path has variables', () => {
      expect(getHost('https://API.Example.com/users/{{id}}')).toBe('api.example.com');
    });
  });
});
