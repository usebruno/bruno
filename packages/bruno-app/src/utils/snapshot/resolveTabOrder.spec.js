import { resolveTabOrder } from 'utils/snapshot';

const COL_A = '/workspace/collections/a';
const COL_B = '/workspace/collections/b';

const collections = [
  { uid: 'A', pathname: COL_A },
  { uid: 'B', pathname: COL_B }
];

const tabs = [
  { uid: 'a1', collectionUid: 'A', type: 'http-request', pathname: `${COL_A}/a.yml` },
  { uid: 'b1', collectionUid: 'B', type: 'http-request', pathname: `${COL_B}/b.yml` },
  { uid: 'a2', collectionUid: 'A', type: 'collection-settings' }
];

describe('resolveTabOrder', () => {
  it('maps a persisted pathname-keyed order to the current tab uids, cross-collection', () => {
    const { orderedUids, activeUid } = resolveTabOrder(
      {
        tabOrder: [
          { collection: COL_B, accessor: 'pathname', value: `${COL_B}/b.yml` },
          { collection: COL_A, accessor: 'pathname', value: `${COL_A}/a.yml` },
          { collection: COL_A, accessor: 'type', value: 'collection-settings' }
        ],
        activeTab: { collection: COL_A, accessor: 'type', value: 'collection-settings' }
      },
      tabs,
      collections
    );

    expect(orderedUids).toEqual(['b1', 'a1', 'a2']);
    expect(activeUid).toBe('a2');
  });

  it('skips entries whose collection or tab is not present yet', () => {
    const { orderedUids, activeUid } = resolveTabOrder(
      {
        tabOrder: [
          { collection: '/workspace/collections/missing', accessor: 'pathname', value: '/x/y.yml' },
          { collection: COL_A, accessor: 'pathname', value: `${COL_A}/a.yml` }
        ],
        activeTab: null
      },
      tabs,
      collections
    );

    expect(orderedUids).toEqual(['a1']);
    expect(activeUid).toBeNull();
  });

  it('returns empty results for an empty order', () => {
    expect(resolveTabOrder({ tabOrder: [], activeTab: null }, tabs, collections)).toEqual({
      orderedUids: [],
      activeUid: null
    });
  });
});
