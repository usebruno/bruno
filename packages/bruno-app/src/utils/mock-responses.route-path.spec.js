import { extractMockResponseRoutePath, buildMockServerTryUrl } from './mock-responses';

describe('extractMockResponseRoutePath', () => {
  it('strips hosts and variables from mock endpoint urls', () => {
    expect(extractMockResponseRoutePath('{{baseUrl}}/breeds')).toBe('/breeds');
    expect(extractMockResponseRoutePath('google.com/test')).toBe('/test');
    expect(extractMockResponseRoutePath('https://api.example.com/v1/users')).toBe('/v1/users');
    expect(extractMockResponseRoutePath('127.0.0.1:8080/api')).toBe('/api');
    expect(extractMockResponseRoutePath('pets')).toBe('/pets');
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
    })).toBe('http://127.0.0.1:4000/breeds?limit=10');
  });
});
