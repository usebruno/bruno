// Mock dependencies before requiring the module
const { prepareWsRequest } = require('../../src/ipc/network/ws-event-handlers');

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
});
