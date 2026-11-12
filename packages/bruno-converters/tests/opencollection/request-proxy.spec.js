import { fromOpenCollectionHttpItem, toOpenCollectionHttpItem } from '../../src/opencollection/items/http';
import { fromOpenCollectionGraphqlItem, toOpenCollectionGraphqlItem } from '../../src/opencollection/items/graphql';

describe.each([
  ['http-request', fromOpenCollectionHttpItem, toOpenCollectionHttpItem],
  ['graphql-request', fromOpenCollectionGraphqlItem, toOpenCollectionGraphqlItem]
])('%s proxy settings', (type, fromOpenCollection, toOpenCollection) => {
  const request = (useProxy) => ({
    name: 'Proxy request', type, seq: 1,
    settings: typeof useProxy === 'boolean' ? { useProxy } : {},
    request: {
      url: 'https://example.com', method: 'POST', headers: [], params: [],
      auth: { mode: 'none' },
      body: { mode: type === 'graphql-request' ? 'graphql' : 'none', graphql: { query: '{ hello }', variables: '' } }
    }
  });

  it.each([true, false])('preserves useProxy=%s through export and import', (useProxy) => {
    const exported = toOpenCollection(request(useProxy));
    expect(exported.settings.useProxy).toBe(useProxy);
    expect(fromOpenCollection(exported).settings.useProxy).toBe(useProxy);
  });

  it('does not invent a setting for legacy requests', () => {
    const exported = toOpenCollection(request());
    expect(exported.settings).not.toHaveProperty('useProxy');
    expect(fromOpenCollection(exported).settings).not.toHaveProperty('useProxy');
  });
});
