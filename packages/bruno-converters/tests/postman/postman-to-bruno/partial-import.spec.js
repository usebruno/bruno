import { describe, it, expect } from '@jest/globals';
import postmanToBruno from '../../../src/postman/postman-to-bruno';

const makeCollection = (items, overrides = {}) => ({
  info: {
    _postman_id: 'test-id',
    name: 'Test Collection',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  item: items,
  ...overrides
});

const makeRequest = (name, method = 'GET', url = 'https://example.com') => ({
  name,
  request: {
    method,
    header: [],
    url: { raw: url, protocol: 'https', host: ['example', 'com'] }
  }
});

describe('partial-import', () => {
  it('should import valid items and skip items with missing method', async () => {
    const items = [
      makeRequest('Valid Request 1'),
      { name: 'Bad Request', request: { method: null, header: [], url: { raw: 'https://example.com' } } },
      makeRequest('Valid Request 2')
    ];

    const { collection, issues } = await postmanToBruno(makeCollection(items));

    expect(collection.items).toHaveLength(2);
    expect(collection.items[0].name).toBe('Valid Request 1');
    expect(collection.items[1].name).toBe('Valid Request 2');

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      path: 'Bad Request',
      severity: 'error',
      message: 'Missing or invalid request method'
    });
  });

  it('should import valid items and record errors for items that throw', async () => {
    // Create a request with a value that will cause ensureString to throw (circular ref)
    const circular = {};
    circular.self = circular;

    const items = [
      makeRequest('Valid Request'),
      {
        name: 'Circular Request',
        request: {
          method: 'POST',
          header: [{ key: circular, value: 'test' }],
          url: { raw: 'https://example.com' }
        }
      }
    ];

    const { collection, issues } = await postmanToBruno(makeCollection(items));

    expect(collection.items).toHaveLength(1);
    expect(collection.items[0].name).toBe('Valid Request');

    expect(issues).toHaveLength(1);
    expect(issues[0].path).toBe('Circular Request');
    expect(issues[0].severity).toBe('error');
  });

  it('should record issues for nested folder items with full path', async () => {
    const items = [
      {
        name: 'My Folder',
        item: [
          {
            name: 'Subfolder',
            item: [
              { name: 'Bad Nested', request: { method: null, header: [], url: { raw: 'https://example.com' } } },
              makeRequest('Good Nested')
            ]
          }
        ]
      }
    ];

    const { collection, issues } = await postmanToBruno(makeCollection(items));

    expect(collection.items).toHaveLength(1);
    expect(collection.items[0].type).toBe('folder');
    expect(collection.items[0].items[0].type).toBe('folder');
    expect(collection.items[0].items[0].items).toHaveLength(1);
    expect(collection.items[0].items[0].items[0].name).toBe('Good Nested');

    expect(issues).toHaveLength(1);
    expect(issues[0].path).toBe('My Folder / Subfolder / Bad Nested');
    expect(issues[0].severity).toBe('error');
  });

  it('should return empty issues array for valid collections', async () => {
    const items = [
      makeRequest('Request 1'),
      makeRequest('Request 2')
    ];

    const { collection, issues } = await postmanToBruno(makeCollection(items));

    expect(collection.items).toHaveLength(2);
    expect(issues).toEqual([]);
  });

  it('should handle empty collections with no issues', async () => {
    const { collection, issues } = await postmanToBruno(makeCollection([]));

    expect(collection.items).toEqual([]);
    expect(issues).toEqual([]);
  });

  it('should handle all items being malformed without throwing', async () => {
    const items = [
      { name: 'Bad 1', request: { method: null, header: [], url: { raw: 'https://example.com' } } },
      { name: 'Bad 2', request: { method: undefined, header: [], url: { raw: 'https://example.com' } } }
    ];

    const { collection, issues } = await postmanToBruno(makeCollection(items));

    expect(collection.items).toEqual([]);
    expect(issues).toHaveLength(2);
    expect(issues.every((i) => i.severity === 'error')).toBe(true);
  });

  it('should record warning for malformed collection-level variables', async () => {
    const collectionData = makeCollection([makeRequest('Valid')], {
      variable: 'not-an-array'
    });

    const { collection, issues } = await postmanToBruno(collectionData);

    expect(collection.items).toHaveLength(1);
    const warnings = issues.filter((i) => i.severity === 'warning');
    expect(warnings).toHaveLength(1);
    expect(warnings[0].path).toBe('Collection Variables');
  });

  it('should handle mixed valid/invalid items with folders and bad variables', async () => {
    const items = [
      makeRequest('r1', 'POST'),
      { name: 'r2-missing-method', request: { header: [], url: { raw: 'https://example.com' } } },
      makeRequest('r3', 'POST'),
      {
        name: 'API Folder',
        item: [
          makeRequest('valid-in-folder', 'GET'),
          { name: 'r4-null-method', request: { method: null, header: [], url: { raw: 'https://example.com' } } },
          {
            name: 'Nested Subfolder',
            item: [
              { name: 'r5-empty-method', request: { method: '', header: [], url: { raw: 'https://example.com' } } },
              makeRequest('valid-nested', 'DELETE')
            ]
          }
        ]
      }
    ];

    const { collection, issues } = await postmanToBruno(makeCollection(items, { variable: 'not-an-array' }));

    // 4 valid items: r1, r3, valid-in-folder, valid-nested
    expect(collection.items).toHaveLength(3); // r1, r3, API Folder
    expect(collection.items[0].name).toBe('r1');
    expect(collection.items[1].name).toBe('r3');
    expect(collection.items[2].name).toBe('API Folder');
    expect(collection.items[2].items).toHaveLength(2); // valid-in-folder, Nested Subfolder
    expect(collection.items[2].items[0].name).toBe('valid-in-folder');
    expect(collection.items[2].items[1].name).toBe('Nested Subfolder');
    expect(collection.items[2].items[1].items).toHaveLength(1); // valid-nested
    expect(collection.items[2].items[1].items[0].name).toBe('valid-nested');

    // 4 issues: 1 warning (variables) + 3 errors (missing/null/empty method)
    expect(issues).toHaveLength(4);
    expect(issues.filter((i) => i.severity === 'warning')).toHaveLength(1);
    expect(issues.filter((i) => i.severity === 'error')).toHaveLength(3);
    expect(issues.find((i) => i.path === 'r2-missing-method')).toBeTruthy();
    expect(issues.find((i) => i.path === 'API Folder / r4-null-method')).toBeTruthy();
    expect(issues.find((i) => i.path === 'API Folder / Nested Subfolder / r5-empty-method')).toBeTruthy();
  });

  it('should use fallback name for items without a name', async () => {
    const items = [
      { request: { method: null, header: [], url: { raw: 'https://example.com' } } }
    ];

    const { issues } = await postmanToBruno(makeCollection(items));

    expect(issues).toHaveLength(1);
    expect(issues[0].path).toBe('Item 1');
  });
});
