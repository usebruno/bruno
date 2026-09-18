jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(function () {
    this.__data = {};
    this.get = (key) => this.__data[key];
    this.set = (key, value) => { this.__data[key] = value; };
    return this;
  });
});

const CollectionSecurityStore = require('../collection-security');

describe('CollectionSecurityStore', () => {
  let store;
  let backingStore;

  beforeEach(() => {
    store = new CollectionSecurityStore();
    backingStore = store.store;
  });

  it('returns an empty config when no entry exists for the collection', () => {
    expect(store.getSecurityConfigForCollection('/tmp/collection')).toEqual({});
  });

  it('round-trips the same path form (POSIX)', () => {
    store.setSecurityConfigForCollection('/tmp/collection', { jsSandboxMode: 'safe' });
    expect(store.getSecurityConfigForCollection('/tmp/collection')).toEqual({ jsSandboxMode: 'safe' });
  });

  it('resolves a Windows-style query against a POSIX-style stored key', () => {
    // This is the e2e fixture case: playwright seeds collection-security.json with
    // forward slashes (via {{workspacePath}}/{{collectionPath}} template rendering),
    // but at runtime path.resolve(workspacePath, 'collections/foo') on Windows produces
    // backslashes. Both sides must normalize before comparing.
    backingStore.set('collections', [
      { path: 'C:/Users/tester/ws/collections/foo', securityConfig: { jsSandboxMode: 'safe' } }
    ]);

    expect(store.getSecurityConfigForCollection('C:\\Users\\tester\\ws\\collections\\foo'))
      .toEqual({ jsSandboxMode: 'safe' });
  });

  it('resolves a POSIX-style query against a Windows-style stored key', () => {
    backingStore.set('collections', [
      { path: 'C:\\Users\\tester\\ws\\collections\\foo', securityConfig: { jsSandboxMode: 'developer' } }
    ]);

    expect(store.getSecurityConfigForCollection('C:/Users/tester/ws/collections/foo'))
      .toEqual({ jsSandboxMode: 'developer' });
  });

  it('ignores trailing slashes when matching', () => {
    store.setSecurityConfigForCollection('/tmp/collection/', { jsSandboxMode: 'safe' });
    expect(store.getSecurityConfigForCollection('/tmp/collection')).toEqual({ jsSandboxMode: 'safe' });
  });

  it('updates an existing entry rather than adding a duplicate on separator mismatch', () => {
    backingStore.set('collections', [
      { path: 'C:/Users/tester/ws/collections/foo', securityConfig: { jsSandboxMode: 'safe' } }
    ]);

    store.setSecurityConfigForCollection('C:\\Users\\tester\\ws\\collections\\foo', { jsSandboxMode: 'developer' });

    const collections = backingStore.get('collections');
    expect(collections).toHaveLength(1);
    expect(collections[0].securityConfig).toEqual({ jsSandboxMode: 'developer' });
  });
});
