import { buildTestState } from 'test-utils/buildTestState';
import {
  selectCollections,
  selectCollectionByUid,
  selectActiveWorkspace,
  makeSelectCollectionWithGlobals,
  makeSelectInvalidItemCountForCollection,
  makeSelectInvalidItemCountForFolder
} from './collections';

const request = (uid, name) => ({ uid, name, type: 'http-request', request: { url: `/${name}` } });

const buildState = () =>
  buildTestState({
    collections: {
      collections: [
        { uid: 'col-a', name: 'A', items: [{ uid: 'folder-1', type: 'folder', items: [request('req-1', 'one')] }] },
        { uid: 'col-b', name: 'B', items: [request('req-2', 'two')] }
      ]
    },
    globalEnvironments: {
      globalEnvironments: [
        { uid: 'genv-1', name: 'Global', variables: [{ name: 'host', value: 'https://x', enabled: true, secret: false }] }
      ],
      activeGlobalEnvironmentUid: 'genv-1'
    },
    workspaces: {
      workspaces: [{ uid: 'ws-1', name: 'One' }, { uid: 'ws-2', name: 'Two' }],
      activeWorkspaceUid: 'ws-2'
    }
  });

describe('selectors/collections', () => {
  it('selectCollectionByUid returns the stored reference, or undefined', () => {
    const state = buildState();
    expect(selectCollectionByUid(state, 'col-a')).toBe(state.collections.collections[0]);
    expect(selectCollectionByUid(state, 'nope')).toBeUndefined();
    expect(selectCollectionByUid(state, undefined)).toBeUndefined();
  });

  it('selectActiveWorkspace resolves the active uid', () => {
    expect(selectActiveWorkspace(buildState())).toEqual({ uid: 'ws-2', name: 'Two' });
  });

  it('selectCollections is the raw array reference', () => {
    const state = buildState();
    expect(selectCollections(state)).toBe(state.collections.collections);
  });

  describe('makeSelectCollectionWithGlobals', () => {
    it('grafts the active global environment onto the collection', () => {
      const select = makeSelectCollectionWithGlobals();
      const merged = select(buildState(), 'col-a');
      expect(merged.uid).toBe('col-a');
      expect(merged.globalEnvironmentVariables).toEqual({ host: 'https://x' });
      expect(merged.activeGlobalEnvironmentUid).toBe('genv-1');
      expect(merged.globalEnvironments).toHaveLength(1);
    });

    it('returns the same object while its inputs are unchanged', () => {
      const select = makeSelectCollectionWithGlobals();
      const state = buildState();
      expect(select(state, 'col-a')).toBe(select(state, 'col-a'));
    });

    it('recomputes when the collection reference changes and not when an unrelated slice does', () => {
      const select = makeSelectCollectionWithGlobals();
      const state = buildState();
      const first = select(state, 'col-a');

      const unrelated = { ...state, app: { ...state.app, isDragging: true } };
      expect(select(unrelated, 'col-a')).toBe(first);

      const edited = {
        ...state,
        collections: {
          ...state.collections,
          collections: state.collections.collections.map((c) => (c.uid === 'col-a' ? { ...c, name: 'A2' } : c))
        }
      };
      const second = select(edited, 'col-a');
      expect(second).not.toBe(first);
      expect(second.name).toBe('A2');
    });

    it('returns undefined for a missing collection', () => {
      expect(makeSelectCollectionWithGlobals()(buildState(), 'missing')).toBeUndefined();
    });
  });

  describe('makeSelectInvalidItemCountForCollection', () => {
    const broken = (uid, name) => ({
      uid,
      name,
      type: 'http-request',
      error: { message: 'parse failed' },
      request: { url: `/${name}` }
    });

    it('counts invalid nodes in the collection tree and ignores transient items', () => {
      const select = makeSelectInvalidItemCountForCollection();
      const state = buildTestState({
        collections: {
          collections: [
            {
              uid: 'col-invalid',
              name: 'Invalid',
              items: [
                broken('req-broken', 'broken'),
                { uid: 'req-ok', name: 'ok', type: 'http-request', request: { url: '/ok' } },
                { uid: 'req-transient', name: 'temp', type: 'http-request', isTransient: true, error: { message: 'x' }, request: { url: '/t' } }
              ]
            }
          ]
        }
      });
      expect(select(state, 'col-invalid')).toBe(1);
    });

    it('returns 0 for an unknown collection uid', () => {
      expect(makeSelectInvalidItemCountForCollection()(buildState(), 'missing')).toBe(0);
    });

    it('returns the same count when an unrelated collection changes', () => {
      const select = makeSelectInvalidItemCountForCollection();
      const state = buildTestState({
        collections: {
          collections: [
            { uid: 'col-a', name: 'A', items: [broken('r1', 'one')] },
            { uid: 'col-b', name: 'B', items: [request('r2', 'two')] }
          ]
        }
      });
      expect(select(state, 'col-a')).toBe(1);
      const next = {
        ...state,
        collections: {
          ...state.collections,
          collections: state.collections.collections.map((c) =>
            c.uid === 'col-b' ? { ...c, name: 'B renamed' } : c
          )
        }
      };
      expect(select(next, 'col-a')).toBe(1);
    });

    it('does not recompute when only collection.collapsed changes', () => {
      const items = [broken('r1', 'one')];
      const select = makeSelectInvalidItemCountForCollection();
      const state = buildTestState({
        collections: {
          collections: [{ uid: 'col-a', name: 'A', collapsed: false, items }]
        }
      });
      expect(select(state, 'col-a')).toBe(1);
      const toggled = buildTestState({
        collections: {
          collections: [{ uid: 'col-a', name: 'A', collapsed: true, items }]
        }
      });
      expect(select(toggled, 'col-a')).toBe(1);
      expect(select.recomputations()).toBe(1);
    });
  });

  describe('makeSelectInvalidItemCountForFolder', () => {
    it('counts invalid files in the folder items subtree passed from the row', () => {
      const select = makeSelectInvalidItemCountForFolder();
      const parentFolder = {
        uid: 'folder-parent',
        name: 'parent',
        type: 'folder',
        items: [
          { uid: 'req-nested', name: 'bad', type: 'http-request', error: { message: 'x' }, request: { url: '/b' } },
          { uid: 'folder-nested', name: 'nested', type: 'folder', items: [request('req-ok', 'ok')] }
        ]
      };
      const state = buildTestState({
        collections: {
          collections: [
            {
              uid: 'col-f',
              name: 'Tree',
              items: [
                parentFolder,
                { uid: 'req-root', name: 'root-bad', type: 'http-request', error: { message: 'y' }, request: { url: '/r' } }
              ]
            }
          ]
        }
      });
      expect(select(state, 'col-f', parentFolder.items)).toBe(1);
      expect(makeSelectInvalidItemCountForCollection()(state, 'col-f')).toBe(2);
    });

    it('returns 0 when folder items are omitted', () => {
      expect(makeSelectInvalidItemCountForFolder()(buildState(), 'col-a', undefined)).toBe(0);
    });
  });
});
