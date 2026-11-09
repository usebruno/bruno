const fs = require('fs');
const os = require('os');
const path = require('path');
const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { openApiToBruno } = require('@usebruno/converters');
const { parseFolder, stringifyCollection } = require('@usebruno/filestore');
const { _test: { specConversionOptions, mergeSpecIntoRequest, ensureTagFolder } } = require('../../src/ipc/openapi-sync');

describe('specConversionOptions', () => {
  const spec = {
    openapi: '3.0.3',
    info: { title: 'Orders', version: '1.0' },
    servers: [{ url: 'https://example.com' }],
    security: [{ bearerAuth: [] }],
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } } },
    paths: { '/orders': { get: { security: [{ bearerAuth: [] }], responses: { 200: { description: 'OK' } } } } }
  };
  const syncedAuthMode = (syncConfig) => openApiToBruno(spec, specConversionOptions({ openapi: [{ sourceUrl: '../openapi.yaml', ...syncConfig }] })).items[0].request.auth.mode;

  it('reads groupBy and authPlacement from the sync config', () => {
    const brunoConfig = { openapi: [{ sourceUrl: '../openapi.yaml', groupBy: 'path', authPlacement: 'collection' }] };

    expect(specConversionOptions(brunoConfig)).toMatchObject({ groupBy: 'path', authPlacement: 'collection' });
  });

  it('syncs with the auth on the collection when authPlacement is collection', () => {
    expect(syncedAuthMode({ authPlacement: 'collection' })).toBe('inherit');
  });

  it.each([undefined, 'request', 'Collection', true])('syncs with the auth on each request when authPlacement is %p', (authPlacement) => {
    expect(syncedAuthMode({ authPlacement })).toBe('bearer');
  });

  it('falls back to tags when the sync config has no groupBy', () => {
    [undefined, null, {}, { openapi: [] }].forEach((brunoConfig) => {
      expect(specConversionOptions(brunoConfig).groupBy).toBe('tags');
    });
  });
});

describe('specConversionOptions for a collection on disk', () => {
  let collectionPath;

  beforeEach(() => {
    collectionPath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-openapi-sync-'));
  });

  afterEach(() => {
    fs.rmSync(collectionPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  const writeCollection = (format, authPlacement) => {
    const brunoConfig = { version: '1', name: 'Auth Flip', type: 'collection', openapi: [{ sourceUrl: '../openapi.yaml', groupBy: 'tags', authPlacement }] };
    const root = { request: { auth: { mode: 'bearer', bearer: { token: 'my-secret-token' } } } };
    if (format === 'yml') {
      fs.writeFileSync(path.join(collectionPath, 'opencollection.yml'), stringifyCollection(root, { ...brunoConfig, opencollection: '1.0.0' }, { format }));
    } else {
      fs.writeFileSync(path.join(collectionPath, 'bruno.json'), JSON.stringify(brunoConfig));
      fs.writeFileSync(path.join(collectionPath, 'collection.bru'), stringifyCollection(root, brunoConfig, { format }));
    }
    return brunoConfig;
  };

  const operation = (security) => ({ get: { ...(security && { security }), responses: { 200: { description: 'OK' } } } });
  const spec = {
    openapi: '3.0.3',
    info: { title: 'Auth Flip', version: '2' },
    servers: [{ url: 'https://example.com' }],
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' }, apiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
    paths: { '/a': operation([{ bearerAuth: [] }]), '/b': operation([{ bearerAuth: [] }]), '/public': operation(), '/c': operation([{ apiKeyAuth: [] }]) }
  };

  it.each(['bru', 'yml'])('keeps requests on the collection scheme when the spec adds an operation with another scheme (%s)', (format) => {
    const brunoConfig = writeCollection(format, 'collection');
    const items = openApiToBruno(spec, specConversionOptions(brunoConfig, collectionPath)).items;

    expect(Object.fromEntries(items.map((item) => [item.request.url, item.request.auth.mode]))).toEqual({
      '{{baseUrl}}/a': 'inherit',
      '{{baseUrl}}/b': 'inherit',
      '{{baseUrl}}/public': 'none',
      '{{baseUrl}}/c': 'apikey'
    });
  });

  it('reads no collection auth when authPlacement is request', () => {
    expect(specConversionOptions(writeCollection('yml', 'request'), collectionPath)).not.toHaveProperty('collectionAuth');
  });
});

describe('syncing with collection auth placement', () => {
  const spec = {
    openapi: '3.0.3',
    info: { title: 'Orders', version: '1.0' },
    servers: [{ url: 'https://example.com' }],
    security: [{ bearerAuth: [] }],
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' }, basicAuth: { type: 'http', scheme: 'basic' } } },
    paths: {
      '/orders': { get: { security: [{ bearerAuth: [] }], responses: { 200: { description: 'OK' } } } },
      '/admin': { get: { security: [{ basicAuth: [] }], responses: { 200: { description: 'OK' } } } }
    }
  };
  const brunoConfig = { openapi: [{ sourceUrl: '../openapi.yaml', groupBy: 'tags', authPlacement: 'collection' }] };
  const specItems = openApiToBruno(spec, specConversionOptions(brunoConfig)).items;
  const specItemAt = (url) => specItems.find((item) => item.request.url === `{{baseUrl}}${url}`);
  const withAuth = (item, auth) => ({ ...item, request: { ...item.request, auth } });

  it('keeps an inheriting request on inherit', () => {
    const orders = specItemAt('/orders');

    expect(mergeSpecIntoRequest(withAuth(orders, { mode: 'inherit' }), orders).request.auth.mode).toBe('inherit');
  });

  it('moves a request that holds its own copy of the collection scheme to inherit', () => {
    const orders = specItemAt('/orders');
    const ownCopy = withAuth(orders, { mode: 'bearer', bearer: { token: '{{token}}' } });

    expect(mergeSpecIntoRequest(ownCopy, orders).request.auth.mode).toBe('inherit');
  });

  it('keeps the user credentials on an operation that uses a different scheme', () => {
    const admin = specItemAt('/admin');
    const configured = withAuth(admin, { mode: 'basic', basic: { username: 'root', password: '{{adminPassword}}' } });

    expect(mergeSpecIntoRequest(configured, admin).request.auth).toMatchObject({ mode: 'basic', basic: { username: 'root', password: '{{adminPassword}}' } });
  });
});

describe('ensureTagFolder', () => {
  let collectionPath;

  beforeEach(() => {
    collectionPath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-openapi-sync-'));
  });

  afterEach(() => {
    fs.rmSync(collectionPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  it.each(['yml', 'bru'])('creates a %s tag folder that lets its requests inherit the collection auth', async (format) => {
    const folderPath = await ensureTagFolder(collectionPath, 'billing', format);
    const folderRoot = parseFolder(fs.readFileSync(path.join(folderPath, `folder.${format}`), 'utf8'), { format });

    expect(folderRoot.meta.name).toBe('billing');
    expect(folderRoot.request.auth.mode).toBe('inherit');
  });
});
