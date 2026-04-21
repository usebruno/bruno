import { applyQueryParamsToUrl } from './index';

const queryParam = (name, value, enabled = true) => ({ name, value, type: 'query', enabled });
const pathParam = (name, value, enabled = true) => ({ name, value, type: 'path', enabled });

describe('applyQueryParamsToUrl', () => {
  it('appends enabled query params to a URL with no query string', () => {
    const request = {
      url: 'https://api.example.com/items',
      params: [queryParam('partial', 'true'), queryParam('limit', '10')]
    };
    applyQueryParamsToUrl(request);
    expect(request.url).toBe('https://api.example.com/items?partial=true&limit=10');
  });

  it('replaces an existing query string with the params array', () => {
    const request = {
      url: 'https://api.example.com/items?stale=yes&dropped=1',
      params: [queryParam('partial', 'true')]
    };
    applyQueryParamsToUrl(request);
    expect(request.url).toBe('https://api.example.com/items?partial=true');
  });

  it('excludes disabled query params', () => {
    const request = {
      url: 'https://api.example.com/items',
      params: [queryParam('active', 'true'), queryParam('skipped', 'x', false)]
    };
    applyQueryParamsToUrl(request);
    expect(request.url).toBe('https://api.example.com/items?active=true');
  });

  it('strips an existing query string when all query params are disabled', () => {
    const request = {
      url: 'https://api.example.com/items?stale=yes',
      params: [queryParam('a', '1', false), queryParam('b', '2', false)]
    };
    applyQueryParamsToUrl(request);
    expect(request.url).toBe('https://api.example.com/items');
  });

  it('leaves the URL unchanged when there are no query params and no query string', () => {
    const request = { url: 'https://api.example.com/items', params: [] };
    applyQueryParamsToUrl(request);
    expect(request.url).toBe('https://api.example.com/items');
  });

  it('ignores path params when building the query string', () => {
    const request = {
      url: 'https://api.example.com/:id/items',
      params: [queryParam('partial', 'true'), pathParam('id', '123')]
    };
    applyQueryParamsToUrl(request);
    expect(request.url).toBe('https://api.example.com/:id/items?partial=true');
  });

  it('preserves a hash fragment when appending a query string', () => {
    const request = {
      url: 'https://api.example.com/items#section',
      params: [queryParam('partial', 'true')]
    };
    applyQueryParamsToUrl(request);
    expect(request.url).toBe('https://api.example.com/items?partial=true#section');
  });

  it('preserves a hash fragment when replacing an existing query string', () => {
    const request = {
      url: 'https://api.example.com/items?stale=yes#section',
      params: [queryParam('partial', 'true')]
    };
    applyQueryParamsToUrl(request);
    expect(request.url).toBe('https://api.example.com/items?partial=true#section');
  });

  it('preserves a hash fragment when stripping the query string', () => {
    const request = {
      url: 'https://api.example.com/items?stale=yes#section',
      params: [queryParam('a', '1', false)]
    };
    applyQueryParamsToUrl(request);
    expect(request.url).toBe('https://api.example.com/items#section');
  });

  it('does not encode values (encoding happens later in the pipeline)', () => {
    const request = {
      url: 'https://api.example.com/items',
      params: [queryParam('q', 'hello world')]
    };
    applyQueryParamsToUrl(request);
    expect(request.url).toBe('https://api.example.com/items?q=hello world');
  });

  it('is a no-op when request is undefined', () => {
    expect(() => applyQueryParamsToUrl(undefined)).not.toThrow();
  });

  it('is a no-op when request.params is undefined', () => {
    const request = { url: 'https://api.example.com/items' };
    applyQueryParamsToUrl(request);
    expect(request.url).toBe('https://api.example.com/items');
  });
});
