const {
  DEFAULT_GATEWAY_PORT,
  sanitizeCollectionNameForSlug,
  allocateCollectionSlug,
  stripCollectionPrefix,
  buildBaseUrl
} = require('../src/app/mock-server-routing');

describe('mock-server routing', () => {
  it('builds slug from collection name', () => {
    expect(sanitizeCollectionNameForSlug('My Dog API')).toBe('my-dog-api');
  });

  it('allocates unique slug on collision', () => {
    const slugToCollectionUid = new Map([
      ['my-api', 'existing-uid']
    ]);

    const slug = allocateCollectionSlug('My API', 'new-collection-uid', slugToCollectionUid);
    expect(slug.startsWith('my-api-')).toBe(true);
  });

  it('strips shared gateway collection prefix from request path', () => {
    expect(stripCollectionPrefix('/my-api/breeds', 'my-api')).toBe('/breeds');
    expect(stripCollectionPrefix('/my-api', 'my-api')).toBe('/');
  });

  it('builds base URLs for isolated and shared modes', () => {
    expect(buildBaseUrl({ mode: 'isolated', port: 4001, slug: null })).toBe('http://localhost:4001');
    expect(buildBaseUrl({ mode: 'shared', port: DEFAULT_GATEWAY_PORT, slug: 'my-api' })).toBe(`http://localhost:${DEFAULT_GATEWAY_PORT}/my-api`);
  });
});
