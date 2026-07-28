import reducer, {
  runGraphqlSubscriptionRequestEvent,
  graphqlSubscriptionResponseReceived
} from 'providers/ReduxStore/slices/collections';

const COLLECTION_UID = 'col-1';
const ITEM_UID = 'req-1';

const makeInitialState = () => ({
  collections: [
    {
      uid: COLLECTION_UID,
      pathname: '/coll',
      items: [
        {
          uid: ITEM_UID,
          name: 'On Tick',
          type: 'graphql-subscription-request',
          request: { url: 'wss://example.com/graphql' }
        }
      ]
    }
  ],
  collectionSortOrder: 'default',
  activeWorkspaceUid: null
});

describe('runGraphqlSubscriptionRequestEvent', () => {
  test('initializes item.response as CONNECTING and appends a collection.timeline entry', () => {
    let state = makeInitialState();
    state = reducer(state, runGraphqlSubscriptionRequestEvent({
      eventType: 'request',
      itemUid: ITEM_UID,
      collectionUid: COLLECTION_UID,
      eventData: { url: 'wss://example.com/graphql', headers: {} }
    }));

    const item = state.collections[0].items[0];
    expect(item.response.statusText).toBe('CONNECTING');
    expect(item.response.responses).toEqual([]);
    expect(state.collections[0].timeline).toHaveLength(1);
    expect(state.collections[0].timeline[0]).toEqual(
      expect.objectContaining({ type: 'request', itemUid: ITEM_UID, eventType: 'request' })
    );
  });
});

describe('graphqlSubscriptionResponseReceived', () => {
  const withConnectedItem = () => {
    let state = makeInitialState();
    state = reducer(state, runGraphqlSubscriptionRequestEvent({
      eventType: 'request',
      itemUid: ITEM_UID,
      collectionUid: COLLECTION_UID,
      eventData: { url: 'wss://example.com/graphql', headers: {} }
    }));
    return state;
  };

  test('open sets status/statusText to CONNECTED and appends an info entry', () => {
    let state = withConnectedItem();
    state = reducer(state, graphqlSubscriptionResponseReceived({
      itemUid: ITEM_UID, collectionUid: COLLECTION_UID, eventType: 'open',
      eventData: { timestamp: 1 }
    }));

    const response = state.collections[0].items[0].response;
    expect(response.status).toBe('CONNECTED');
    expect(response.statusText).toBe('CONNECTED');
    expect(response.responses).toHaveLength(1);
    expect(response.responses[0]).toMatchObject({ type: 'info' });
  });

  test('frames hides low-level protocol chatter (connection_init/ack, ping/pong)', () => {
    let state = withConnectedItem();
    state = reducer(state, graphqlSubscriptionResponseReceived({
      itemUid: ITEM_UID, collectionUid: COLLECTION_UID, eventType: 'frames',
      eventData: {
        droppedCount: 0,
        frames: [
          { seq: 1, timestamp: 10, direction: 'outgoing', type: 'connection_init', message: null, raw: '{"type":"connection_init"}' },
          { seq: 2, timestamp: 11, direction: 'incoming', type: 'connection_ack', message: { type: 'connection_ack' }, raw: '{"type":"connection_ack"}' },
          { seq: 3, timestamp: 12, direction: 'outgoing', type: 'ping', message: null, raw: '{"type":"ping"}' },
          { seq: 4, timestamp: 13, direction: 'incoming', type: 'pong', message: { type: 'pong' }, raw: '{"type":"pong"}' }
        ]
      }
    }));

    const { responses } = state.collections[0].items[0].response;
    expect(responses).toHaveLength(0);
  });

  test('frames shows only the payload of an outgoing subscribe frame', () => {
    let state = withConnectedItem();
    const raw = JSON.stringify({ id: '1', type: 'subscribe', payload: { query: 'subscription { tick }', variables: {} } });
    state = reducer(state, graphqlSubscriptionResponseReceived({
      itemUid: ITEM_UID, collectionUid: COLLECTION_UID, eventType: 'frames',
      eventData: { droppedCount: 0, frames: [{ seq: 1, timestamp: 10, direction: 'outgoing', type: 'subscribe', message: null, raw }] }
    }));

    const { responses } = state.collections[0].items[0].response;
    expect(responses).toHaveLength(1);
    expect(responses[0]).toEqual({
      type: 'outgoing',
      message: { query: 'subscription { tick }', variables: {} },
      timestamp: 10,
      seq: 0
    });
  });

  test('frames shows only the payload of an incoming next frame', () => {
    let state = withConnectedItem();
    state = reducer(state, graphqlSubscriptionResponseReceived({
      itemUid: ITEM_UID, collectionUid: COLLECTION_UID, eventType: 'frames',
      eventData: {
        droppedCount: 0,
        frames: [{
          seq: 2, timestamp: 11, direction: 'incoming', type: 'next',
          message: { id: '1', type: 'next', payload: { data: { tick: 1 } } },
          raw: '{"id":"1","type":"next","payload":{"data":{"tick":1}}}'
        }]
      }
    }));

    const { responses } = state.collections[0].items[0].response;
    expect(responses).toHaveLength(1);
    expect(responses[0]).toEqual({ type: 'incoming', message: { data: { tick: 1 } }, timestamp: 11, seq: 0 });
  });

  test('frames shows only the payload of an incoming top-level error frame', () => {
    let state = withConnectedItem();
    const errors = [{ message: 'Syntax Error' }];
    state = reducer(state, graphqlSubscriptionResponseReceived({
      itemUid: ITEM_UID, collectionUid: COLLECTION_UID, eventType: 'frames',
      eventData: {
        droppedCount: 0,
        frames: [{
          seq: 3, timestamp: 12, direction: 'incoming', type: 'error',
          message: { id: '1', type: 'error', payload: errors },
          raw: JSON.stringify({ id: '1', type: 'error', payload: errors })
        }]
      }
    }));

    const { responses } = state.collections[0].items[0].response;
    expect(responses).toHaveLength(1);
    expect(responses[0]).toEqual({ type: 'error', message: errors, timestamp: 12, seq: 0 });
  });

  test('frames surfaces an unparsable frame as raw text rather than hiding it', () => {
    let state = withConnectedItem();
    state = reducer(state, graphqlSubscriptionResponseReceived({
      itemUid: ITEM_UID, collectionUid: COLLECTION_UID, eventType: 'frames',
      eventData: {
        droppedCount: 0,
        frames: [{ seq: 1, timestamp: 10, direction: 'incoming', type: 'unparsable', message: null, raw: 'not json' }]
      }
    }));

    const { responses } = state.collections[0].items[0].response;
    expect(responses).toHaveLength(1);
    expect(responses[0]).toEqual({ type: 'error', message: 'not json', timestamp: 10, seq: 0 });
  });

  test('frames reports a dropped-frame notice when droppedCount is non-zero', () => {
    let state = withConnectedItem();
    state = reducer(state, graphqlSubscriptionResponseReceived({
      itemUid: ITEM_UID, collectionUid: COLLECTION_UID, eventType: 'frames',
      eventData: { droppedCount: 3, frames: [] }
    }));

    const { responses } = state.collections[0].items[0].response;
    expect(responses).toHaveLength(1);
    expect(responses[0].message).toMatch(/3 frame\(s\) dropped/);
  });

  test('operation-state next carrying errors does not mark the response as an error', () => {
    let state = withConnectedItem();
    state = reducer(state, graphqlSubscriptionResponseReceived({
      itemUid: ITEM_UID, collectionUid: COLLECTION_UID, eventType: 'operation-state',
      eventData: { states: [{ type: 'next', payload: { data: {}, errors: [{ message: 'partial' }] } }] }
    }));

    const response = state.collections[0].items[0].response;
    expect(response.isError).toBe(false);
  });

  test('operation-state error marks the response as an error with the GraphQLError[] preserved', () => {
    let state = withConnectedItem();
    const errors = [{ message: 'Syntax Error' }];
    state = reducer(state, graphqlSubscriptionResponseReceived({
      itemUid: ITEM_UID, collectionUid: COLLECTION_UID, eventType: 'operation-state',
      eventData: { states: [{ type: 'error', errors }] }
    }));

    const response = state.collections[0].items[0].response;
    expect(response.isError).toBe(true);
    expect(JSON.parse(response.error)).toEqual(errors);
    expect(response.statusText).toBe('ERROR');
  });

  test('operation-state complete distinguishes server vs user initiator in statusText and appends an info entry', () => {
    let state = withConnectedItem();
    state = reducer(state, graphqlSubscriptionResponseReceived({
      itemUid: ITEM_UID, collectionUid: COLLECTION_UID, eventType: 'operation-state',
      eventData: { states: [{ type: 'complete', initiator: 'server', timestamp: 1 }] }
    }));
    let response = state.collections[0].items[0].response;
    expect(response.statusText).toBe('COMPLETED');
    expect(response.responses.at(-1)).toEqual({ type: 'info', message: 'Completed', timestamp: 1, seq: 0 });

    state = reducer(state, graphqlSubscriptionResponseReceived({
      itemUid: ITEM_UID, collectionUid: COLLECTION_UID, eventType: 'operation-state',
      eventData: { states: [{ type: 'complete', initiator: 'user', timestamp: 2 }] }
    }));
    response = state.collections[0].items[0].response;
    expect(response.statusText).toBe('UNSUBSCRIBED');
    expect(response.responses.at(-1)).toEqual({ type: 'info', message: 'Unsubscribed', timestamp: 2, seq: 1 });
  });

  test('every pushed entry gets a unique, monotonically increasing seq even when timestamps collide', () => {
    // Two entries landing in the exact same millisecond (plausible for a burst of
    // `next` frames, or an info entry pushed alongside one) must still get distinct
    // seq values — WSMessagesList keys/tracks open-state per row by seq ?? timestamp.
    let state = withConnectedItem();
    state = reducer(state, graphqlSubscriptionResponseReceived({
      itemUid: ITEM_UID, collectionUid: COLLECTION_UID, eventType: 'open',
      eventData: { timestamp: 5 }
    }));
    state = reducer(state, graphqlSubscriptionResponseReceived({
      itemUid: ITEM_UID, collectionUid: COLLECTION_UID, eventType: 'frames',
      eventData: {
        droppedCount: 0,
        frames: [{
          seq: 1, timestamp: 5, direction: 'incoming', type: 'next',
          message: { id: '1', type: 'next', payload: { data: { tick: 1 } } },
          raw: '{"id":"1","type":"next","payload":{"data":{"tick":1}}}'
        }]
      }
    }));

    const { responses } = state.collections[0].items[0].response;
    expect(responses).toHaveLength(2);
    expect(responses[0].timestamp).toBe(responses[1].timestamp);
    expect(new Set(responses.map((r) => r.seq)).size).toBe(2);
  });

  test('operation-state started flips statusText back to CONNECTED after an unsubscribe', () => {
    let state = withConnectedItem();
    state = reducer(state, graphqlSubscriptionResponseReceived({
      itemUid: ITEM_UID, collectionUid: COLLECTION_UID, eventType: 'operation-state',
      eventData: { states: [{ type: 'complete', initiator: 'user' }] }
    }));
    expect(state.collections[0].items[0].response.statusText).toBe('UNSUBSCRIBED');

    // Resubscribing over the same (already-acked) connection never re-fires 'open' —
    // 'started' is the only signal that the UI can rely on to flip back to subscribed.
    state = reducer(state, graphqlSubscriptionResponseReceived({
      itemUid: ITEM_UID, collectionUid: COLLECTION_UID, eventType: 'operation-state',
      eventData: { states: [{ type: 'started' }] }
    }));
    const response = state.collections[0].items[0].response;
    expect(response.status).toBe('CONNECTED');
    expect(response.statusText).toBe('CONNECTED');
  });

  test('close with a non-1000 code marks the response as an error and describes the code', () => {
    let state = withConnectedItem();
    state = reducer(state, graphqlSubscriptionResponseReceived({
      itemUid: ITEM_UID, collectionUid: COLLECTION_UID, eventType: 'close',
      eventData: { code: 4408, reason: 'Connection Initialisation Timeout', timestamp: 1 }
    }));

    const response = state.collections[0].items[0].response;
    expect(response.status).toBe('CLOSED');
    expect(response.isError).toBe(true);
    expect(response.statusText).toBe('Connection Initialisation Timeout');
  });

  test('close with code 1000 is not treated as an error', () => {
    let state = withConnectedItem();
    state = reducer(state, graphqlSubscriptionResponseReceived({
      itemUid: ITEM_UID, collectionUid: COLLECTION_UID, eventType: 'close',
      eventData: { code: 1000, reason: '', timestamp: 1 }
    }));

    const response = state.collections[0].items[0].response;
    expect(response.isError).toBe(false);
    expect(response.statusText).toBe('CLOSED');
  });

  test('a transport-level error sets isError and appends an error entry', () => {
    let state = withConnectedItem();
    state = reducer(state, graphqlSubscriptionResponseReceived({
      itemUid: ITEM_UID, collectionUid: COLLECTION_UID, eventType: 'error',
      eventData: { error: 'ECONNRESET', timestamp: 1 }
    }));

    const response = state.collections[0].items[0].response;
    expect(response.isError).toBe(true);
    expect(response.error).toBe('ECONNRESET');
    expect(response.responses.at(-1)).toMatchObject({ type: 'error', message: 'ECONNRESET' });
  });
});
