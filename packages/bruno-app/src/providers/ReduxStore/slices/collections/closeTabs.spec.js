import tabsReducer from 'providers/ReduxStore/slices/tabs';
import { closeTabs } from './actions';

const WORKSPACE = {
  uid: 'ws',
  scratchCollectionUid: 'scratch',
  collections: [{ path: '/payments' }, { path: '/users' }]
};

const COLLECTIONS = [
  { uid: 'scratch', pathname: '/scratch', mountStatus: 'mounted', name: 'Scratch', items: [] },
  { uid: 'payments', pathname: '/payments', mountStatus: 'mounted', name: 'Payments', items: [] },
  { uid: 'users', pathname: '/users', mountStatus: 'mounted', name: 'Users', items: [] }
];

const tab = (uid, collectionUid, type = 'request') => ({ uid, collectionUid, type });

const runClose = async (tabs, activeTabUid, closingUid) => {
  const state = {
    workspaces: { activeWorkspaceUid: 'ws', workspaces: [WORKSPACE] },
    collections: { collections: COLLECTIONS, tempDirectories: {} },
    tabs: { ...tabsReducer(undefined, { type: '@@init' }), tabs, activeTabUid }
  };
  const getState = () => state;
  const dispatch = (action) => {
    if (typeof action === 'function') return action(dispatch, getState);
    state.tabs = tabsReducer(state.tabs, action);
    return action;
  };

  await closeTabs({ tabUids: [closingUid] })(dispatch, getState);
  return state.tabs;
};

describe('closeTabs — moving on after a collection\'s last tab closes', () => {
  beforeEach(() => {
    window.ipcRenderer = { invoke: jest.fn().mockResolvedValue({}) };
  });

  it('focuses the first tab of the next collection in the switcher', async () => {
    const tabs = [tab('p1', 'payments'), tab('u1', 'users'), tab('u2', 'users')];
    const result = await runClose(tabs, 'p1', 'p1');

    expect(result.activeTabUid).toBe('u1');
  });

  it('focuses the last tab of the previous collection when none follows', async () => {
    const tabs = [tab('u1', 'users'), tab('u2', 'users'), tab('p1', 'payments')];
    const result = await runClose(tabs, 'p1', 'p1');

    expect(result.activeTabUid).toBe('u2');
  });

  it('opens the workspace overview when no other tab is left', async () => {
    const result = await runClose([tab('p1', 'payments')], 'p1', 'p1');

    expect(result.activeTabUid).toBe('scratch-overview');
    expect(result.tabs.map((t) => t.type)).toEqual(['workspaceOverview']);
  });

  it('shows the start page after closing the overview as the last tab', async () => {
    const result = await runClose([tab('scratch-overview', 'scratch', 'workspaceOverview')], 'scratch-overview', 'scratch-overview');

    expect(result.activeTabUid).toBeNull();
    expect(result.tabs).toEqual([]);
  });

  it('stays in the same collection while it still has tabs', async () => {
    const tabs = [tab('p1', 'payments'), tab('p2', 'payments'), tab('u1', 'users')];
    const result = await runClose(tabs, 'p1', 'p1');

    expect(result.activeTabUid).toBe('p2');
  });
});
