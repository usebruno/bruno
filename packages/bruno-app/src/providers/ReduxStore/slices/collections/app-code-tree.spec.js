import reducer, { collectionLoadedFromTree } from 'providers/ReduxStore/slices/collections';

const COLLECTION_UID = 'col-1';

const treeItem = (app) => ({
  uid: 'item-1',
  name: 'req',
  type: 'http-request',
  seq: 1,
  request: { method: 'GET', url: 'https://example.com', headers: [], params: [] },
  pathname: '/coll/req.yml',
  filename: 'req.yml',
  app
});

const stateWith = (item) => ({
  collections: [{ uid: COLLECTION_UID, pathname: '/coll', format: 'yml', items: [item], environments: [] }]
});

describe('app code loaded from the mount tree', () => {
  it('takes the app block from the tree when merging over an already loaded item', () => {
    const app = { enabled: true, code: '<h1>on disk</h1>' };
    const state = reducer(
      stateWith(treeItem({ enabled: true, code: '<h1>stale</h1>' })),
      collectionLoadedFromTree({ collectionUid: COLLECTION_UID, tree: { items: [treeItem(app)] } })
    );

    expect(state.collections[0].items[0].app).toEqual(app);
  });
});
