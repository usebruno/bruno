import { extractMockResponseRoutePath, buildMockServerTryUrl } from './mock-responses';

describe('extractMockResponseRoutePath', () => {
  it('re-exports the shared mock route path helper', () => {
    expect(extractMockResponseRoutePath('{{baseUrl}}/breeds')).toBe('/breeds');
    expect(extractMockResponseRoutePath('https://api.example.com/v1/users')).toBe('/v1/users');
  });
});

describe('buildMockServerTryUrl', () => {
  it('appends enabled query params to the try url', () => {
    expect(buildMockServerTryUrl({
      port: 4000,
      requestUrl: '/breeds',
      params: [
        { name: 'limit', value: '10', enabled: true },
        { name: 'skip', value: '1', enabled: false }
      ]
    })).toBe('http://localhost:4000/breeds?limit=10');
  });
});
