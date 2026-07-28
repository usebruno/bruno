const { prepareGraphQLSubscriptionRequest } = require('../../src/ipc/network/graphql-subscription-event-handlers');

describe('prepareGraphQLSubscriptionRequest', () => {
  const createMockItem = (overrides = {}) => ({
    uid: 'test-item-uid',
    request: {
      url: 'wss://localhost:3001/graphql',
      headers: [],
      auth: { mode: 'none' },
      body: {
        mode: 'graphql',
        graphql: {
          query: 'subscription OnTick { tick { count } }',
          variables: '{}'
        }
      },
      connectionParams: null,
      ...overrides
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

  it('interpolates the query and variables, parsing variables only after interpolation', async () => {
    const item = createMockItem({
      body: {
        mode: 'graphql',
        graphql: {
          query: 'subscription OnTick($count: Int) { tick(count: {{count}}) }',
          variables: '{"count": {{count}}}'
        }
      }
    });
    const collection = createMockCollection();
    const environment = { variables: [] };
    const runtimeVariables = { count: 5 };

    const result = await prepareGraphQLSubscriptionRequest(item, collection, environment, runtimeVariables);

    expect(result.data.query).toBe('subscription OnTick($count: Int) { tick(count: 5) }');
    expect(result.data.variables).toEqual({ count: 5 });
  });

  it('interpolates and parses connectionParams only after interpolation, omitting it entirely when empty', async () => {
    const item = createMockItem({
      connectionParams: '{"authToken": "{{token}}"}'
    });
    const collection = createMockCollection();
    const runtimeVariables = { token: 'secret-token' };

    const result = await prepareGraphQLSubscriptionRequest(item, collection, { variables: [] }, runtimeVariables);
    expect(result.connectionParams).toEqual({ authToken: 'secret-token' });

    const itemWithoutParams = createMockItem({ connectionParams: null });
    const resultWithout = await prepareGraphQLSubscriptionRequest(itemWithoutParams, collection, { variables: [] }, {});
    expect(resultWithout.connectionParams).toBeUndefined();
  });

  it('throws a distinct error message when variables fail to parse', async () => {
    const item = createMockItem({
      body: { mode: 'graphql', graphql: { query: 'subscription { tick }', variables: 'not-json' } }
    });
    const collection = createMockCollection();

    await expect(prepareGraphQLSubscriptionRequest(item, collection, { variables: [] }, {}))
      .rejects.toThrow(/Failed to parse GraphQL variables/);
  });

  it('throws a distinct error message when connectionParams fail to parse', async () => {
    const item = createMockItem({ connectionParams: 'not-json' });
    const collection = createMockCollection();

    await expect(prepareGraphQLSubscriptionRequest(item, collection, { variables: [] }, {}))
      .rejects.toThrow(/Failed to parse connection params/);
  });

  it('drops a sec-websocket-protocol header case-insensitively', async () => {
    const item = createMockItem({
      headers: [
        { name: 'Sec-WebSocket-Protocol', value: 'graphql-ws', enabled: true },
        { name: 'X-Custom', value: '1', enabled: true }
      ]
    });
    const collection = createMockCollection();

    const result = await prepareGraphQLSubscriptionRequest(item, collection, { variables: [] }, {});

    expect(result.headers['X-Custom']).toBe('1');
    expect(Object.keys(result.headers).some((name) => name.toLowerCase() === 'sec-websocket-protocol')).toBe(false);
  });

  it('infers the operationName from the query when not explicit', async () => {
    const item = createMockItem();
    const collection = createMockCollection();

    const result = await prepareGraphQLSubscriptionRequest(item, collection, { variables: [] }, {});

    expect(result.operationName).toBe('OnTick');
    expect(result.warning).toBeNull();
  });

  it('never throws on a malformed query — the server is the authority', async () => {
    const item = createMockItem({
      body: { mode: 'graphql', graphql: { query: 'subscription { this is not valid graphql {{{', variables: '{}' } }
    });
    const collection = createMockCollection();

    const result = await prepareGraphQLSubscriptionRequest(item, collection, { variables: [] }, {});
    expect(result.operationName).toBeUndefined();
    expect(result.data.query).toContain('this is not valid graphql');
  });

  it('surfaces a non-fatal warning when the query is not a subscription', async () => {
    const item = createMockItem({
      body: { mode: 'graphql', graphql: { query: 'query GetTicks { ticks { count } }', variables: '{}' } }
    });
    const collection = createMockCollection();

    const result = await prepareGraphQLSubscriptionRequest(item, collection, { variables: [] }, {});

    expect(result.operationName).toBe('GetTicks');
    expect(result.warning).toMatch(/not "subscription"/);
  });

  describe('API Key with Query Params placement', () => {
    it('should append API key to URL when placement is queryparams', async () => {
      const item = createMockItem({
        auth: {
          mode: 'apikey',
          apikey: {
            key: 'apiKey',
            value: 'test-api-key-123',
            placement: 'queryparams'
          }
        }
      });
      const collection = createMockCollection();

      const result = await prepareGraphQLSubscriptionRequest(item, collection, { variables: [] }, {});

      expect(result.url).toBe('wss://localhost:3001/graphql?apiKey=test-api-key-123');
    });
  });
});
