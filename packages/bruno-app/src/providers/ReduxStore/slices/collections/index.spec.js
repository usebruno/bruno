import { collectionsSlice } from './index';

const {
  setRequestVars,
  setFolderVars,
  setCollectionVars,
  selectEnvironment,
  applyDefaultEnvironment,
  runtimeVariablesUpdateEvent,
  collectionAddEnvFileEvent,
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

describe('active environment changes — isolate runtime variables by environment', () => {
  const makeState = () => ({
    collections: [
      {
        uid: 'col1',
        activeEnvironmentUid: 'env-a',
        environments: [
          { uid: 'env-a', name: 'A' },
          { uid: 'env-b', name: 'B' }
        ],
        runtimeVariables: { title: 'runtime-value' }
      }
    ]
  });

  it('clears runtime variables when the active environment changes', () => {
    const next = reducer(
      makeState(),
      selectEnvironment({ collectionUid: 'col1', environmentUid: 'env-b' })
    );

    expect(next.collections[0].activeEnvironmentUid).toBe('env-b');
    expect(next.collections[0].runtimeVariables).toEqual({});
  });

  it('keeps runtime variables when the active environment is selected again', () => {
    const next = reducer(
      makeState(),
      selectEnvironment({ collectionUid: 'col1', environmentUid: 'env-a' })
    );

    expect(next.collections[0].activeEnvironmentUid).toBe('env-a');
    expect(next.collections[0].runtimeVariables).toEqual({ title: 'runtime-value' });
  });

  it('clears runtime variables when no environment is selected', () => {
    const next = reducer(
      makeState(),
      selectEnvironment({ collectionUid: 'col1', environmentUid: null })
    );

    expect(next.collections[0].activeEnvironmentUid).toBeNull();
    expect(next.collections[0].runtimeVariables).toEqual({});
  });

  it('ignores runtime variable updates from the previously active environment', () => {
    const switchedState = reducer(
      makeState(),
      selectEnvironment({ collectionUid: 'col1', environmentUid: 'env-b' })
    );
    const next = reducer(
      switchedState,
      runtimeVariablesUpdateEvent({
        collectionUid: 'col1',
        environmentUid: 'env-a',
        runtimeVariables: { title: 'stale-runtime-value' }
      })
    );

    expect(next.collections[0].runtimeVariables).toEqual({});
  });

  it('applies runtime variable updates from the active environment', () => {
    const switchedState = reducer(
      makeState(),
      selectEnvironment({ collectionUid: 'col1', environmentUid: 'env-b' })
    );
    const next = reducer(
      switchedState,
      runtimeVariablesUpdateEvent({
        collectionUid: 'col1',
        environmentUid: 'env-b',
        runtimeVariables: { title: 'current-runtime-value' }
      })
    );

    expect(next.collections[0].runtimeVariables).toEqual({ title: 'current-runtime-value' });
  });

  it('clears runtime variables when the default environment becomes active', () => {
    const state = makeState();
    state.collections[0].activeEnvironmentUid = null;

    const next = reducer(
      state,
      applyDefaultEnvironment({ collectionUid: 'col1', defaultEnvironmentName: 'B' })
    );

    expect(next.collections[0].activeEnvironmentUid).toBe('env-b');
    expect(next.collections[0].runtimeVariables).toEqual({});
  });

  it('clears runtime variables when a newly added environment becomes active', () => {
    const state = makeState();
    state.collections[0].lastAction = { type: 'ADD_ENVIRONMENT', payload: 'B' };

    const next = reducer(
      state,
      collectionAddEnvFileEvent({
        collectionUid: 'col1',
        environment: { uid: 'env-c', name: 'B' }
      })
    );

    expect(next.collections[0].activeEnvironmentUid).toBe('env-c');
    expect(next.collections[0].runtimeVariables).toEqual({});
  });

  it('clears runtime variables when a pending default environment file loads', () => {
    const state = makeState();
    state.collections[0].activeEnvironmentUid = null;
    state.collections[0].pendingDefaultEnvironment = 'C';

    const next = reducer(
      state,
      collectionAddEnvFileEvent({
        collectionUid: 'col1',
        environment: { uid: 'env-c', name: 'C' }
      })
    );

    expect(next.collections[0].activeEnvironmentUid).toBe('env-c');
    expect(next.collections[0].runtimeVariables).toEqual({});
  });
});

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
