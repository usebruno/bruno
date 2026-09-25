// Mock dependencies before requiring the module
const { prepareWsRequest } = require('../../src/ipc/network/ws-event-handlers');
const { addCookieToJar } = require('../../src/utils/cookies');

describe('prepareWsRequest: API Key Query Params', () => {
  const createMockItem = (authConfig = {}) => ({
    uid: 'test-item-uid',
    request: {
      url: 'ws://localhost:3001',
      headers: [],
      body: {
        mode: 'raw',
        ws: []
      },
      auth: authConfig,
      vars: { req: [], res: [] },
      script: { req: '', res: '' }
    }
  });

  const createMockCollection = (collectionAuth = null) => ({
    uid: 'test-collection-uid',
    pathname: '/test/path',
    root: {
      request: {
        headers: [],
        auth: collectionAuth || { mode: 'none' }
      }
    },
    brunoConfig: {},
    globalEnvironmentVariables: {},
    promptVariables: {},
    items: []
  });

  describe('API Key with Query Params placement', () => {
    it('should append API key to URL when placement is queryparams', async () => {
      const item = createMockItem({
        mode: 'apikey',
        apikey: {
          key: 'apiKey',
          value: 'test-api-key-123',
          placement: 'queryparams'
        }
      });
      const collection = createMockCollection();
      const environment = { variables: [] };
      const runtimeVariables = {};

      const result = await prepareWsRequest(item, collection, environment, runtimeVariables);

      expect(result.url).toContain('apiKey=test-api-key-123');
      expect(result.url).toBe('ws://localhost:3001/?apiKey=test-api-key-123');
    });
  });

  describe('cookie jar', () => {
    it('attaches jar cookies even when the request url has no ws:// scheme yet', async () => {
      addCookieToJar('access_token=jwt-value', 'http://localhost:3001');

      const item = createMockItem();
      item.request.url = 'localhost:3001/ws';
      const collection = createMockCollection();

      const result = await prepareWsRequest(item, collection, { variables: [] }, {});

      expect(result.headers['Cookie']).toBe('access_token=jwt-value');
    });

    it('merges jar cookies with a cookie header already set on the request', async () => {
      addCookieToJar('access_token=jwt-value', 'http://localhost:3001');

      const item = createMockItem();
      item.request.url = 'localhost:3001/ws';
      item.request.headers = [{ name: 'Cookie', value: 'session=abc', enabled: true }];
      const collection = createMockCollection();

      const result = await prepareWsRequest(item, collection, { variables: [] }, {});

      expect(result.headers['Cookie']).toBe('session=abc; access_token=jwt-value');
    });
  });
});
