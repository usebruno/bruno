import { getEffectiveAuthSource, resolveInheritedAuth } from './index';

jest.mock('utils/collections/index', () => ({
  // General path finder: walks the collection.items tree until it finds the
  // item with the matching uid and returns the full path to it.
  getTreePathFromCollectionToItem: (collection, item) => {
    const findPath = (items, targetUid, path = []) => {
      for (const i of items || []) {
        const next = [...path, i];
        if (i.uid === targetUid) return next;
        if (i.items) {
          const found = findPath(i.items, targetUid, next);
          if (found) return found;
        }
      }
      return null;
    };
    return findPath(collection.items, item?.uid) || [];
  }
}));

// Helper to build mock collection structure
const buildCollection = () => {
  return {
    uid: 'c1',
    root: {
      request: {
        auth: { mode: 'bearer', bearer: { token: 'COLLECTION_LEVEL_TOKEN' } }
      }
    },
    items: [
      {
        uid: 'f1',
        type: 'folder',
        name: 'Folder',
        root: {
          request: {
            auth: { mode: 'basic', basic: { username: 'user', password: 'pass' } }
          }
        },
        items: [
          {
            uid: 'r1',
            type: 'request',
            name: 'Request',
            request: {
              auth: { mode: 'inherit' },
              url: 'http://example.com',
              method: 'GET'
            }
          }
        ]
      }
    ]
  };
};

describe('auth-utils.resolveInheritedAuth', () => {
  it('should resolve to nearest folder auth when request mode is inherit', () => {
    const collection = buildCollection();
    const item = collection.items[0].items[0]; // r1

    const resolved = resolveInheritedAuth(item, collection);
    expect(resolved.auth.mode).toBe('basic');
    expect(resolved.auth.basic.username).toBe('user');
  });

  it('should resolve to collection auth if no folder auth', () => {
    const collection = buildCollection();
    collection.items[0].root.request.auth = { mode: 'inherit' };
    const item = collection.items[0].items[0];

    const resolved = resolveInheritedAuth(item, collection);
    expect(resolved.auth.mode).toBe('bearer');
    expect(resolved.auth.bearer.token).toBe('COLLECTION_LEVEL_TOKEN');
  });

  it('should return original request when mode is not inherit', () => {
    const collection = buildCollection();
    const item = collection.items[0].items[0];
    item.request.auth = { mode: 'basic', basic: { username: 'override', password: 'pwd' } };

    const resolved = resolveInheritedAuth(item, collection);
    expect(resolved.auth.mode).toBe('basic');
    expect(resolved.auth.basic.username).toBe('override');
  });
});

describe('auth-utils.getEffectiveAuthSource', () => {
  it('returns null when the request mode is not inherit', () => {
    const collection = buildCollection();
    const item = collection.items[0].items[0]; // r1
    item.request.auth = { mode: 'bearer', bearer: { token: 'MOCK_REQUEST_OWN_TOKEN_STRING' } };

    expect(getEffectiveAuthSource(collection, item)).toBeNull();
  });

  it('returns null when the request has no auth configured', () => {
    const collection = buildCollection();
    const item = collection.items[0].items[0];
    item.request.auth = undefined;

    expect(getEffectiveAuthSource(collection, item)).toBeNull();
  });

  it('returns the nearest configured folder when request inherits and folder has auth', () => {
    const collection = buildCollection();
    const item = collection.items[0].items[0]; // r1, mode 'inherit'

    const source = getEffectiveAuthSource(collection, item);
    expect(source).toEqual({
      type: 'folder',
      name: 'Folder',
      auth: { mode: 'basic', basic: { username: 'user', password: 'pass' } }
    });
  });

  it('falls back to the collection when no ancestor folder has configured auth', () => {
    const collection = buildCollection();
    // make the folder also inherit so the walk falls through to the collection
    collection.items[0].root.request.auth = { mode: 'inherit' };
    const item = collection.items[0].items[0];

    const source = getEffectiveAuthSource(collection, item);
    expect(source).toEqual({
      type: 'collection',
      name: 'Collection',
      auth: { mode: 'bearer', bearer: { token: 'COLLECTION_LEVEL_TOKEN' } }
    });
  });

  it('skips the item itself when the item is a folder in inherit mode', () => {
    // Build a parent → child folder chain; child is the item under test.
    const collection = {
      uid: 'c1',
      root: { request: { auth: { mode: 'bearer', bearer: { token: 'COLLECTION_LEVEL_TOKEN' } } } },
      items: [
        {
          uid: 'parent',
          type: 'folder',
          name: 'Parent',
          root: { request: { auth: { mode: 'basic', basic: { username: 'p', password: 'p' } } } },
          items: [
            {
              uid: 'child',
              type: 'folder',
              name: 'Child',
              root: { request: { auth: { mode: 'inherit' } } },
              items: []
            }
          ]
        }
      ]
    };
    const child = collection.items[0].items[0];

    const source = getEffectiveAuthSource(collection, child);
    expect(source).toEqual({
      type: 'folder',
      name: 'Parent',
      auth: { mode: 'basic', basic: { username: 'p', password: 'p' } }
    });
  });

  it('prefers the draft mode when item.draft exists', () => {
    const collection = buildCollection();
    const item = collection.items[0].items[0];
    item.request.auth = { mode: 'bearer' }; // saved is not inherit
    item.draft = { request: { auth: { mode: 'inherit' } } }; // draft is inherit

    const source = getEffectiveAuthSource(collection, item);
    expect(source).toEqual({
      type: 'folder',
      name: 'Folder',
      auth: { mode: 'basic', basic: { username: 'user', password: 'pass' } }
    });
  });

  it('resolves correctly when both draft and saved auth are inherit on a folder whose parent is also a folder', () => {
    const collection = {
      uid: 'c1',
      root: { request: { auth: { mode: 'bearer', bearer: { token: 'COLLECTION_LEVEL_TOKEN' } } } },
      items: [
        {
          uid: 'parent',
          type: 'folder',
          name: 'Parent',
          root: { request: { auth: { mode: 'basic', basic: { username: 'p', password: 'p' } } } },
          items: [
            {
              uid: 'child',
              type: 'folder',
              name: 'Child',
              root: { request: { auth: { mode: 'inherit' } } }, // saved: inherit
              draft: { request: { auth: { mode: 'inherit' } } }, // draft: inherit
              items: []
            }
          ]
        }
      ]
    };
    const child = collection.items[0].items[0];

    const source = getEffectiveAuthSource(collection, child);
    expect(source).toEqual({
      type: 'folder',
      name: 'Parent',
      auth: { mode: 'basic', basic: { username: 'p', password: 'p' } }
    });
  });

  it('handles a folder item without draft using its root.request.auth.mode', () => {
    // The folder's mode is read from root.request.auth.mode when no draft exists.
    const collection = {
      uid: 'c1',
      root: { request: { auth: { mode: 'bearer', bearer: { token: 'COLLECTION_LEVEL_TOKEN' } } } },
      items: [
        {
          uid: 'folder-inherit',
          type: 'folder',
          name: 'FolderInherit',
          root: { request: { auth: { mode: 'inherit' } } },
          items: []
        }
      ]
    };
    const folder = collection.items[0];

    const source = getEffectiveAuthSource(collection, folder);
    expect(source).toEqual({
      type: 'collection',
      name: 'Collection',
      auth: { mode: 'bearer', bearer: { token: 'COLLECTION_LEVEL_TOKEN' } }
    });
  });

  it('skips ancestor folders whose auth.mode is itself "inherit"', () => {
    // Parent folder also inherits — walk should continue past it to collection.
    const collection = {
      uid: 'c1',
      root: { request: { auth: { mode: 'bearer', bearer: { token: 'COLLECTION_LEVEL_TOKEN' } } } },
      items: [
        {
          uid: 'parent',
          type: 'folder',
          name: 'Parent',
          root: { request: { auth: { mode: 'inherit' } } },
          items: [
            {
              uid: 'r1',
              type: 'request',
              name: 'Request',
              request: { auth: { mode: 'inherit' } }
            }
          ]
        }
      ]
    };
    const item = collection.items[0].items[0];

    const source = getEffectiveAuthSource(collection, item);
    expect(source).toEqual({
      type: 'collection',
      name: 'Collection',
      auth: { mode: 'bearer', bearer: { token: 'COLLECTION_LEVEL_TOKEN' } }
    });
  });
});
