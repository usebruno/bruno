import { describe, it, expect } from '@jest/globals';
import openApiToBruno from '../../src/openapi/openapi-to-bruno';

const securitySchemes = {
  bearerAuth: { type: 'http', scheme: 'bearer' },
  basicAuth: { type: 'http', scheme: 'basic' },
  apiKeyHeader: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
  apiKeyQuery: { type: 'apiKey', in: 'query', name: 'api_key' },
  oauth: {
    type: 'oauth2',
    flows: { clientCredentials: { tokenUrl: 'https://auth.example.com/token', scopes: { read: 'Read', write: 'Write' } } }
  }
};

const buildPaths = (paths) => Object.fromEntries(Object.entries(paths).map(([path, operationSecurity]) => [
  path,
  { get: { ...(operationSecurity !== undefined && { security: operationSecurity }), responses: { 200: { description: 'OK' } } } }
]));

const buildSpec = ({ security, paths }) => ({
  openapi: '3.0.3',
  info: { title: 'Auth API', version: '1.0' },
  servers: [{ url: 'https://example.com' }],
  ...(security !== undefined && { security }),
  components: { securitySchemes },
  paths: buildPaths(paths)
});

const flattenItems = (items) => items.flatMap((item) => (item.type === 'folder' ? flattenItems(item.items) : [item]));
const foldersIn = (items) => items.flatMap((item) => (item.type === 'folder' ? [item, ...foldersIn(item.items)] : []));
const requestsOf = (collection) => flattenItems(collection.items);
const requestAt = (collection, path) => requestsOf(collection).find((item) => item.request.url === `{{baseUrl}}${path}`).request;
const authModes = (collection) => Object.fromEntries(requestsOf(collection).map((item) => [item.request.url.replace('{{baseUrl}}', ''), item.request.auth.mode]));
const placed = (spec, options = {}) => openApiToBruno(spec, { ...options, authPlacement: 'collection' });

describe('openapi-to-bruno collection auth placement', () => {
  const mixedSpec = buildSpec({
    security: [{ bearerAuth: [] }],
    paths: {
      '/declared': [{ bearerAuth: [] }],
      '/global': undefined,
      '/basic': [{ basicAuth: [] }],
      '/public': []
    }
  });

  it.each(['request', undefined, 'Collection', true])('leaves the output unchanged when authPlacement is %p', (authPlacement) => {
    const collection = openApiToBruno(mixedSpec, { authPlacement });

    expect(collection).toEqual(openApiToBruno(mixedSpec));
    expect(authModes(collection)).toEqual({ '/declared': 'bearer', '/global': 'inherit', '/basic': 'basic', '/public': 'none' });
  });

  it('puts the global scheme on the collection and lets operations with that scheme inherit it', () => {
    const collection = placed(mixedSpec);

    expect(collection.root.request.auth).toMatchObject({ mode: 'bearer', bearer: { token: '{{token}}' } });
    expect(authModes(collection)).toEqual({ '/declared': 'inherit', '/global': 'inherit', '/basic': 'basic', '/public': 'none' });
    expect(requestAt(collection, '/basic').auth.basic).toEqual({ username: '{{username}}', password: '{{password}}' });
  });

  it('promotes the scheme every secured operation shares when the spec has no global security', () => {
    const spec = buildSpec({
      paths: {
        '/orders': [{ apiKeyHeader: [] }],
        '/invoices': [{ apiKeyHeader: [] }, { bearerAuth: [] }],
        '/health': undefined,
        '/status': [],
        '/catalog': [{}],
        '/products': [{}, { apiKeyHeader: [] }]
      }
    });
    const collection = placed(spec);

    expect(collection.root.request.auth).toMatchObject({ mode: 'apikey', apikey: { key: 'X-API-Key', value: '{{apiKey}}', placement: 'header' } });
    expect(authModes(collection)).toEqual({
      '/orders': 'inherit',
      '/invoices': 'inherit',
      '/health': 'none',
      '/status': 'none',
      '/catalog': 'none',
      '/products': 'inherit'
    });
  });

  it('keeps explicit auth and promotes nothing when secured operations use different schemes', () => {
    const spec = buildSpec({ paths: { '/orders': [{ bearerAuth: [] }], '/reports': [{ basicAuth: [] }], '/health': undefined } });
    const collection = placed(spec);

    expect(collection.root.request.auth.mode).toBe('none');
    expect(authModes(collection)).toEqual({ '/orders': 'bearer', '/reports': 'basic', '/health': 'inherit' });
  });

  it('adds no api key header or query param to operations that inherit the collection scheme', () => {
    const spec = buildSpec({ security: [{ apiKeyHeader: [] }], paths: { '/orders': [{ apiKeyHeader: [] }], '/search': [{ apiKeyQuery: [] }] } });
    const collection = placed(spec);

    expect(requestAt(collection, '/orders').auth.mode).toBe('inherit');
    expect(requestAt(collection, '/orders').headers).toEqual([]);
    expect(requestAt(collection, '/search').auth).toMatchObject({ mode: 'apikey', apikey: { key: 'api_key', placement: 'queryparams' } });
    expect(requestAt(collection, '/search').params.map((param) => param.name)).toEqual(['api_key']);
  });

  it('uses the first global scheme that is defined and ignores references to undefined schemes', () => {
    const withFallback = placed(buildSpec({ security: [{ missing: [] }, { bearerAuth: [] }], paths: { '/orders': [{ bearerAuth: [] }] } }));
    expect(withFallback.root.request.auth.mode).toBe('bearer');
    expect(authModes(withFallback)).toEqual({ '/orders': 'inherit' });

    const undefinedOnly = placed(buildSpec({ paths: { '/orders': [{ missing: [] }], '/items': [{ constructor: [] }] } }));
    expect(undefinedOnly.root.request.auth.mode).toBe('none');
    expect(authModes(undefinedOnly)).toEqual({ '/orders': 'inherit', '/items': 'inherit' });
  });

  it('never gives a scheme named "undefined" to operations that name no scheme', () => {
    const spec = {
      ...buildSpec({ paths: { '/public': [], '/plain': undefined, '/anonymous': [{}] } }),
      components: { securitySchemes: { undefined: { type: 'http', scheme: 'bearer' } } }
    };

    expect(authModes(openApiToBruno(spec))).toEqual({ '/public': 'none', '/plain': 'inherit', '/anonymous': 'none' });
    expect(authModes(placed(spec))).toEqual({ '/public': 'none', '/plain': 'inherit', '/anonymous': 'none' });
  });

  it('gives no auth only to operations whose every requirement allows anonymous access', () => {
    const spec = buildSpec({
      security: [{ bearerAuth: [] }],
      paths: { '/catalog': [{}], '/featured': [{}, {}], '/products': [{}, { bearerAuth: [] }], '/orders': [{ bearerAuth: [] }, {}] }
    });

    expect(authModes(openApiToBruno(spec))).toEqual({ '/catalog': 'none', '/featured': 'none', '/products': 'inherit', '/orders': 'bearer' });
    expect(authModes(placed(spec))).toEqual({ '/catalog': 'none', '/featured': 'none', '/products': 'inherit', '/orders': 'inherit' });
  });

  it('treats only an empty list or empty requirements as needing no auth', () => {
    const spec = buildSpec({
      security: [{ bearerAuth: [] }],
      paths: { '/null': [null], '/string': ['bearerAuth'], '/nested': [[]], '/proto': JSON.parse('[{ "__proto__": [] }]') }
    });
    const expected = { '/null': 'inherit', '/string': 'inherit', '/nested': 'inherit', '/proto': 'inherit' };

    expect(authModes(openApiToBruno(spec))).toEqual(expected);
    expect(authModes(placed(spec))).toEqual(expected);
  });

  it('keeps the first scheme of a requirement that also names __proto__', () => {
    const spec = buildSpec({ paths: { '/orders': JSON.parse('[{ "apiKeyHeader": [], "__proto__": [] }]') } });

    expect(requestAt(openApiToBruno(spec), '/orders').auth.mode).toBe('apikey');
    expect(requestAt(placed(spec), '/orders').auth.mode).toBe('inherit');
  });

  it('lets an oauth2 operation inherit the collection scheme whatever scopes it requests', () => {
    const collection = placed(buildSpec({ security: [{ oauth: ['read', 'write'] }], paths: { '/orders': [{ oauth: ['read'] }] } }));

    expect(collection.root.request.auth).toMatchObject({ mode: 'oauth2', oauth2: { grantType: 'client_credentials', scope: 'read write' } });
    expect(authModes(collection)).toEqual({ '/orders': 'inherit' });
  });

  it('applies to folders and requests when grouping by path', () => {
    const spec = buildSpec({ security: [{ bearerAuth: [] }], paths: { '/orders/{id}': [{ bearerAuth: [] }], '/orders/{id}/items': [] } });
    const collection = placed(spec, { groupBy: 'path' });

    const folders = foldersIn(collection.items);
    expect(folders.length).toBeGreaterThan(0);
    expect(folders.map((folder) => folder.root.request.auth.mode)).toEqual(folders.map(() => 'inherit'));
    expect(authModes(collection)).toEqual({ '/orders/:id': 'inherit', '/orders/:id/items': 'none' });
  });
});

describe('openapi-to-bruno collection auth placement for Swagger 2.0 specs', () => {
  const securityDefinitions = {
    basicAuth: { type: 'basic' },
    apiKeyHeader: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
    apiKeyQuery: { type: 'apiKey', in: 'query', name: 'api_key' },
    oauth: { type: 'oauth2', flow: 'application', tokenUrl: 'https://auth.example.com/token', scopes: { read: 'Read', write: 'Write' } }
  };

  const buildSwaggerSpec = ({ security, paths, definitions = securityDefinitions }) => ({
    swagger: '2.0',
    info: { title: 'Auth API', version: '1.0' },
    host: 'example.com',
    ...(security !== undefined && { security }),
    securityDefinitions: definitions,
    paths: buildPaths(paths)
  });

  const mixedSpec = buildSwaggerSpec({
    security: [{ apiKeyHeader: [] }],
    paths: {
      '/declared': [{ apiKeyHeader: [] }],
      '/global': undefined,
      '/basic': [{ basicAuth: [] }],
      '/public': []
    }
  });

  it.each(['request', undefined, 'Collection', true])('leaves the output unchanged when authPlacement is %p', (authPlacement) => {
    const collection = openApiToBruno(mixedSpec, { authPlacement });

    expect(collection).toEqual(openApiToBruno(mixedSpec));
    expect(authModes(collection)).toEqual({ '/declared': 'apikey', '/global': 'inherit', '/basic': 'basic', '/public': 'none' });
  });

  it('puts the global scheme on the collection and lets operations with that scheme inherit it', () => {
    const collection = placed(mixedSpec);

    expect(collection.root.request.auth).toMatchObject({ mode: 'apikey', apikey: { key: 'X-API-Key', value: '{{apiKey}}', placement: 'header' } });
    expect(authModes(collection)).toEqual({ '/declared': 'inherit', '/global': 'inherit', '/basic': 'basic', '/public': 'none' });
    expect(requestAt(collection, '/declared').headers).toEqual([]);
    expect(requestAt(collection, '/basic').auth.basic).toEqual({ username: '{{username}}', password: '{{password}}' });
  });

  it('promotes the scheme every secured operation shares when the spec has no global security', () => {
    const collection = placed(buildSwaggerSpec({
      paths: {
        '/orders': [{ basicAuth: [] }],
        '/invoices': [{ basicAuth: [] }, { apiKeyHeader: [] }],
        '/health': undefined,
        '/status': [],
        '/catalog': [{}],
        '/products': [{}, { basicAuth: [] }]
      }
    }));

    expect(collection.root.request.auth.mode).toBe('basic');
    expect(authModes(collection)).toEqual({
      '/orders': 'inherit',
      '/invoices': 'inherit',
      '/health': 'none',
      '/status': 'none',
      '/catalog': 'none',
      '/products': 'inherit'
    });
  });

  it('keeps explicit auth and promotes nothing when secured operations use different schemes', () => {
    const collection = placed(buildSwaggerSpec({ paths: { '/orders': [{ basicAuth: [] }], '/search': [{ apiKeyQuery: [] }], '/health': undefined } }));

    expect(collection.root.request.auth.mode).toBe('none');
    expect(authModes(collection)).toEqual({ '/orders': 'basic', '/search': 'apikey', '/health': 'inherit' });
    expect(requestAt(collection, '/search').params.map((param) => param.name)).toEqual(['api_key']);
  });

  it('adds no api key query param to operations that inherit the collection scheme', () => {
    const collection = placed(buildSwaggerSpec({ security: [{ apiKeyQuery: [] }], paths: { '/search': [{ apiKeyQuery: [] }] } }));

    expect(collection.root.request.auth).toMatchObject({ mode: 'apikey', apikey: { key: 'api_key', placement: 'queryparams' } });
    expect(requestAt(collection, '/search').auth.mode).toBe('inherit');
    expect(requestAt(collection, '/search').params).toEqual([]);
  });

  it('uses the first global scheme that is defined and ignores references to undefined schemes', () => {
    const withFallback = placed(buildSwaggerSpec({ security: [{ missing: [] }, { basicAuth: [] }], paths: { '/orders': [{ basicAuth: [] }] } }));
    expect(withFallback.root.request.auth.mode).toBe('basic');
    expect(authModes(withFallback)).toEqual({ '/orders': 'inherit' });

    const undefinedOnly = placed(buildSwaggerSpec({ paths: { '/orders': [{ missing: [] }], '/items': [{ toString: [] }] } }));
    expect(undefinedOnly.root.request.auth.mode).toBe('none');
    expect(authModes(undefinedOnly)).toEqual({ '/orders': 'inherit', '/items': 'inherit' });
  });

  it('never gives a definition named "undefined" to operations that name no scheme', () => {
    const spec = buildSwaggerSpec({ paths: { '/plain': undefined, '/anonymous': [{}] }, definitions: { undefined: { type: 'basic' } } });

    expect(authModes(openApiToBruno(spec))).toEqual({ '/plain': 'inherit', '/anonymous': 'none' });
    expect(authModes(placed(spec))).toEqual({ '/plain': 'inherit', '/anonymous': 'none' });
  });

  it('gives no auth only to operations whose every requirement allows anonymous access', () => {
    const spec = buildSwaggerSpec({
      security: [{ basicAuth: [] }],
      paths: { '/catalog': [{}], '/featured': [{}, {}], '/products': [{}, { basicAuth: [] }], '/orders': [{ basicAuth: [] }, {}] }
    });

    expect(authModes(openApiToBruno(spec))).toEqual({ '/catalog': 'none', '/featured': 'none', '/products': 'inherit', '/orders': 'basic' });
    expect(authModes(placed(spec))).toEqual({ '/catalog': 'none', '/featured': 'none', '/products': 'inherit', '/orders': 'inherit' });
  });

  it('treats only an empty list or empty requirements as needing no auth', () => {
    const spec = buildSwaggerSpec({
      security: [{ basicAuth: [] }],
      paths: { '/null': [null], '/string': ['basicAuth'], '/nested': [[]], '/proto': JSON.parse('[{ "__proto__": [] }]') }
    });
    const expected = { '/null': 'inherit', '/string': 'inherit', '/nested': 'inherit', '/proto': 'inherit' };

    expect(authModes(openApiToBruno(spec))).toEqual(expected);
    expect(authModes(placed(spec))).toEqual(expected);
  });

  it('lets an oauth2 operation inherit the collection scheme whatever scopes it requests', () => {
    const collection = placed(buildSwaggerSpec({ security: [{ oauth: ['read', 'write'] }], paths: { '/orders': [{ oauth: ['read'] }] } }));

    expect(collection.root.request.auth).toMatchObject({ mode: 'oauth2', oauth2: { grantType: 'client_credentials', scope: 'read write' } });
    expect(authModes(collection)).toEqual({ '/orders': 'inherit' });
  });

  it('applies to folders and requests when grouping by path', () => {
    const collection = placed(buildSwaggerSpec({ security: [{ basicAuth: [] }], paths: { '/orders/{id}': [{ basicAuth: [] }], '/orders/{id}/items': [] } }), { groupBy: 'path' });

    const folders = foldersIn(collection.items);
    expect(folders.length).toBeGreaterThan(0);
    expect(folders.map((folder) => folder.root.request.auth.mode)).toEqual(folders.map(() => 'inherit'));
    expect(authModes(collection)).toEqual({ '/orders/:id': 'inherit', '/orders/:id/items': 'none' });
  });
});
