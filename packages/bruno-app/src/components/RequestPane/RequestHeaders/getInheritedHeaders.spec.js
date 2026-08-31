import { getInheritedHeaders } from './getInheritedHeaders';

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
});
