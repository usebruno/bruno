const { describe, it, expect } = require('@jest/globals');
const { parseUrl } = require('./url');

describe('parseUrl', () => {
  it.each([
    { url: 'https://example.com/path/10?a=1&b=2', host: 'example.com', path: '/path/10', query: 'a=1&b=2' },
    { url: 'https://example.com', host: 'example.com', path: '/' },
    { url: 'https://example.com:8080/path', host: 'example.com:8080', path: '/path' },
    { url: 'https://example.com:443/path', host: 'example.com', path: '/path' },
    { url: 'https://example.com/a/./b/../c', host: 'example.com', path: '/a/c' },
    { url: 'https://user:pass@example.com/path', host: 'example.com', path: '/path' },
    { url: 'https://user:p@ss@example.com/path', host: 'example.com', path: '/path' },
    { url: 'https://example.com/path?a=1#section', host: 'example.com', path: '/path', query: 'a=1' },
    { url: 'https://example.com/users/:id', host: 'example.com', path: '/users/:id' },
    { url: 'example.com/path', host: 'example.com', path: '/path' },
    { url: 'localhost:3000/path', host: 'localhost:3000', path: '/path' },
    { url: '{{BASEURL}}/path?a={{A}}', host: '{{BASEURL}}', path: '/path', query: 'a={{A}}' },
    { url: '{{BASEURL}}', host: '{{BASEURL}}' },
    { url: '{{BASEURL}}/users/:id?a=1#section', host: '{{BASEURL}}', path: '/users/:id', query: 'a=1' },
    { url: 'https://example.com/{{path}}', host: 'example.com', path: '/{{path}}' },
    { url: 'https://user:pass@{{HOST}}/path', host: '{{HOST}}', path: '/path' },
    { url: '{{proto}}://{{env}}:{{port}}/{{p}}?a={{a}}', host: '{{env}}:{{port}}', path: '/{{p}}', query: 'a={{a}}' }
  ])('parses $url', ({ url, host, path = '', query = '' }) => {
    expect(parseUrl(url)).toEqual({ host, pathname: path, queryString: query });
  });

  it.each([
    { name: 'an empty url', url: '' },
    { name: 'a null url', url: null },
    { name: 'a missing url', url: undefined }
  ])('throws for $name', ({ url }) => {
    expect(() => parseUrl(url)).toThrow('URL is empty');
  });
});
