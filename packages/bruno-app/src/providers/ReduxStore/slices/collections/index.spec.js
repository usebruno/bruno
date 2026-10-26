import { collectionsSlice } from './index';

const {
  updateVar,
  setRequestVars,
  setFolderVars,
  setCollectionVars,
  updateFile,
  wsResponseReceived,
  toggleSidebarSelection,
  setSidebarSelection,
  clearSidebarSelection,
  setLastClickedSidebarUid,
  collapseItem,
  expandItem,
  clearAllNetworkTimeline
} = collectionsSlice.actions;
const reducer = collectionsSlice.reducer;

const makeStateWith = (item) => ({
  collections: [
    {
      uid: 'col1',
      items: [item]
    }
  ]
});

const inputVars = [
  { uid: 'v1', name: 'numeric', value: 42, enabled: true, dataType: 'number' },
  { uid: 'v2', name: 'explicit_string', value: 'hi', enabled: true, dataType: 'string' },
  { uid: 'v3', name: 'plain', value: 'hello', enabled: true }
];

const assertGuardedVars = (vars) => {
  expect(vars).toHaveLength(3);
  expect(vars[0]).toMatchObject({ name: 'numeric', value: 42, dataType: 'number' });
  expect(vars[1]).toMatchObject({ name: 'explicit_string', value: 'hi' });
  expect(vars[1].dataType).toBeUndefined();
  expect(vars[2]).toMatchObject({ name: 'plain', value: 'hello' });
  expect(vars[2].dataType).toBeUndefined();
};

describe('setRequestVars — strips dataType: \'string\' (implicit default)', () => {
  it('drops a stray string-dataType on request vars and preserves typed datatypes', () => {
    const item = {
      uid: 'item1',
      type: 'http-request',
      request: { vars: { req: [], res: [] } }
    };

    const next = reducer(
      makeStateWith(item),
      setRequestVars({ collectionUid: 'col1', itemUid: 'item1', vars: inputVars, type: 'request' })
    );

    assertGuardedVars(next.collections[0].items[0].draft.request.vars.req);
  });
});

describe('setFolderVars — strips dataType: \'string\' (implicit default)', () => {
  it('drops a stray string-dataType on folder vars and preserves typed datatypes', () => {
    const folder = {
      uid: 'folder1',
      type: 'folder',
      root: { request: { vars: { req: [], res: [] } } }
    };

    const next = reducer(
      makeStateWith(folder),
      setFolderVars({ collectionUid: 'col1', folderUid: 'folder1', vars: inputVars, type: 'request' })
    );

    assertGuardedVars(next.collections[0].items[0].draft.request.vars.req);
  });
});

describe('setCollectionVars — strips dataType: \'string\' (implicit default)', () => {
  it('drops a stray string-dataType on collection vars and preserves typed datatypes', () => {
    const state = {
      collections: [
        {
          uid: 'col1',
          items: [],
          root: { request: { vars: { req: [], res: [] } } }
        }
      ]
    };

    const next = reducer(
      state,
      setCollectionVars({ collectionUid: 'col1', vars: inputVars, type: 'request' })
    );

    assertGuardedVars(next.collections[0].draft.root.request.vars.req);
  });
});

describe('updateFile — does not steal selection on non-selection edits', () => {
  it('editing the description of a non-selected file leaves the selected file selected', () => {
    const item = {
      uid: 'item1',
      type: 'http-request',
      request: {
        body: {
          file: [
            { uid: 'f1', filePath: '/tmp/readme.pdf', contentType: 'application/pdf', selected: true, description: '' },
            { uid: 'f2', filePath: '/tmp/plain.bin', contentType: 'application/octet-stream', selected: false, description: '' }
          ]
        }
      }
    };

    const next = reducer(
      makeStateWith(item),
      updateFile({
        collectionUid: 'col1',
        itemUid: 'item1',
        param: {
          uid: 'f2',
          filePath: '/tmp/plain.bin',
          contentType: 'application/octet-stream',
          description: 'a plain file',
          selected: false
        }
      })
    );

    const files = next.collections[0].items[0].draft.request.body.file;
    const f1 = files.find((p) => p.uid === 'f1');
    const f2 = files.find((p) => p.uid === 'f2');

    expect(f1.selected).toBe(true);
    expect(f2.selected).toBe(false);
    expect(f2.description).toBe('a plain file');
  });
});

describe('wsResponseReceived — disconnecting', () => {
  it('sets response status to DISCONNECTING', () => {
    const item = {
      uid: 'item1',
      type: 'ws-request',
      request: { url: 'ws://localhost:9', body: { ws: [] } },
      response: {
        status: 'CONNECTED',
        statusText: 'CONNECTED',
        responses: []
      },
      requestSent: { timestamp: Date.now() }
    };

    const next = reducer(
      makeStateWith(item),
      wsResponseReceived({
        itemUid: 'item1',
        collectionUid: 'col1',
        eventType: 'disconnecting',
        eventData: {}
      })
    );

    expect(next.collections[0].items[0].response).toMatchObject({
      status: 'DISCONNECTING',
      statusText: 'DISCONNECTING'
    });
  });
});

describe('sidebar selection reducers', () => {
  const baseState = { selectedSidebarUids: [], lastClickedSidebarUid: null };

  it('toggleSidebarSelection adds then removes a uid', () => {
    let state = reducer(baseState, toggleSidebarSelection('a'));
    expect(state.selectedSidebarUids).toEqual(['a']);

    state = reducer(state, toggleSidebarSelection('a'));
    expect(state.selectedSidebarUids).toEqual([]);
  });

  it('setSidebarSelection replaces the selection wholesale', () => {
    const state = reducer(baseState, setSidebarSelection(['a', 'b', 'c']));
    expect(state.selectedSidebarUids).toEqual(['a', 'b', 'c']);
  });

  it('clearSidebarSelection empties the selection and the shift-click anchor', () => {
    const state = reducer(
      { selectedSidebarUids: ['a', 'b'], lastClickedSidebarUid: 'a' },
      clearSidebarSelection()
    );
    expect(state.selectedSidebarUids).toEqual([]);
    expect(state.lastClickedSidebarUid).toBeNull();
  });

  it('setLastClickedSidebarUid sets the shift-click anchor', () => {
    const state = reducer(baseState, setLastClickedSidebarUid('b'));
    expect(state.lastClickedSidebarUid).toBe('b');
  });
});

describe('collapseItem', () => {
  it('collapses a folder without affecting nested items', () => {
    const folder = {
      uid: 'folder1',
      type: 'folder',
      collapsed: false,
      items: [
        {
          uid: 'nested1',
          type: 'folder',
          collapsed: false,
          items: [{ uid: 'req1', type: 'http-request', request: {}, collapsed: false }]
        }
      ]
    };

    const next = reducer(
      makeStateWith(folder),
      collapseItem({ collectionUid: 'col1', itemUid: 'folder1' })
    );

    const [collapsedFolder] = next.collections[0].items;
    expect(collapsedFolder.collapsed).toBe(true);
    expect(collapsedFolder.items[0].collapsed).toBe(false);
    expect(collapsedFolder.items[0].items[0].collapsed).toBe(false);
  });
});

describe('expandItem', () => {
  it('expands a folder without affecting nested items', () => {
    const folder = {
      uid: 'folder1',
      type: 'folder',
      collapsed: true,
      items: [
        {
          uid: 'nested1',
          type: 'folder',
          collapsed: true,
          items: [{ uid: 'req1', type: 'http-request', request: {}, collapsed: true }]
        }
      ]
    };

    const next = reducer(
      makeStateWith(folder),
      expandItem({ collectionUid: 'col1', itemUid: 'folder1' })
    );

    const [expandedFolder] = next.collections[0].items;
    expect(expandedFolder.collapsed).toBe(false);
    expect(expandedFolder.items[0].collapsed).toBe(true);
    expect(expandedFolder.items[0].items[0].collapsed).toBe(true);
  });

  it('expands a request so its response examples render', () => {
    const request = { uid: 'req1', type: 'http-request', request: {}, collapsed: true };

    const next = reducer(
      makeStateWith(request),
      expandItem({ collectionUid: 'col1', itemUid: 'req1' })
    );

    expect(next.collections[0].items[0].collapsed).toBe(false);
  });
});

describe('updateVar — dataType is only changed when the caller says so', () => {
  const itemWithTypedVar = () => ({
    uid: 'item1',
    type: 'http-request',
    request: { vars: { req: [{ uid: 'v1', name: 'count', value: '42', enabled: true, dataType: 'number' }], res: [] } }
  });

  const reqVarsAfter = (payloadVar) =>
    reducer(makeStateWith(itemWithTypedVar()), updateVar({ collectionUid: 'col1', itemUid: 'item1', type: 'request', var: payloadVar }))
      .collections[0].items[0].draft.request.vars.req;

  it('keeps an existing dataType when the payload carries none', () => {
    const vars = reqVarsAfter({ uid: 'v1', name: 'count', value: '43', enabled: true });

    expect(vars[0]).toMatchObject({ value: '43', dataType: 'number' });
  });

  it('clears the dataType when the caller explicitly says string', () => {
    const vars = reqVarsAfter({ uid: 'v1', name: 'count', value: 'abc', enabled: true, dataType: 'string' });

    expect(vars[0]).toMatchObject({ value: 'abc' });
    expect(vars[0].dataType).toBeUndefined();
  });

  it('replaces the dataType when the caller names a different one', () => {
    const vars = reqVarsAfter({ uid: 'v1', name: 'count', value: 'true', enabled: true, dataType: 'boolean' });

    expect(vars[0]).toMatchObject({ value: 'true', dataType: 'boolean' });
  });
});

describe('clearAllNetworkTimeline', () => {
  const requestEntry = (uid) => ({
    type: 'request',
    collectionUid: 'col1',
    itemUid: uid,
    timestamp: 1,
    data: {
      request: { method: 'GET', url: 'https://example.com' },
      response: { statusCode: 200 }
    }
  });

  it('removes request entries from every collection', () => {
    const state = {
      collections: [
        { uid: 'col1', name: 'One', timeline: [requestEntry('r1'), requestEntry('r2')] },
        { uid: 'col2', name: 'Two', timeline: [requestEntry('r3')] }
      ]
    };

    const next = reducer(state, clearAllNetworkTimeline());

    expect(next.collections[0].timeline).toEqual([]);
    expect(next.collections[1].timeline).toEqual([]);
  });

  it('keeps non-request timeline entries and collections that have no timeline', () => {
    const infoEntry = { type: 'info', timestamp: 2, message: 'kept' };
    const oauthEntry = { type: 'oauth2', timestamp: 3, data: {} };
    const state = {
      collections: [
        { uid: 'col1', timeline: [requestEntry('r1'), infoEntry, oauthEntry] },
        { uid: 'col2' }
      ]
    };

    const next = reducer(state, clearAllNetworkTimeline());

    expect(next.collections[0].timeline).toEqual([infoEntry, oauthEntry]);
    expect(next.collections[1].timeline).toBeUndefined();
  });

  it('is a no-op when there are no collections', () => {
    const next = reducer({ collections: [] }, clearAllNetworkTimeline());

    expect(next.collections).toEqual([]);
  });
});
