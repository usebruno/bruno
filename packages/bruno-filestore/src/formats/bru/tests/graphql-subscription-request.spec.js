const { parseBruRequest, stringifyBruRequest } = require('../index');

describe('bru graphql-subscription-request', () => {
  it('parses meta.type, graphql:subscription, body:graphql, connection-params and docs', () => {
    const json = {
      meta: {
        name: 'On Tick',
        type: 'graphql-subscription',
        seq: '1'
      },
      graphqlSubscription: {
        url: 'wss://api.example.com/graphql',
        auth: 'inherit'
      },
      headers: [{ name: 'X-Test', value: '1', enabled: true }],
      body: {
        graphql: {
          query: 'subscription OnTick { tick { count } }',
          variables: '{}'
        }
      },
      graphqlSubscriptionConnectionParams: '{"authToken": "{{token}}"}',
      docs: 'some docs'
    };

    const parsed = parseBruRequest(json, true);

    expect(parsed.type).toBe('graphql-subscription-request');
    expect(parsed.request.url).toBe('wss://api.example.com/graphql');
    expect(parsed.request.auth.mode).toBe('inherit');
    expect(parsed.request.headers).toEqual([{ name: 'X-Test', value: '1', enabled: true }]);
    expect(parsed.request.body).toEqual({
      mode: 'graphql',
      graphql: {
        query: 'subscription OnTick { tick { count } }',
        variables: '{}'
      }
    });
    expect(parsed.request.connectionParams).toBe('{"authToken": "{{token}}"}');
    expect(parsed.request.docs).toBe('some docs');
    // graphql-subscription-request has no script/vars/assertions/tests — they are never
    // executed for long-lived request types.
    expect(parsed.request.script).toBeUndefined();
    expect(parsed.request.vars).toBeUndefined();
    expect(parsed.request.assertions).toBeUndefined();
    expect(parsed.request.tests).toBeUndefined();
  });

  it('defaults connectionParams to null when the block is absent', () => {
    const json = {
      meta: { name: 'On Tick', type: 'graphql-subscription', seq: '1' },
      graphqlSubscription: { url: 'wss://api.example.com/graphql' }
    };

    const parsed = parseBruRequest(json, true);
    expect(parsed.request.connectionParams).toBeNull();
  });

  it('stringifies to a graphql:subscription block, reused body:graphql blocks, and connection-params', () => {
    const json = {
      type: 'graphql-subscription-request',
      name: 'On Tick',
      seq: 1,
      tags: [],
      request: {
        url: 'wss://api.example.com/graphql',
        headers: [{ name: 'X-Test', value: '1', enabled: true }],
        auth: { mode: 'inherit' },
        body: {
          mode: 'graphql',
          graphql: {
            query: 'subscription OnTick { tick { count } }',
            variables: '{}'
          }
        },
        connectionParams: '{"authToken": "{{token}}"}',
        docs: 'some docs'
      },
      settings: { timeout: 0, keepAliveInterval: 0 }
    };

    const bru = stringifyBruRequest(json);

    expect(bru).toContain('type: graphql-subscription');
    expect(bru).toContain('graphql:subscription {');
    expect(bru).toContain('url: wss://api.example.com/graphql');
    expect(bru).toContain('auth: inherit');
    expect(bru).toContain('graphql:subscription:connection-params {');
    expect(bru).toContain('body:graphql {');
    expect(bru).toContain('body:graphql:vars {');

    const reparsed = parseBruRequest(bru);
    expect(reparsed.type).toBe('graphql-subscription-request');
    expect(reparsed.request.url).toBe('wss://api.example.com/graphql');
    expect(reparsed.request.connectionParams).toBe('{"authToken": "{{token}}"}');
    expect(reparsed.request.body).toEqual(json.request.body);
    expect(reparsed.request.docs).toBe('some docs');
  });

  it('omits the connection-params block when unset', () => {
    const json = {
      type: 'graphql-subscription-request',
      name: 'On Tick',
      request: {
        url: 'wss://api.example.com/graphql',
        headers: [],
        auth: { mode: 'none' },
        body: { mode: 'graphql', graphql: { query: 'subscription { tick }' } },
        connectionParams: null,
        docs: ''
      }
    };

    const bru = stringifyBruRequest(json);
    expect(bru).not.toContain('graphql:subscription:connection-params');

    const reparsed = parseBruRequest(bru);
    expect(reparsed.request.connectionParams).toBeNull();
  });
});
