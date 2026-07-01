const BrunoResponse = require('./bruno-response');

describe('BrunoResponse', () => {
  it('looks up response headers case-insensitively', () => {
    const res = new BrunoResponse({
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'application/json'
      },
      data: {}
    });

    expect(res.getHeader('Content-Type')).toBe('application/json');
    expect(res.getHeader('content-type')).toBe('application/json');
  });
});
