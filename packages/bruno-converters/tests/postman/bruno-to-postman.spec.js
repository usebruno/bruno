const { sanitizeUrl, transformUrl } = require('./postman-collection');

describe('transformUrl', () => {
  it('should handle basic URL with path variables', () => {
    const url = 'https://example.com/{{username}}/api/resource/:id';
    const params = [
      { name: 'id', value: '123', type: 'path' },
    ];

    const result = transformUrl(url, params);

    expect(result).toEqual({
      raw: 'https://example.com/{{username}}/api/resource/:id',
      protocol: 'https',
      host: ['example', 'com'],
      path: ['{{username}}', 'api', 'resource', ':id'],
      query: [],
      variable: [
        { key: 'id', value: '123' },
      ]
    });
  });

  it('should handle URL with query parameters', () => {
    const url = 'https://example.com/api/resource?limit=10&offset=20';
    const params = [
      { name: 'limit', value: '10', type: 'query' },
      { name: 'offset', value: '20', type: 'query' }
    ];

    const result = transformUrl(url, params);

    expect(result).toEqual({
      raw: 'https://example.com/api/resource?limit=10&offset=20',
      protocol: 'https',
      host: ['example', 'com'],
      path: ['api', 'resource'],
      query: [
        { key: 'limit', value: '10' },
        { key: 'offset', value: '20' }
      ],
      variable: []
    });
  });

  it('should handle URL without protocol', () => {
    const url = 'example.com/api/resource';
    const params = [];

    const result = transformUrl(url, params);

    expect(result).toEqual({
      raw: 'example.com/api/resource',
      protocol: '',
      host: ['example', 'com'],
      path: ['api', 'resource'],
      query: [],
      variable: []
    });
  });
});

describe('sanitizeUrl', () => {
  it('should replace backslashes with slashes', () => {
    const input = 'http:\\\\example.com\\path\\to\\file';
    const expected = 'http://example.com/path/to/file';
    expect(sanitizeUrl(input)).toBe(expected);
  });

  it('should collapse multiple slashes into a single slash', () => {
    const input = 'http://example.com//path///to////file';
    const expected = 'http://example.com/path/to/file';
    expect(sanitizeUrl(input)).toBe(expected);
  });

  it('should handle URLs with mixed slashes', () => {
    const input = 'http:\\example.com//path\\to//file';
    const expected = 'http://example.com/path/to/file';
    expect(sanitizeUrl(input)).toBe(expected);
  });
})
