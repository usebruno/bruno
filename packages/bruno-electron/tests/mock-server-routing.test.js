const {
  DEFAULT_GATEWAY_PORT,
  normalizeUrlPath
} = require('../src/app/mock-server/mock-server-routing');

describe('mock-server routing', () => {
  it('normalizes request URLs to a path', () => {
    expect(normalizeUrlPath('https://api.example.com/v1/users')).toBe('/v1/users');
    expect(normalizeUrlPath('{{baseUrl}}/breeds')).toBe('/breeds');
    expect(normalizeUrlPath('/pets/?query=1')).toBe('/pets');
  });

  it('exposes the default gateway port', () => {
    expect(DEFAULT_GATEWAY_PORT).toBe(4000);
  });
});
