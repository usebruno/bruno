import { buildTestState } from 'test-utils/buildTestState';
import {
  selectCollections,
  selectCollectionByUid,
  selectCollectionName,
  selectItemByUid,
  selectActiveWorkspace,
  makeSelectCollectionWithGlobals
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

  it('selectCollectionName reads one field', () => {
    expect(selectCollectionName(buildState(), 'col-b')).toBe('B');
    expect(selectCollectionName(buildState(), 'missing')).toBeUndefined();
  });

  it('selectItemByUid walks nested folders and returns the stored reference', () => {
    const state = buildState();
    const item = selectItemByUid(state, 'col-a', 'req-1');
    expect(item).toBe(state.collections.collections[0].items[0].items[0]);
    expect(selectItemByUid(state, 'col-a', 'req-2')).toBeUndefined();
    expect(selectItemByUid(state, 'col-zzz', 'req-1')).toBeUndefined();
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
});
