import reducer, {
  createCollection,
  toggleCollectionFileMode,
  updateFileContent,
  collectionChangeFileEvent
} from 'providers/ReduxStore/slices/collections';

const COLLECTION_UID = 'col-1';
const ITEM_UID = 'req-1';

const makeRequest = (overrides = {}) => ({
  url: 'https://example.com/userinfo',
  method: 'GET',
  params: [],
  headers: [],
  auth: { mode: 'none' },
  body: { mode: 'none' },
  script: {},
  vars: {},
  assertions: [],
  tests: '',
  docs: '',
  ...overrides
});

const makeInitialState = ({ fileMode = false, item = {} } = {}) => ({
  collections: [
    {
      uid: COLLECTION_UID,
      pathname: '/coll',
      fileMode,
      items: [
        {
          uid: ITEM_UID,
          name: 'user_info',
          filename: 'user_info.bru',
          pathname: '/coll/user_info.bru',
          type: 'http-request',
          seq: 1,
          raw: 'meta {\n  name: user_info\n}',
          draft: null,
          request: makeRequest(),
          ...item
        }
      ]
    }
  ],
  collectionSortOrder: 'default',
  activeWorkspaceUid: null
});

describe('createCollection', () => {
  test('initializes fileMode to false', () => {
    const state = reducer(
      { collections: [] },
      createCollection({ uid: COLLECTION_UID, pathname: '/coll', items: [], brunoConfig: {} })
    );

    expect(state.collections).toHaveLength(1);
    expect(state.collections[0].fileMode).toBe(false);
  });
});

describe('toggleCollectionFileMode', () => {
  test('toggles fileMode on and off', () => {
    let state = makeInitialState();

    state = reducer(state, toggleCollectionFileMode({ collectionUid: COLLECTION_UID }));
    expect(state.collections[0].fileMode).toBe(true);

    state = reducer(state, toggleCollectionFileMode({ collectionUid: COLLECTION_UID }));
    expect(state.collections[0].fileMode).toBe(false);
  });

  test('does nothing for an unknown collection', () => {
    const initialState = makeInitialState();
    const state = reducer(initialState, toggleCollectionFileMode({ collectionUid: 'unknown' }));

    expect(state.collections[0].fileMode).toBe(false);
  });
});

describe('updateFileContent', () => {
  test('creates a draft from the item and sets draft.raw', () => {
    const state = reducer(
      makeInitialState(),
      updateFileContent({
        collectionUid: COLLECTION_UID,
        itemUid: ITEM_UID,
        content: 'meta {\n  name: user_info_edited\n}'
      })
    );

    const item = state.collections[0].items[0];
    expect(item.draft).not.toBeNull();
    expect(item.draft.raw).toBe('meta {\n  name: user_info_edited\n}');
    // the draft preserves the structured request of the item
    expect(item.draft.request).toEqual(item.request);
    // the item itself is untouched
    expect(item.raw).toBe('meta {\n  name: user_info\n}');
  });

  test('updates raw on an existing draft without recreating it', () => {
    let state = reducer(
      makeInitialState(),
      updateFileContent({ collectionUid: COLLECTION_UID, itemUid: ITEM_UID, content: 'edit one' })
    );
    const firstDraft = state.collections[0].items[0].draft;

    state = reducer(
      state,
      updateFileContent({ collectionUid: COLLECTION_UID, itemUid: ITEM_UID, content: 'edit two' })
    );

    const item = state.collections[0].items[0];
    expect(item.draft.raw).toBe('edit two');
    expect(item.draft.request).toEqual(firstDraft.request);
  });

  test('does nothing for an unknown item', () => {
    const state = reducer(
      makeInitialState(),
      updateFileContent({ collectionUid: COLLECTION_UID, itemUid: 'unknown', content: 'edited' })
    );

    expect(state.collections[0].items[0].draft).toBeNull();
  });
});

describe('collectionChangeFileEvent — raw content', () => {
  const makeFileEvent = ({ raw, request = makeRequest(), seq = 1 } = {}) => ({
    file: {
      meta: {
        collectionUid: COLLECTION_UID,
        pathname: '/coll/user_info.bru',
        name: 'user_info.bru'
      },
      data: {
        uid: ITEM_UID,
        name: 'user_info',
        type: 'http-request',
        seq,
        raw,
        request
      }
    }
  });

  test('updates item.raw from the file event', () => {
    const newRaw = 'meta {\n  name: user_info_v2\n}';
    const state = reducer(
      makeInitialState(),
      collectionChangeFileEvent(
        makeFileEvent({ raw: newRaw, request: makeRequest({ url: 'https://example.com/v2' }) })
      )
    );

    const item = state.collections[0].items[0];
    expect(item.raw).toBe(newRaw);
    expect(item.request.url).toBe('https://example.com/v2');
  });

  test('updates item.raw on a seq-only change', () => {
    const newRaw = 'meta {\n  name: user_info\n  seq: 2\n}';
    const state = reducer(
      makeInitialState(),
      collectionChangeFileEvent(makeFileEvent({ raw: newRaw, seq: 2 }))
    );

    const item = state.collections[0].items[0];
    expect(item.seq).toBe(2);
    expect(item.raw).toBe(newRaw);
  });

  test('clears the draft when draft.raw matches the file content (file-mode save round-trip)', () => {
    let state = makeInitialState({ fileMode: true });
    const editedRaw = 'meta {\n  name: user_info\n}\n\nget {\n  url: https://example.com/edited\n}';

    state = reducer(
      state,
      updateFileContent({ collectionUid: COLLECTION_UID, itemUid: ITEM_UID, content: editedRaw })
    );
    expect(state.collections[0].items[0].draft).not.toBeNull();

    // the file watcher reports the saved file back with the same raw content
    state = reducer(
      state,
      collectionChangeFileEvent(
        makeFileEvent({ raw: editedRaw, request: makeRequest({ url: 'https://example.com/edited' }) })
      )
    );

    const item = state.collections[0].items[0];
    expect(item.draft).toBeNull();
    expect(item.raw).toBe(editedRaw);
  });

  test('preserves a draft whose raw content differs from the file content', () => {
    let state = makeInitialState({ fileMode: true });

    state = reducer(
      state,
      updateFileContent({ collectionUid: COLLECTION_UID, itemUid: ITEM_UID, content: 'unsaved edit' })
    );

    // a change arrives from disk that matches neither the draft structure nor its raw content
    state = reducer(
      state,
      collectionChangeFileEvent(
        makeFileEvent({
          raw: 'meta {\n  name: user_info_v3\n}',
          request: makeRequest({ url: 'https://example.com/v3' })
        })
      )
    );

    const item = state.collections[0].items[0];
    expect(item.raw).toBe('meta {\n  name: user_info_v3\n}');
    expect(item.draft).not.toBeNull();
    expect(item.draft.raw).toBe('unsaved edit');
  });

  test('does not clear a genuine draft when raw is undefined on both the draft and the file event', () => {
    // Simulate a structured-edit draft on an item that has no raw content,
    // and a file change whose data also carries no raw. The undefined === undefined
    // match must not wipe the user's unsaved edits.
    let state = makeInitialState({ item: { raw: undefined } });

    state.collections[0].items[0].draft = {
      uid: ITEM_UID,
      name: 'user_info',
      type: 'http-request',
      seq: 1,
      request: makeRequest({ url: 'https://example.com/locally-edited' })
    };

    state = reducer(
      state,
      collectionChangeFileEvent({
        file: {
          meta: {
            collectionUid: COLLECTION_UID,
            pathname: '/coll/user_info.bru',
            name: 'user_info.bru'
          },
          data: {
            uid: ITEM_UID,
            name: 'user_info',
            type: 'http-request',
            seq: 1,
            request: makeRequest({ url: 'https://example.com/disk-change' })
          }
        }
      })
    );

    const item = state.collections[0].items[0];
    expect(item.draft).not.toBeNull();
    expect(item.draft.request.url).toBe('https://example.com/locally-edited');
  });
});
