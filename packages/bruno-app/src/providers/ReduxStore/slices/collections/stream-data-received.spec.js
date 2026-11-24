import reducer, { streamDataReceived } from 'providers/ReduxStore/slices/collections';

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
          name: 'stream',
          type: 'http-request',
          request: { url: 'https://example.com/stream', method: 'GET' },
          response: { data: [], dataBuffer: Buffer.alloc(0), size: 0 }
        }
      ]
    }
  ],
  collectionSortOrder: 'default',
  activeWorkspaceUid: null
});

const streamMessage = (data, seq = 1) => ({
  collectionUid: COLLECTION_UID,
  itemUid: ITEM_UID,
  seq,
  timestamp: 1000,
  data
});

describe('streamDataReceived — response size accounting', () => {
  test('counts non-SSE stream chunks (data + dataBuffer) once, from raw bytes', () => {
    let state = makeInitialState();
    const chunk = Buffer.from('data: A\n\n');
    state = reducer(state, streamDataReceived(streamMessage({ data: 'data: A\n\n', dataBuffer: chunk })));

    const { response } = state.collections[0].items[0];
    expect(response.size).toBe(chunk.length);
    expect(response.data).toHaveLength(1);
    expect(Buffer.from(response.dataBuffer).equals(chunk)).toBe(true);
  });

  test('counts SSE raw-byte emissions (dataBuffer only)', () => {
    let state = makeInitialState();
    const chunk = Buffer.from('data: A\n\n');
    state = reducer(state, streamDataReceived(streamMessage({ dataBuffer: chunk })));

    const { response } = state.collections[0].items[0];
    expect(response.size).toBe(chunk.length);
    expect(response.data).toHaveLength(0);
  });

  test('does not count SSE timeline-only messages (data only)', () => {
    let state = makeInitialState();
    state = reducer(state, streamDataReceived(streamMessage({ data: 'data: A\n' })));

    const { response } = state.collections[0].items[0];
    expect(response.size).toBe(0);
    expect(response.data).toHaveLength(1);
  });

  test('accumulates size across mixed SSE raw-byte and timeline messages without double counting', () => {
    let state = makeInitialState();
    const chunk = Buffer.from('data: A\n\ndata: B\n\n');
    state = reducer(state, streamDataReceived(streamMessage({ dataBuffer: chunk }, 1)));
    state = reducer(state, streamDataReceived(streamMessage({ data: 'data: A\n' }, 2)));
    state = reducer(state, streamDataReceived(streamMessage({ data: 'data: B\n' }, 3)));

    const { response } = state.collections[0].items[0];
    expect(response.size).toBe(chunk.length);
    expect(response.data).toHaveLength(2);
  });
});
