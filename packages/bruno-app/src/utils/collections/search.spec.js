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

  it('matches request URLs case-insensitively', () => {
    const request = createRequest('health', {
      request: { url: 'https://payments.example.com/charge' }
    });

    expect(doesRequestMatchSearchText(request, 'PAYMENTS.EXAMPLE')).toBe(true);
    expect(doesRequestMatchSearchText(request, 'missing')).toBe(false);
  });
});

describe('whether a folder matches the search text', () => {
  it('matches the folder name case-insensitively', () => {
    expect(doesFolderHaveItemsMatchSearchText(createFolder('Accounts'), 'account')).toBe(true);
    expect(doesFolderHaveItemsMatchSearchText(createFolder('Accounts'), 'zzz')).toBe(false);
  });

  it('matches requests nested inside folders', () => {
    const folder = createFolder('root', [
      createFolder('subfolder', [createRequest('login')]),
      createRequest('health')
    ]);

    expect(doesFolderHaveItemsMatchSearchText(folder, 'login')).toBeTruthy();
    expect(doesFolderHaveItemsMatchSearchText(folder, 'zzz')).toBeFalsy();
  });

  it('matches nested folder names even when no request matches', () => {
    const folder = createFolder('root', [
      createFolder('Billing', [createRequest('charge')])
    ]);

    expect(doesFolderHaveItemsMatchSearchText(folder, 'bill')).toBeTruthy();
  });

  it('ignores transient requests', () => {
    const folder = createFolder('root', [
      createRequest('login', { isTransient: true })
    ]);

    expect(doesFolderHaveItemsMatchSearchText(folder, 'login')).toBeFalsy();
  });
});

describe('whether a collection matches the search text', () => {
  it('matches the collection name', () => {
    expect(doesCollectionHaveItemsMatchingSearchText({ name: 'Payments', items: [] }, 'payments')).toBeTruthy();
  });

  it('matches requests anywhere in the collection tree', () => {
    const collection = {
      items: [
        createFolder('folder', [createRequest('deep-login')]),
        createRequest('health')
      ]
    };

    expect(doesCollectionHaveItemsMatchingSearchText(collection, 'login')).toBeTruthy();
    expect(doesCollectionHaveItemsMatchingSearchText(collection, 'zzz')).toBeFalsy();
  });

  it('matches folder names anywhere in the collection tree', () => {
    const collection = {
      items: [
        createFolder('Accounts', [createRequest('charge')])
      ]
    };

    expect(doesCollectionHaveItemsMatchingSearchText(collection, 'account')).toBeTruthy();
  });
});
