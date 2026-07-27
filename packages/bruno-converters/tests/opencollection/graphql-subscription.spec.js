import { describe, it, expect } from '@jest/globals';
import { brunoToOpenCollection } from '../../src/opencollection/bruno-to-opencollection';
import { openCollectionToBruno } from '../../src/opencollection/opencollection-to-bruno';

const brunoSubscriptionItem = {
  uid: 'sub-1',
  type: 'graphql-subscription-request',
  name: 'On Tick',
  seq: 1,
  request: {
    url: 'wss://api.example.com/graphql',
    headers: [{ uid: 'h1', name: 'X-Test', value: '1', enabled: true }],
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
  settings: {
    timeout: 15,
    keepAliveInterval: 30
  }
};

describe('brunoToOpenCollection / openCollectionToBruno: graphql-subscription-request', () => {
  it('round-trips a graphql-subscription-request item through OpenCollection', () => {
    const oc = brunoToOpenCollection({ name: 'API', brunoConfig: {}, items: [brunoSubscriptionItem] });

    const ocItem = oc.items[0];
    expect(ocItem.info).toMatchObject({ name: 'On Tick', type: 'graphql-subscription' });
    expect(ocItem.graphqlSubscription).toMatchObject({
      url: 'wss://api.example.com/graphql',
      auth: 'inherit',
      connectionParams: '{"authToken": "{{token}}"}',
      body: {
        query: 'subscription OnTick { tick { count } }',
        variables: '{}'
      }
    });

    const back = openCollectionToBruno(oc);
    const item = back.items[0];

    expect(item.type).toBe('graphql-subscription-request');
    expect(item.request.url).toBe('wss://api.example.com/graphql');
    expect(item.request.connectionParams).toBe('{"authToken": "{{token}}"}');
    expect(item.request.body).toEqual({
      mode: 'graphql',
      graphql: {
        query: 'subscription OnTick { tick { count } }',
        variables: '{}'
      }
    });
    expect(item.settings).toMatchObject({ timeout: 15, keepAliveInterval: 30 });
  });
});
