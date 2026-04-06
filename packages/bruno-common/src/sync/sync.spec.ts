import { normalizeUrlPath, isPathInsideCollection } from './normalize';
import { buildSpecItemsMap, extractJsonKeys, compareRequestFields } from './compare';
import { mergeWithUserValues, mergeSpecIntoRequest } from './merge';
import { isValidOpenApiSpec, generateSpecHash } from './spec-utils';

describe('normalizeUrlPath', () => {
  it('strips template variables', () => {
    expect(normalizeUrlPath('{{baseUrl}}/users')).toBe('/users');
  });

  it('strips protocol and host', () => {
    expect(normalizeUrlPath('https://api.example.com/users')).toBe('/users');
  });

  it('strips query params', () => {
    expect(normalizeUrlPath('/users?page=1&limit=10')).toBe('/users');
  });

  it('converts {param} to :param', () => {
    expect(normalizeUrlPath('/users/{id}/posts/{postId}')).toBe('/users/:id/posts/:postId');
  });

  it('collapses multiple slashes', () => {
    expect(normalizeUrlPath('///users///posts//')).toBe('/users/posts');
  });

  it('removes trailing slash', () => {
    expect(normalizeUrlPath('/users/')).toBe('/users');
  });

  it('handles empty string', () => {
    expect(normalizeUrlPath('')).toBe('');
  });

  it('handles combined transformations', () => {
    expect(normalizeUrlPath('{{host}}/api/users/{id}?q=1')).toBe('/api/users/:id');
  });
});

describe('isPathInsideCollection', () => {
  it('returns true for paths inside collection', () => {
    expect(isPathInsideCollection('/col/subfolder', '/col')).toBe(true);
  });

  it('returns true for exact collection path', () => {
    expect(isPathInsideCollection('/col', '/col')).toBe(true);
  });

  it('returns false for paths outside collection', () => {
    expect(isPathInsideCollection('/other/folder', '/col')).toBe(false);
  });

  it('returns false for path traversal', () => {
    expect(isPathInsideCollection('/col/../other', '/col')).toBe(false);
  });
});

describe('buildSpecItemsMap', () => {
  it('builds map from flat items', () => {
    const items = [
      { name: 'Get Users', request: { method: 'GET', url: '/users' } },
      { name: 'Create User', request: { method: 'POST', url: '/users' } }
    ];
    const map = buildSpecItemsMap(items);
    expect(map.size).toBe(2);
    expect(map.has('GET:/users')).toBe(true);
    expect(map.has('POST:/users')).toBe(true);
  });

  it('flattens folders', () => {
    const items = [
      {
        type: 'folder', name: 'Users', items: [
          { name: 'Get Users', request: { method: 'GET', url: '/users' } }
        ]
      }
    ];
    const map = buildSpecItemsMap(items);
    expect(map.size).toBe(1);
    const entry = map.get('GET:/users');
    expect(entry?.folderName).toBe('Users');
  });

  it('defaults method to GET', () => {
    const items = [{ name: 'Ping', request: { url: '/ping' } }];
    const map = buildSpecItemsMap(items);
    expect(map.has('GET:/ping')).toBe(true);
  });
});

describe('extractJsonKeys', () => {
  it('extracts flat keys', () => {
    expect(extractJsonKeys({ name: 'John', age: 30 })).toEqual(['name', 'age']);
  });

  it('extracts nested keys', () => {
    const keys = extractJsonKeys({ user: { name: 'John' } });
    expect(keys).toEqual(['user', 'user.name']);
  });

  it('extracts array keys', () => {
    const keys = extractJsonKeys({ items: [{ id: 1 }] });
    expect(keys).toEqual(['items', 'items[].id']);
  });
});

describe('compareRequestFields', () => {
  it('detects no diff for identical requests', () => {
    const req = { params: [], headers: [], body: { mode: 'none' }, auth: { mode: 'none' } };
    const { hasDiff, changes } = compareRequestFields(req, req);
    expect(hasDiff).toBe(false);
    expect(changes).toEqual([]);
  });

  it('detects param differences', () => {
    const spec = { params: [{ name: 'id', type: 'path' }], headers: [], body: {}, auth: {} };
    const actual = { params: [], headers: [], body: {}, auth: {} };
    const { hasDiff, changes } = compareRequestFields(spec, actual);
    expect(hasDiff).toBe(true);
    expect(changes).toContain('-1 params');
  });

  it('detects body mode change', () => {
    const spec = { params: [], headers: [], body: { mode: 'json' }, auth: {} };
    const actual = { params: [], headers: [], body: { mode: 'text' }, auth: {} };
    const { hasDiff } = compareRequestFields(spec, actual);
    expect(hasDiff).toBe(true);
  });

  it('detects auth mode change', () => {
    const spec = { params: [], headers: [], body: {}, auth: { mode: 'bearer' } };
    const actual = { params: [], headers: [], body: {}, auth: { mode: 'none' } };
    const { hasDiff, changes } = compareRequestFields(spec, actual);
    expect(hasDiff).toBe(true);
    expect(changes).toContain('auth: none');
  });

  it('detects JSON body schema difference', () => {
    const spec = { params: [], headers: [], body: { mode: 'json', json: '{"name":"","email":""}' }, auth: {} };
    const actual = { params: [], headers: [], body: { mode: 'json', json: '{"name":""}' }, auth: {} };
    const { hasDiff, changes } = compareRequestFields(spec, actual);
    expect(hasDiff).toBe(true);
    expect(changes).toContain('body schema');
  });
});

describe('mergeWithUserValues', () => {
  it('preserves user enabled state', () => {
    const spec = [{ name: 'key', value: 'val' }];
    const existing = [{ name: 'key', value: 'val', enabled: false }];
    const result = mergeWithUserValues(spec, existing);
    expect(result[0].enabled).toBe(false);
  });

  it('returns spec items when no match', () => {
    const spec = [{ name: 'newKey', value: 'val' }];
    const existing = [{ name: 'oldKey', value: 'val' }];
    const result = mergeWithUserValues(spec, existing);
    expect(result[0].name).toBe('newKey');
    expect(result[0].enabled).toBeUndefined();
  });

  it('handles empty arrays', () => {
    expect(mergeWithUserValues([], [])).toEqual([]);
    expect(mergeWithUserValues(null as any, null as any)).toEqual([]);
  });
});

describe('mergeSpecIntoRequest', () => {
  const existing = {
    name: 'Get Users',
    request: {
      url: '/old-users',
      method: 'GET',
      params: [{ name: 'page', value: '1', enabled: true }],
      headers: [],
      body: { mode: 'none' },
      auth: { mode: 'none' },
      tests: 'test("works", () => {});',
      script: { req: 'console.log("pre");', res: 'console.log("post");' },
      assertions: [{ name: 'res.status', value: 'eq 200' }],
      docs: 'User docs'
    }
  };

  const specItem = {
    request: {
      url: '/new-users',
      method: 'GET',
      params: [{ name: 'page', value: '1' }, { name: 'limit', value: '10' }],
      headers: [{ name: 'Accept', value: 'application/json' }],
      body: { mode: 'json', json: '{}' },
      auth: { mode: 'bearer', bearer: { token: '{{token}}' } }
    }
  };

  it('updates url, body, auth from spec in sync mode', () => {
    const result = mergeSpecIntoRequest(existing, specItem);
    expect(result.request.url).toBe('/new-users');
    expect(result.request.body.mode).toBe('json');
    expect(result.request.auth.mode).toBe('bearer');
  });

  it('preserves tests, scripts, assertions, docs in sync mode', () => {
    const result = mergeSpecIntoRequest(existing, specItem);
    expect(result.request.tests).toBe('test("works", () => {});');
    expect(result.request.script.req).toBe('console.log("pre");');
    expect(result.request.script.res).toBe('console.log("post");');
    expect(result.request.assertions).toEqual([{ name: 'res.status', value: 'eq 200' }]);
    expect(result.request.docs).toBe('User docs');
  });

  it('merges params preserving user enabled state', () => {
    const result = mergeSpecIntoRequest(existing, specItem);
    const pageParam = result.request.params.find((p: any) => p.name === 'page');
    expect(pageParam.enabled).toBe(true);
    expect(result.request.params.length).toBe(2);
  });

  it('overrides docs in fullReset mode', () => {
    const specWithDocs = { ...specItem, request: { ...specItem.request, docs: 'New docs' } };
    const result = mergeSpecIntoRequest(existing, specWithDocs, { fullReset: true });
    expect(result.request.docs).toBe('New docs');
  });
});

describe('isValidOpenApiSpec', () => {
  it('validates OpenAPI 3.x with paths', () => {
    expect(isValidOpenApiSpec({ openapi: '3.0.0', paths: {} })).toBe(true);
    expect(isValidOpenApiSpec({ openapi: '3.1.0', paths: { '/a': {} } })).toBe(true);
  });

  it('rejects Swagger 2.0', () => {
    expect(isValidOpenApiSpec({ swagger: '2.0', paths: {} })).toBe(false);
  });

  it('rejects invalid specs', () => {
    expect(isValidOpenApiSpec(null)).toBe(false);
    expect(isValidOpenApiSpec({})).toBe(false);
    expect(isValidOpenApiSpec({ openapi: '3.0.0' })).toBe(false);
  });
});

describe('generateSpecHash', () => {
  it('returns consistent hash for same spec', () => {
    const spec = { openapi: '3.0.0', paths: {} };
    expect(generateSpecHash(spec)).toBe(generateSpecHash(spec));
  });

  it('returns different hash for different specs', () => {
    expect(generateSpecHash({ a: 1 })).not.toBe(generateSpecHash({ a: 2 }));
  });

  it('returns null for null input', () => {
    expect(generateSpecHash(null)).toBeNull();
  });
});
