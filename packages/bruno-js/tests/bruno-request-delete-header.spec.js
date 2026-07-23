const { describe, it, expect, beforeEach } = require('@jest/globals');
const BrunoRequest = require('../src/bruno-request');

const makeReq = (overrides = {}) => ({
  url: 'http://localhost:5000/api',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    ...overrides.headers
  },
  data: undefined,
  ...overrides
});

describe('BrunoRequest - header deletion', () => {
  describe('deleteHeader()', () => {
    it('removes a user-set header from req.headers', () => {
      const rawReq = makeReq({ headers: { 'X-Custom': 'value' } });
      const req = new BrunoRequest(rawReq);

      req.deleteHeader('X-Custom');

      expect(rawReq.headers['X-Custom']).toBeUndefined();
    });

    it('adds the header name to __headersToDelete on the req object', () => {
      const rawReq = makeReq();
      const req = new BrunoRequest(rawReq);

      req.deleteHeader('user-agent');

      expect(rawReq.__headersToDelete).toEqual(['user-agent']);
    });

    it('tracks multiple deleteHeader calls without duplicates', () => {
      const rawReq = makeReq();
      const req = new BrunoRequest(rawReq);

      req.deleteHeader('user-agent');
      req.deleteHeader('accept');
      req.deleteHeader('user-agent'); // duplicate – should not be added again

      expect(rawReq.__headersToDelete).toEqual(['user-agent', 'accept']);
    });

    it('does NOT attach a non-enumerable __headersToDelete to req.headers', () => {
      const rawReq = makeReq();
      const req = new BrunoRequest(rawReq);

      req.deleteHeader('accept-encoding');

      // The non-enumerable approach was removed; __headersToDelete must NOT be on headers
      expect(rawReq.headers.__headersToDelete).toBeUndefined();
      // But it must be on the req config object itself
      expect(rawReq.__headersToDelete).toContain('accept-encoding');
    });
  });

  describe('deleteHeaders()', () => {
    it('removes multiple user-set headers from req.headers', () => {
      const rawReq = makeReq({ headers: { 'X-A': '1', 'X-B': '2', 'X-C': '3' } });
      const req = new BrunoRequest(rawReq);

      req.deleteHeaders(['X-A', 'X-C']);

      expect(rawReq.headers['X-A']).toBeUndefined();
      expect(rawReq.headers['X-C']).toBeUndefined();
      expect(rawReq.headers['X-B']).toBe('2');
    });

    it('adds all names to __headersToDelete so default headers can be suppressed', () => {
      const rawReq = makeReq();
      const req = new BrunoRequest(rawReq);

      req.deleteHeaders(['user-agent', 'accept', 'accept-encoding']);

      expect(rawReq.__headersToDelete).toEqual(['user-agent', 'accept', 'accept-encoding']);
    });

    it('does not duplicate entries when deleteHeaders is called with the same name twice', () => {
      const rawReq = makeReq();
      const req = new BrunoRequest(rawReq);

      req.deleteHeaders(['user-agent', 'accept']);
      req.deleteHeaders(['user-agent']); // duplicate

      expect(rawReq.__headersToDelete).toEqual(['user-agent', 'accept']);
    });

    it('delegates to deleteHeader so tracking is consistent', () => {
      const rawReq = makeReq({ headers: { 'X-Test': 'hello' } });
      const req = new BrunoRequest(rawReq);

      req.deleteHeaders(['X-Test', 'connection']);

      // User-set header removed immediately
      expect(rawReq.headers['X-Test']).toBeUndefined();
      // Both tracked for interceptor
      expect(rawReq.__headersToDelete).toContain('X-Test');
      expect(rawReq.__headersToDelete).toContain('connection');
    });
  });

  describe('host header protection', () => {
    it('still tracks host in __headersToDelete even though the interceptor will ignore it', () => {
      // The protection lives in the axios interceptor, not in BrunoRequest itself.
      // BrunoRequest just tracks whatever the user asks to delete.
      const rawReq = makeReq();
      const req = new BrunoRequest(rawReq);

      req.deleteHeader('host');

      expect(rawReq.__headersToDelete).toContain('host');
    });
  });
});
