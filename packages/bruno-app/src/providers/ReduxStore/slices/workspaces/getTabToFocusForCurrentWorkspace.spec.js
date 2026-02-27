import { getTabToFocusForCurrentWorkspace } from './getTabToFocusForCurrentWorkspace';

function buildState(overrides = {}) {
  const wsA = {
    uid: 'workspace-a',
    scratchCollectionUid: 'scratch-a',
    collections: [{ path: '/path/col-a' }]
  };
  const wsB = {
    uid: 'workspace-b',
    scratchCollectionUid: 'scratch-b',
    collections: [{ path: '/path/col-b' }]
  };
  const colA = { uid: 'col-a', pathname: '/path/col-a' };
  const colB = { uid: 'col-b', pathname: '/path/col-b' };

  return {
    tabs: {
      activeTabUid: null,
      tabs: []
    },
    workspaces: {
      activeWorkspaceUid: 'workspace-b',
      workspaces: [wsA, wsB]
    },
    collections: {
      collections: [colA, colB]
    },
    ...overrides
  };
}

describe('getTabToFocusForCurrentWorkspace', () => {
  it('returns null when there is no active tab', () => {
    const state = buildState();
    expect(getTabToFocusForCurrentWorkspace(state)).toBeNull();
  });

  it('returns null when there are no tabs', () => {
    const state = buildState({ tabs: { activeTabUid: 'tab-1', tabs: [] } });
    expect(getTabToFocusForCurrentWorkspace(state)).toBeNull();
  });

  it('returns null when active tab is already in current workspace', () => {
    const state = buildState({
      tabs: {
        activeTabUid: 'req-b',
        tabs: [
          { uid: 'req-a', collectionUid: 'col-a' },
          { uid: 'req-b', collectionUid: 'col-b' }
        ]
      }
    });
    expect(getTabToFocusForCurrentWorkspace(state)).toBeNull();
  });

  it('returns in-workspace tab when active tab is from another workspace', () => {
    const state = buildState({
      tabs: {
        activeTabUid: 'req-a',
        tabs: [
          { uid: 'req-a', collectionUid: 'col-a' },
          { uid: 'req-b', collectionUid: 'col-b' },
          { uid: 'scratch-b-overview', collectionUid: 'scratch-b', type: 'workspaceOverview' }
        ]
      }
    });
    const result = getTabToFocusForCurrentWorkspace(state);
    expect(result).not.toBeNull();
    expect(result.uid).toBe('scratch-b-overview');
    expect(result.addOverviewFirst).toBeUndefined();
  });

  it('returns last in-workspace tab when multiple request tabs exist in current workspace', () => {
    const state = buildState({
      tabs: {
        activeTabUid: 'req-a',
        tabs: [
          { uid: 'req-a', collectionUid: 'col-a' },
          { uid: 'req-b1', collectionUid: 'col-b' },
          { uid: 'req-b2', collectionUid: 'col-b' }
        ]
      }
    });
    const result = getTabToFocusForCurrentWorkspace(state);
    expect(result).not.toBeNull();
    expect(result.uid).toBe('req-b2');
  });

  it('treats active tab with no collectionUid as not in workspace and returns in-workspace tab', () => {
    const state = buildState({
      tabs: {
        activeTabUid: 'malformed',
        tabs: [
          { uid: 'malformed' },
          { uid: 'req-b', collectionUid: 'col-b' }
        ]
      }
    });
    const result = getTabToFocusForCurrentWorkspace(state);
    expect(result).not.toBeNull();
    expect(result.uid).toBe('req-b');
  });

  it('returns overview with addOverviewFirst when no in-workspace tabs and overview missing', () => {
    const state = buildState({
      tabs: {
        activeTabUid: 'req-a',
        tabs: [
          { uid: 'req-a', collectionUid: 'col-a' }
        ]
      }
    });
    const result = getTabToFocusForCurrentWorkspace(state);
    expect(result).not.toBeNull();
    expect(result.uid).toBe('scratch-b-overview');
    expect(result.addOverviewFirst).toBe(true);
    expect(result.scratchCollectionUid).toBe('scratch-b');
  });

  it('returns null when no in-workspace tabs and no scratch', () => {
    const wsBNoScratch = {
      uid: 'workspace-b',
      scratchCollectionUid: null,
      collections: [{ path: '/path/col-b' }]
    };
    const state = buildState({
      workspaces: {
        activeWorkspaceUid: 'workspace-b',
        workspaces: [
          { uid: 'workspace-a', scratchCollectionUid: 'scratch-a', collections: [{ path: '/path/col-a' }] },
          wsBNoScratch
        ]
      },
      tabs: {
        activeTabUid: 'req-a',
        tabs: [{ uid: 'req-a', collectionUid: 'col-a' }]
      }
    });
    expect(getTabToFocusForCurrentWorkspace(state)).toBeNull();
  });
});
