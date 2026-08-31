import reducer, { moveResponseExample } from 'providers/ReduxStore/slices/collections';

const COLLECTION_UID = 'col-1';
const ITEM_UID = 'req-1';

const makeExample = (uid, name) => ({
  uid,
  itemUid: ITEM_UID,
  name,
  type: 'http-request',
  request: { url: 'https://example.com', method: 'GET', headers: [], params: [], body: { mode: 'none' } },
  response: { status: 200, statusText: 'OK', headers: [], body: null }
});

// Three saved examples, no unsaved draft — the common case when a user drags in the sidebar.
const makeState = ({ examples, draft = null } = {}) => ({
  collections: [
    {
      uid: COLLECTION_UID,
      pathname: '/coll',
      items: [
        {
          uid: ITEM_UID,
          name: 'Flights',
          type: 'http-request',
          pathname: '/coll/flights.bru',
          request: { url: 'https://example.com', method: 'GET', headers: [], params: [] },
          examples: examples ?? [makeExample('ex-1', 'First'), makeExample('ex-2', 'Second'), makeExample('ex-3', 'Third')],
          draft
        }
      ]
    }
  ]
});

const exampleNames = (state) => (state.collections[0].items[0].draft?.examples || []).map((e) => e.name);
const item = (state) => state.collections[0].items[0];

const move = (state, draggedExampleUid, targetExampleUid, dropType) =>
  reducer(
    state,
    moveResponseExample({
      itemUid: ITEM_UID,
      collectionUid: COLLECTION_UID,
      draggedExampleUid,
      targetExampleUid,
      dropType
    })
  );

describe('moveResponseExample', () => {
  it('moves an example above its target', () => {
    const state = move(makeState(), 'ex-3', 'ex-1', 'above');

    expect(exampleNames(state)).toEqual(['Third', 'First', 'Second']);
  });

  it('moves an example below its target', () => {
    const state = move(makeState(), 'ex-1', 'ex-3', 'below');

    expect(exampleNames(state)).toEqual(['Second', 'Third', 'First']);
  });

  it('inserts before the target when dragging an earlier example downwards', () => {
    // Guards the off-by-one: the dragged example is removed before the target index is
    // resolved, so 'above ex-3' must land at index 1 and not index 2.
    const state = move(makeState(), 'ex-1', 'ex-3', 'above');

    expect(exampleNames(state)).toEqual(['Second', 'First', 'Third']);
  });

  it('inserts after the target when dragging a later example upwards', () => {
    const state = move(makeState(), 'ex-3', 'ex-1', 'below');

    expect(exampleNames(state)).toEqual(['First', 'Third', 'Second']);
  });

  it('seeds the draft from the saved examples so unsaved reorders never lose an example', () => {
    const state = move(makeState(), 'ex-2', 'ex-1', 'above');

    expect(item(state).draft.examples).toHaveLength(3);
    expect(item(state).examples.map((e) => e.name)).toEqual(['First', 'Second', 'Third']);
  });

  it('reorders within an existing draft without discarding other unsaved edits', () => {
    const draftExamples = [makeExample('ex-1', 'First'), makeExample('ex-2', 'Second'), makeExample('ex-3', 'Third')];
    const draft = {
      uid: ITEM_UID,
      name: 'Flights',
      type: 'http-request',
      request: { url: 'https://changed.example.com', method: 'POST', headers: [], params: [] },
      examples: draftExamples
    };

    const state = move(makeState({ draft }), 'ex-3', 'ex-1', 'above');

    expect(exampleNames(state)).toEqual(['Third', 'First', 'Second']);
    expect(item(state).draft.request.url).toBe('https://changed.example.com');
    expect(item(state).draft.request.method).toBe('POST');
  });

  it('leaves the request clean when the drop would not change the order', () => {
    // Dropping an example just below its predecessor is a visual no-op; creating a draft
    // here would mark the request dirty and trigger a pointless file write.
    const state = move(makeState(), 'ex-2', 'ex-1', 'below');

    expect(item(state).draft).toBeNull();
  });

  it('leaves the request clean when dropped onto itself', () => {
    const state = move(makeState(), 'ex-2', 'ex-2', 'above');

    expect(item(state).draft).toBeNull();
  });

  it('leaves the request clean when the dragged example does not exist', () => {
    const state = move(makeState(), 'ex-missing', 'ex-1', 'above');

    expect(item(state).draft).toBeNull();
    expect(item(state).examples.map((e) => e.name)).toEqual(['First', 'Second', 'Third']);
  });

  it('leaves the request clean when the target example does not exist', () => {
    // A cross-request drop resolves to a target uid this request has never heard of.
    const state = move(makeState(), 'ex-1', 'ex-from-another-request', 'above');

    expect(item(state).draft).toBeNull();
    expect(item(state).examples.map((e) => e.name)).toEqual(['First', 'Second', 'Third']);
  });

  it('ignores a drop on a request that has no examples', () => {
    const state = move(makeState({ examples: [] }), 'ex-1', 'ex-2', 'above');

    expect(item(state).draft).toBeNull();
  });

  it('ignores a drop for an unknown item', () => {
    const state = reducer(
      makeState(),
      moveResponseExample({
        itemUid: 'req-does-not-exist',
        collectionUid: COLLECTION_UID,
        draggedExampleUid: 'ex-3',
        targetExampleUid: 'ex-1',
        dropType: 'above'
      })
    );

    expect(item(state).examples.map((e) => e.name)).toEqual(['First', 'Second', 'Third']);
    expect(item(state).draft).toBeNull();
  });

  it('preserves example uids so the saved file keeps its position-derived uid mapping', () => {
    // Example uids are derived from (pathname, index) on the electron side, and the save
    // handler re-syncs that cache from the uids we send. Rewriting uids here would repoint
    // any open example tab at a different example.
    const state = move(makeState(), 'ex-3', 'ex-1', 'above');

    expect(item(state).draft.examples.map((e) => e.uid)).toEqual(['ex-3', 'ex-1', 'ex-2']);
  });
});
