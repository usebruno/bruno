import { resolveInheritedAuth } from './auth-utils';

jest.mock('utils/collections/index', () => ({
  getTreePathFromCollectionToItem: (collection, itemUid) => {
    // Mock implementation that returns the path from collection to item
    if (itemUid === 'r1') {
      return [collection.items[0], collection.items[0].items[0]];
    }
    return [];
  }
}));

// Helper to build mock collection structure
const buildCollection = () => {
  return {
    uid: 'c1',
    root: {
      request: {
        auth: { mode: 'bearer', bearer: { token: 'COLLECTION' } }
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
    expect(resolved.auth.bearer.token).toBe('COLLECTION');
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