const BrunoResponse = require('../src/bruno-response');

describe('BrunoResponse getBody script size gate', () => {
  it('returns data when scriptBodyError is absent', () => {
    const res = new BrunoResponse({
      status: 200,
      statusText: 'OK',
      headers: {},
      data: { ok: true }
    });
    expect(res.getBody()).toEqual({ ok: true });
  });

  it('throws scriptBodyError from getBody', () => {
    const message = 'Response body is too large to use in scripts (52428801 bytes; max 52428800). Download the response instead.';
    const res = new BrunoResponse({
      status: 200,
      statusText: 'OK',
      headers: {},
      data: undefined,
      scriptBodyError: message
    });
    expect(() => res.getBody()).toThrow(message);
  });

  it('throws scriptBodyError from getDataBuffer', () => {
    const message = 'Response body is too large to use in scripts';
    const res = new BrunoResponse({
      status: 200,
      statusText: 'OK',
      headers: {},
      data: undefined,
      scriptBodyError: message
    });
    expect(() => res.getDataBuffer()).toThrow(message);
  });
});
