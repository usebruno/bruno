import { collectionsSlice } from './index';

const { setRequestVars, setFolderVars, setCollectionVars } = collectionsSlice.actions;
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
  { uid: 'v1', name: 'numeric', value: 42, enabled: true, datatype: 'number' },
  { uid: 'v2', name: 'explicit_string', value: 'hi', enabled: true, datatype: 'string' },
  { uid: 'v3', name: 'plain', value: 'hello', enabled: true }
];

const assertGuardedVars = (vars) => {
  expect(vars).toHaveLength(3);
  expect(vars[0]).toMatchObject({ name: 'numeric', value: 42, datatype: 'number' });
  expect(vars[1]).toMatchObject({ name: 'explicit_string', value: 'hi' });
  expect(vars[1].datatype).toBeUndefined();
  expect(vars[2]).toMatchObject({ name: 'plain', value: 'hello' });
  expect(vars[2].datatype).toBeUndefined();
};

describe('setRequestVars — strips datatype: \'string\' (implicit default)', () => {
  it('drops a stray string-datatype on request vars and preserves typed datatypes', () => {
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

describe('setFolderVars — strips datatype: \'string\' (implicit default)', () => {
  it('drops a stray string-datatype on folder vars and preserves typed datatypes', () => {
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

describe('setCollectionVars — strips datatype: \'string\' (implicit default)', () => {
  it('drops a stray string-datatype on collection vars and preserves typed datatypes', () => {
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
