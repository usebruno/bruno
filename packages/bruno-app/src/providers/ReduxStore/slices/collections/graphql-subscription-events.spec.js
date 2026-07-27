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

  test('frames are appended to responses tagged by direction, preserving seq', () => {
    let state = withConnectedItem();
    state = reducer(state, graphqlSubscriptionResponseReceived({
      itemUid: ITEM_UID, collectionUid: COLLECTION_UID, eventType: 'frames',
      eventData: {
        droppedCount: 0,
        frames: [
          { seq: 1, timestamp: 10, direction: 'outgoing', type: 'connection_init', message: null, raw: '{"type":"connection_init"}' },
          { seq: 2, timestamp: 11, direction: 'incoming', type: 'connection_ack', message: { type: 'connection_ack' }, raw: '{"type":"connection_ack"}' }
        ]
      }
    }));

    const { responses } = state.collections[0].items[0].response;
    expect(responses).toHaveLength(2);
    expect(responses[0]).toMatchObject({ type: 'outgoing', seq: 1 });
    expect(responses[1]).toMatchObject({ type: 'incoming', seq: 2, message: { type: 'connection_ack' } });
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

  test('operation-state complete distinguishes server vs user initiator in statusText', () => {
    let state = withConnectedItem();
    state = reducer(state, graphqlSubscriptionResponseReceived({
      itemUid: ITEM_UID, collectionUid: COLLECTION_UID, eventType: 'operation-state',
      eventData: { states: [{ type: 'complete', initiator: 'server' }] }
    }));
    expect(state.collections[0].items[0].response.statusText).toBe('COMPLETED');

    state = reducer(state, graphqlSubscriptionResponseReceived({
      itemUid: ITEM_UID, collectionUid: COLLECTION_UID, eventType: 'operation-state',
      eventData: { states: [{ type: 'complete', initiator: 'user' }] }
    }));
    expect(state.collections[0].items[0].response.statusText).toBe('UNSUBSCRIBED');
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
