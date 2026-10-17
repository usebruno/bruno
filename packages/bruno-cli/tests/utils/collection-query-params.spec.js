const { describe, it, expect } = require('@jest/globals');

const { getInheritedQueryParams, applyInheritedQueryParams } = require('../../src/utils/collection');

const qp = (name, value, enabled = true) => ({ name, value, enabled, type: 'query' });

describe('getInheritedQueryParams (issue #9553)', () => {
  it('returns collection-level query params when there are no folders', () => {
    const collection = {
      root: { request: { params: [qp('pageSize', '20'), qp('format', 'json')] } },
      items: []
    };
    expect(getInheritedQueryParams(collection, [])).toEqual([
      { name: 'pageSize', value: '20' },
      { name: 'format', value: 'json' }
    ]);
  });

  it('lets a folder param override the collection param of the same name', () => {
    const collection = {
      root: { request: { params: [qp('pageSize', '20'), qp('format', 'json')] } },
      items: []
    };
    const treePath = [
      { type: 'folder', root: { request: { params: [qp('pageSize', '50')] } } },
      { type: 'http-request' }
    ];
    expect(getInheritedQueryParams(collection, treePath)).toEqual([
      { name: 'pageSize', value: '50' },
      { name: 'format', value: 'json' }
    ]);
  });

  it('lets the innermost folder win across nested folders', () => {
    const collection = { root: { request: { params: [qp('a', 'collection'), qp('b', 'collection'), qp('c', 'collection')] } } };
    const treePath = [
      { type: 'folder', root: { request: { params: [qp('a', 'outer')] } } },
      { type: 'folder', root: { request: { params: [qp('a', 'inner'), qp('b', 'inner')] } } },
      { type: 'http-request' }
    ];
    expect(getInheritedQueryParams(collection, treePath)).toEqual([
      { name: 'a', value: 'inner' },
      { name: 'b', value: 'inner' },
      { name: 'c', value: 'collection' }
    ]);
  });

  it('a disabled folder entry suppresses the inherited name', () => {
    const collection = { root: { request: { params: [qp('pageSize', '20')] } } };
    const treePath = [
      { type: 'folder', root: { request: { params: [qp('pageSize', '50', false)] } } },
      { type: 'http-request' }
    ];
    expect(getInheritedQueryParams(collection, treePath)).toEqual([]);
  });

  it('ignores path params and nameless entries', () => {
    const collection = {
      root: {
        request: {
          params: [
            { name: 'id', value: '1', enabled: true, type: 'path' },
            { name: '', value: 'x', enabled: true, type: 'query' },
            { value: 'y', enabled: true, type: 'query' }
          ]
        }
      }
    };
    expect(getInheritedQueryParams(collection, [])).toEqual([]);
  });

  it('returns [] when nothing defines query params', () => {
    expect(getInheritedQueryParams({}, [])).toEqual([]);
    expect(getInheritedQueryParams({ root: {} }, [])).toEqual([]);
    expect(getInheritedQueryParams(null, [])).toEqual([]);
  });

  it('reads folder drafts when present', () => {
    const collection = { root: { request: { params: [] } } };
    const treePath = [
      {
        type: 'folder',
        root: { request: { params: [qp('a', 'saved')] } },
        draft: { request: { params: [qp('a', 'draft')] } }
      },
      { type: 'http-request' }
    ];
    expect(getInheritedQueryParams(collection, treePath)).toEqual([{ name: 'a', value: 'draft' }]);
  });
});

describe('applyInheritedQueryParams (issue #9553)', () => {
  it('appends inherited params to a URL without a query string', () => {
    expect(applyInheritedQueryParams('https://api.example.com/users', [{ name: 'pageSize', value: '20' }], [])).toBe(
      'https://api.example.com/users?pageSize=20'
    );
  });

  it('appends to a URL that already has a query string', () => {
    expect(
      applyInheritedQueryParams('https://api.example.com/users?sort=asc', [{ name: 'pageSize', value: '20' }], [])
    ).toBe('https://api.example.com/users?sort=asc&pageSize=20');
  });

  it('does not duplicate a name the request already defines in the URL', () => {
    expect(
      applyInheritedQueryParams(
        'https://api.example.com/users?pageSize=50',
        [
          { name: 'pageSize', value: '20' },
          { name: 'format', value: 'json' }
        ],
        []
      )
    ).toBe('https://api.example.com/users?pageSize=50&format=json');
  });

  it('a disabled request-level param suppresses the inherited entry of the same name', () => {
    expect(
      applyInheritedQueryParams(
        'https://api.example.com/users',
        [{ name: 'pageSize', value: '20' }],
        [{ name: 'pageSize', value: '50', enabled: false, type: 'query' }]
      )
    ).toBe('https://api.example.com/users');
  });

  it('keeps {{variables}} in inherited values unencoded for send-time interpolation', () => {
    expect(
      applyInheritedQueryParams('https://api.example.com/users', [{ name: 'token', value: '{{apiToken}}' }], [])
    ).toBe('https://api.example.com/users?token={{apiToken}}');
  });

  it('inserts before a #fragment instead of appending after it', () => {
    expect(
      applyInheritedQueryParams('https://api.example.com/users#section', [{ name: 'pageSize', value: '20' }], [])
    ).toBe('https://api.example.com/users?pageSize=20#section');
  });

  it('leaves the URL untouched when there is nothing to inherit', () => {
    const url = 'https://api.example.com/users?sort=asc';
    expect(applyInheritedQueryParams(url, [], [])).toBe(url);
    expect(applyInheritedQueryParams(url, [{ name: 'sort', value: 'desc' }], [])).toBe(url);
  });

  it('returns the URL as-is for empty input', () => {
    expect(applyInheritedQueryParams('', [{ name: 'a', value: 'b' }], [])).toBe('');
    expect(applyInheritedQueryParams(null, [{ name: 'a', value: 'b' }], [])).toBe(null);
  });
});
