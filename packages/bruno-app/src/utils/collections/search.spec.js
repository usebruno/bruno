import {
  doesRequestMatchSearchText,
  doesFolderHaveItemsMatchSearchText,
  doesCollectionHaveItemsMatchingSearchText
} from './search';

const createRequest = (name, props = {}) => ({
  uid: name,
  name,
  type: 'http-request',
  request: {},
  ...props
});

const createFolder = (name, items = []) => ({
  uid: name,
  name,
  type: 'folder',
  items
});

describe('whether a request matches the search text', () => {
  it('matches request names case-insensitively', () => {
    expect(doesRequestMatchSearchText(createRequest('GetUser'), 'user')).toBe(true);
    expect(doesRequestMatchSearchText(createRequest('GetUser'), 'xyz')).toBe(false);
  });
});

describe('whether a folder contains a matching request', () => {
  it('matches requests nested inside folders', () => {
    const folder = createFolder('root', [
      createFolder('subfolder', [createRequest('login')]),
      createRequest('health')
    ]);

    expect(doesFolderHaveItemsMatchSearchText(folder, 'login')).toBe(true);
    expect(doesFolderHaveItemsMatchSearchText(folder, 'zzz')).toBe(false);
  });

  it('ignores transient requests', () => {
    const folder = createFolder('root', [
      createRequest('login', { isTransient: true })
    ]);

    expect(doesFolderHaveItemsMatchSearchText(folder, 'login')).toBe(false);
  });
});

describe('whether a collection contains a matching request', () => {
  it('matches requests anywhere in the collection tree', () => {
    const collection = {
      items: [
        createFolder('folder', [createRequest('deep-login')]),
        createRequest('health')
      ]
    };

    expect(doesCollectionHaveItemsMatchingSearchText(collection, 'login')).toBe(true);
    expect(doesCollectionHaveItemsMatchingSearchText(collection, 'zzz')).toBe(false);
  });
});
