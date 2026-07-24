import { collectionsSlice } from './index';

const {
  setRequestVars,
  setFolderVars,
  setCollectionVars,
  updateFile,
  wsResponseReceived
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
