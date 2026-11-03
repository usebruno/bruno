import { buildTestState } from 'test-utils/buildTestState';
import {
  getTabUidForItem,
  isTabForItemActive,
  selectTabs,
  selectActiveTabUid,
  selectTabByUid,
  selectActiveTab,
  selectTabCountsByCollection,
  selectFirstTabUidByCollection,
  makeSelectTabsForCollection
} from './tab';

describe('tab selectors', () => {
  const baseState = {
    tabs: {
      activeTabUid: null,
      tabs: []
    }
  };

  it('does not resolve request tab uid from response-example pathname fallback', () => {
    const state = {
      ...baseState,
      tabs: {
        ...baseState.tabs,
        tabs: [
          {
            uid: 'example-1',
            type: 'response-example',
            pathname: '/c/req.bru',
            collectionUid: 'c1'
          }
        ]
      }
    };

    const selector = getTabUidForItem({ itemUid: 'request-1', itemPathname: '/c/req.bru', collectionUid: 'c1' });
    expect(selector(state)).toBeNull();
  });

  it('does not mark a request active while an API spec tab is the active one', () => {
    const state = {
      ...baseState,
      tabs: {
        activeTabUid: 'api-spec::scratch::/workspace/petstore.yaml',
        tabs: [
          {
            uid: 'api-spec::scratch::/workspace/petstore.yaml',
            type: 'api-spec',
            apiSpecPathname: '/workspace/petstore.yaml',
            pathname: null,
            collectionUid: 'c1'
          }
        ]
      }
    };

    const selector = isTabForItemActive({ itemUid: 'request-1', itemPathname: '/c/req.bru', collectionUid: 'c1' });
    expect(selector(state)).toBe(false);
  });

  it('does not mark request active when only response-example tab is active on same pathname', () => {
    const state = {
      ...baseState,
      tabs: {
        activeTabUid: 'example-1',
        tabs: [
          {
            uid: 'example-1',
            type: 'response-example',
            pathname: '/c/req.bru',
            collectionUid: 'c1'
          }
        ]
      }
    };

    const selector = isTabForItemActive({ itemUid: 'request-1', itemPathname: '/c/req.bru', collectionUid: 'c1' });
    expect(selector(state)).toBe(false);
  });

  it('does not resolve a tab when only a response-example tab exists for same pathname', () => {
    const state = {
      ...baseState,
      tabs: {
        ...baseState.tabs,
        tabs: [
          {
            uid: 'example-1',
            type: 'response-example',
            pathname: '/c/req.bru',
            collectionUid: 'c1'
          }
        ]
      }
    };

    const selector = getTabUidForItem({ itemUid: 'request-1', itemPathname: '/c/req.bru', collectionUid: 'c1' });
    expect(selector(state)).toBeNull();
  });

  it('still resolves regular request tab by pathname fallback', () => {
    const state = {
      ...baseState,
      tabs: {
        ...baseState.tabs,
        tabs: [
          {
            uid: 'request-1',
            type: 'http-request',
            pathname: '/c/req.bru',
            collectionUid: 'c1'
          }
        ]
      }
    };

    const selector = getTabUidForItem({ itemUid: 'missing-uid', itemPathname: '/c/req.bru', collectionUid: 'c1' });
    expect(selector(state)).toBe('request-1');
  });
});

const tab = (uid, collectionUid, extra = {}) => ({ uid, collectionUid, type: 'request', ...extra });

const buildState = () =>
  buildTestState({
    tabs: {
      tabs: [tab('t1', 'col-a'), tab('t2', 'col-b'), tab('t3', 'col-a')],
      activeTabUid: 't2'
    }
  });

describe('tab field selectors', () => {
  it('selectTabs and selectActiveTabUid are plain field reads', () => {
    const state = buildState();
    expect(selectTabs(state)).toBe(state.tabs.tabs);
    expect(selectActiveTabUid(state)).toBe('t2');
  });

  it('selectTabByUid returns the stored reference, or undefined', () => {
    const state = buildState();
    expect(selectTabByUid(state, 't3')).toBe(state.tabs.tabs[2]);
    expect(selectTabByUid(state, 'missing')).toBeUndefined();
    expect(selectTabByUid(state, null)).toBeUndefined();
  });

  it('selectActiveTab resolves activeTabUid', () => {
    const state = buildState();
    expect(selectActiveTab(state)).toBe(state.tabs.tabs[1]);
    expect(selectActiveTab(buildTestState())).toBeUndefined();
  });

  describe('selectTabCountsByCollection', () => {
    it('counts open tabs per collection', () => {
      expect(selectTabCountsByCollection(buildState())).toEqual({ 'col-a': 2, 'col-b': 1 });
      expect(selectTabCountsByCollection(buildTestState())).toEqual({});
    });

    it('returns the same object until the tabs array changes', () => {
      const state = buildState();
      const first = selectTabCountsByCollection(state);
      const unrelated = { ...state, app: { ...state.app, isDragging: true } };
      expect(selectTabCountsByCollection(unrelated)).toBe(first);

      const changed = { ...state, tabs: { ...state.tabs, tabs: [...state.tabs.tabs, tab('t4', 'col-b')] } };
      expect(selectTabCountsByCollection(changed)).toEqual({ 'col-a': 2, 'col-b': 2 });
    });
  });

  describe('selectFirstTabUidByCollection', () => {
    it('maps each collection to its first tab in strip order', () => {
      expect(selectFirstTabUidByCollection(buildState())).toEqual({ 'col-a': 't1', 'col-b': 't2' });
      expect(selectFirstTabUidByCollection(buildTestState())).toEqual({});
    });

    it('returns the same object until the tabs array changes', () => {
      const state = buildState();
      const first = selectFirstTabUidByCollection(state);
      const unrelated = { ...state, app: { ...state.app, isDragging: true } };
      expect(selectFirstTabUidByCollection(unrelated)).toBe(first);
    });
  });

  describe('makeSelectTabsForCollection', () => {
    it('filters by collection uid', () => {
      const result = makeSelectTabsForCollection()(buildState(), 'col-a');
      expect(result.map((t) => t.uid)).toEqual(['t1', 't3']);
    });

    it('is memoized on the tabs reference', () => {
      const selectTabsForCollection = makeSelectTabsForCollection();
      const state = buildState();
      const first = selectTabsForCollection(state, 'col-a');
      expect(selectTabsForCollection(state, 'col-a')).toBe(first);

      const unrelated = { ...state, app: { ...state.app, isDragging: true } };
      expect(selectTabsForCollection(unrelated, 'col-a')).toBe(first);

      const changed = { ...state, tabs: { ...state.tabs, tabs: [...state.tabs.tabs, tab('t4', 'col-a')] } };
      expect(selectTabsForCollection(changed, 'col-a')).not.toBe(first);
      expect(selectTabsForCollection(changed, 'col-a')).toHaveLength(3);
    });

    it('gives each instance its own cache', () => {
      const state = buildState();
      const a = makeSelectTabsForCollection();
      const b = makeSelectTabsForCollection();
      const firstA = a(state, 'col-a');
      b(state, 'col-b');
      expect(a(state, 'col-a')).toBe(firstA);
    });
  });
});
