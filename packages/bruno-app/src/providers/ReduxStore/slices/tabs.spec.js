import reducer, {
  collapseRequestPane,
  collapseResponsePane,
  expandRequestPane,
  expandResponsePane
} from './tabs';

const makeState = (overrides = {}) => ({
  tabs: [{
    uid: 'tab-1',
    collectionUid: 'col-1',
    type: 'http-request',
    requestPaneWidth: 500,
    requestPaneHeight: 400,
    requestPaneCollapsed: false,
    responsePaneCollapsed: false,
    ...overrides
  }],
  activeTabUid: 'tab-1',
  recentlyClosedTabs: []
});

describe('tabs slice - collapse/expand reducers', () => {
  it('collapseRequestPane flips flags and preserves stored dimensions', () => {
    const next = reducer(makeState({ responsePaneCollapsed: true }), collapseRequestPane({ uid: 'tab-1' }));

    expect(next.tabs[0].requestPaneCollapsed).toBe(true);
    expect(next.tabs[0].responsePaneCollapsed).toBe(false);
    expect(next.tabs[0].requestPaneWidth).toBe(500);
    expect(next.tabs[0].requestPaneHeight).toBe(400);
  });

  it('collapseResponsePane flips flags and preserves stored dimensions', () => {
    const next = reducer(makeState({ requestPaneCollapsed: true }), collapseResponsePane({ uid: 'tab-1' }));

    expect(next.tabs[0].requestPaneCollapsed).toBe(false);
    expect(next.tabs[0].responsePaneCollapsed).toBe(true);
    expect(next.tabs[0].requestPaneWidth).toBe(500);
    expect(next.tabs[0].requestPaneHeight).toBe(400);
  });

  it('expandRequestPane flips flag and resets stored dimensions to default', () => {
    const next = reducer(makeState({ requestPaneCollapsed: true }), expandRequestPane({ uid: 'tab-1' }));

    expect(next.tabs[0].requestPaneCollapsed).toBe(false);
    expect(next.tabs[0].requestPaneWidth).toBeNull();
    expect(next.tabs[0].requestPaneHeight).toBeNull();
  });

  it('expandResponsePane flips flag and resets stored dimensions to default', () => {
    const next = reducer(makeState({ responsePaneCollapsed: true }), expandResponsePane({ uid: 'tab-1' }));

    expect(next.tabs[0].responsePaneCollapsed).toBe(false);
    expect(next.tabs[0].requestPaneWidth).toBeNull();
    expect(next.tabs[0].requestPaneHeight).toBeNull();
  });
});
