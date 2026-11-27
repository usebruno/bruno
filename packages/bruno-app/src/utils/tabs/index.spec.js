import { getNeighbourCollectionUid, getWorkspaceTab } from './index';

describe('getNeighbourCollectionUid', () => {
  const order = ['workspace', 'payments', 'users', 'orders'];
  const withTabs = (...uids) => (uid) => uids.includes(uid);

  it('picks the next entry that still has tabs', () => {
    expect(getNeighbourCollectionUid(order, 'payments', withTabs('workspace', 'users', 'orders'))).toBe('users');
  });

  it('skips next entries without tabs', () => {
    expect(getNeighbourCollectionUid(order, 'payments', withTabs('workspace', 'orders'))).toBe('orders');
  });

  it('falls back to the nearest previous entry when nothing after has tabs', () => {
    expect(getNeighbourCollectionUid(order, 'orders', withTabs('workspace', 'payments', 'users'))).toBe('users');
  });

  it('moves from the workspace to the first collection with tabs', () => {
    expect(getNeighbourCollectionUid(order, 'workspace', withTabs('users'))).toBe('users');
  });

  it('returns null when no other entry has tabs or the closed one is unknown', () => {
    expect(getNeighbourCollectionUid(order, 'users', withTabs())).toBeNull();
    expect(getNeighbourCollectionUid(order, 'missing', withTabs('users'))).toBeNull();
  });
});

describe('getWorkspaceTab', () => {
  it('builds the tab for the workspace Overview and Environments', () => {
    expect(getWorkspaceTab('scratch-1', 'workspaceOverview')).toEqual({ uid: 'scratch-1-overview', collectionUid: 'scratch-1', type: 'workspaceOverview' });
    expect(getWorkspaceTab('scratch-1', 'workspaceEnvironments')).toEqual({ uid: 'scratch-1-environments', collectionUid: 'scratch-1', type: 'workspaceEnvironments' });
  });
});
