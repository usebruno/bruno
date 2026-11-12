const { describe, it, expect } = require('@jest/globals');
const BrunoRequest = require('../src/bruno-request');

const makeReq = (overrides = {}) => ({
  url: 'http://localhost:5000/api',
  method: 'GET',
  headers: {},
  ...overrides
});

describe('BrunoRequest - getMethod(), setMethod()', () => {
  it('returns initial request method', () => {
    const req = new BrunoRequest(makeReq({ method: 'GET' }));
    expect(req.getMethod()).toBe('GET');
  });

  it('normalizes lowercase method to uppercase in setMethod', () => {
    const req = new BrunoRequest(makeReq());
    req.setMethod('post');
    expect(req.getMethod()).toBe('POST');
    expect(req.method).toBe('POST');
    expect(req.req.method).toBe('POST');
  });

  it('handles non-string method gracefully in setMethod', () => {
    const req = new BrunoRequest(makeReq());
    req.setMethod(undefined);
    expect(req.getMethod()).toBeUndefined();
  });
});
