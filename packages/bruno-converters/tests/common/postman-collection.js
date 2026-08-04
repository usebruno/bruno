export const makeCollection = (items, overrides = {}) => ({
  info: {
    _postman_id: 'test-id',
    name: 'Test Collection',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  item: items,
  ...overrides
});

export const makeRequest = (name, { method = 'GET', url = 'https://example.com', protocolProfileBehavior } = {}) => ({
  name,
  ...(protocolProfileBehavior ? { protocolProfileBehavior } : {}),
  request: {
    method,
    header: [],
    url: { raw: url, protocol: 'https', host: ['example', 'com'] }
  }
});
