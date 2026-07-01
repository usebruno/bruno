const BrunoResponse = require('../src/bruno-response');

describe('BrunoResponse getHeader (case-insensitive lookup)', () => {
  const createRes = () => ({
    status: 200,
    statusText: 'OK',
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-cache',
      'x-request-id': 'abc-123',
      'set-cookie': ['a=1', 'b=2'],
      'content-length': '512'
    },
    data: {}
  });

  it('looks up headers case-insensitively', () => {
    const res = new BrunoResponse(createRes());
    expect(res.getHeader('Content-Type')).toBe('application/json');
    expect(res.getHeader('CONTENT-TYPE')).toBe('application/json');
    expect(res.getHeader('Cache-Control')).toBe('no-cache');
    expect(res.getHeader('X-Request-Id')).toBe('abc-123');
    expect(res.getHeader('X-REQUEST-ID')).toBe('abc-123');
    expect(res.getHeader('Content-Length')).toBe('512');
  });

  it('returns array-valued headers as-is', () => {
    const res = new BrunoResponse(createRes());
    expect(res.getHeader('Set-Cookie')).toEqual(['a=1', 'b=2']);
  });

  it('returns undefined for a missing header', () => {
    const res = new BrunoResponse(createRes());
    expect(res.getHeader('X-Does-Not-Exist')).toBeUndefined();
  });
});
