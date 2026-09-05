import { filterUnclaimedHeaders, getInheritedHeaders } from './getInheritedHeaders';

const request = {
  uid: 'request-1',
  type: 'http-request',
  name: 'Ping'
};

const collection = {
  uid: 'collection-1',
  name: 'Demo',
  items: [
    {
      uid: 'outer-folder',
      type: 'folder',
      name: 'Outer',
      root: {
        request: {
          headers: [
            { uid: 'outer-shared', name: 'X-Shared', value: 'from-outer', enabled: true },
            { uid: 'outer-only', name: 'X-Outer', value: 'outer', enabled: true }
          ]
        }
      },
      items: [
        {
          uid: 'inner-folder',
          type: 'folder',
          name: 'Inner',
          draft: {
            request: {
              headers: [
                { uid: 'inner-shared', name: 'X-Shared', value: 'from-inner', enabled: true },
                { uid: 'inner-disabled', name: 'X-Disabled', value: 'hidden', enabled: false },
                { uid: 'inner-last', name: 'X-Dup', value: 'first', enabled: true },
                { uid: 'inner-last-2', name: 'X-Dup', value: 'last', enabled: true }
              ]
            }
          },
          items: [request]
        }
      ]
    }
  ],
  root: {
    request: {
      headers: [
        { uid: 'collection-shared', name: 'X-Shared', value: 'from-collection', enabled: true },
        { uid: 'collection-token', name: 'X-Token', value: 'collection-token', enabled: true }
      ]
    }
  }
};

describe('getInheritedHeaders', () => {
  it('keeps the nearest enabled header for each name', () => {
    const inherited = getInheritedHeaders(collection, request);

    expect(inherited.map((header) => ({ name: header.name, value: header.value }))).toEqual([
      { name: 'X-Shared', value: 'from-inner' },
      { name: 'X-Dup', value: 'last' },
      { name: 'X-Outer', value: 'outer' },
      { name: 'X-Token', value: 'collection-token' }
    ]);
  });

  it('treats header names as case-insensitive when choosing a winner', () => {
    const inherited = getInheritedHeaders({
      uid: 'collection-1',
      name: 'Demo',
      items: [request],
      root: {
        request: {
          headers: [
            { uid: 'upper', name: 'X-Token', value: 'upper', enabled: true },
            { uid: 'lower', name: 'x-token', value: 'lower', enabled: true }
          ]
        }
      }
    }, request);

    expect(inherited).toHaveLength(1);
    expect(inherited[0]).toMatchObject({ name: 'x-token', value: 'lower' });
  });

  it('keeps the original source row uid for navigation', () => {
    const inherited = getInheritedHeaders(collection, request);
    const shared = inherited.find((header) => header.name === 'X-Shared');

    expect(shared.sourceRowUid).toBe('inner-shared');
    expect(shared.source).toMatchObject({ type: 'folder', uid: 'inner-folder', name: 'Inner' });
    expect(shared.uid).toBe('inherited-folder-inner-folder-inner-shared');
  });

  it('omits disabled headers', () => {
    const inherited = getInheritedHeaders(collection, request);
    expect(inherited.some((header) => header.name === 'X-Disabled')).toBe(false);
  });

  it('omits names already set on the request', () => {
    const inherited = getInheritedHeaders(collection, request, new Set(['x-token', 'X-Outer']));

    expect(inherited.map((header) => header.name)).toEqual(['X-Shared', 'X-Dup']);
  });

  it('does not omit an inherited header for a prefix or unrelated request name', () => {
    const inherited = getInheritedHeaders(collection, request, new Set(['x-tok', 'authorization']));

    expect(inherited.map((header) => header.name)).toEqual([
      'X-Shared',
      'X-Dup',
      'X-Outer',
      'X-Token'
    ]);
  });

  it('does not treat an empty request name as claimed', () => {
    const inherited = getInheritedHeaders(collection, request, new Set(['']));

    expect(inherited.map((header) => header.name)).toEqual([
      'X-Shared',
      'X-Dup',
      'X-Outer',
      'X-Token'
    ]);
  });

  it('drops a default header when an inherited header already claims the name', () => {
    const inherited = getInheritedHeaders(collection, request);
    const visibleDefaults = filterUnclaimedHeaders(
      [
        { name: 'User-Agent' },
        { name: 'Accept' },
        { name: 'X-Token' }
      ],
      inherited.map((header) => header.name)
    );

    expect(visibleDefaults.map((header) => header.name)).toEqual(['User-Agent', 'Accept']);
  });

  it('keeps a default header when the claimed name is only a prefix', () => {
    const visibleDefaults = filterUnclaimedHeaders(
      [{ name: 'User-Agent' }, { name: 'Accept' }],
      ['user', 'accept-']
    );

    expect(visibleDefaults.map((header) => header.name)).toEqual(['User-Agent', 'Accept']);
  });
});
