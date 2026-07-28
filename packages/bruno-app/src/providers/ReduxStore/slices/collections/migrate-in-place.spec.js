import { collectionsSlice } from './index';

const { migrateCollectionToYmlInPlace } = collectionsSlice.actions;
const reducer = collectionsSlice.reducer;

const makeState = () => ({
  collections: [
    {
      uid: 'col1',
      format: 'bru',
      brunoConfig: { version: '1', name: 'demo' },
      environments: [
        { uid: 'e1', name: 'Local', pathname: '/c/environments/Local.bru' }
      ],
      items: [
        {
          uid: 'r1',
          type: 'http-request',
          name: 'ping',
          pathname: '/c/ping.bru',
          filename: 'ping.bru',
          seq: 1,
          draft: { request: { url: 'https://example.com/ping' } }
        },
        {
          uid: 'f1',
          type: 'folder',
          name: 'api',
          pathname: '/c/api',
          filename: 'api',
          collapsed: false,
          items: [
            {
              uid: 'r2',
              type: 'http-request',
              name: 'users',
              pathname: '/c/api/users.bru',
              filename: 'users.bru',
              seq: 1
            },
            {
              uid: 'f2',
              type: 'folder',
              name: 'v2',
              pathname: '/c/api/v2',
              filename: 'v2',
              collapsed: false,
              items: [
                {
                  uid: 'r3',
                  type: 'http-request',
                  name: 'deep',
                  pathname: '/c/api/v2/deep.bru',
                  filename: 'deep.bru',
                  seq: 1
                }
              ]
            }
          ]
        }
      ]
    }
  ]
});

describe('migrateCollectionToYmlInPlace', () => {
  it('rewrites request pathnames/filenames .bru -> .yml at every nesting depth', () => {
    const next = reducer(
      makeState(),
      migrateCollectionToYmlInPlace({ collectionUid: 'col1', brunoConfig: { opencollection: '1.0.0', version: 'v1' } })
    );
    const col = next.collections[0];
    const r1 = col.items[0];
    const f1 = col.items[1];
    const r2 = f1.items[0];
    const f2 = f1.items[1];
    const r3 = f2.items[0];

    expect(r1.pathname).toBe('/c/ping.yml');
    expect(r1.filename).toBe('ping.yml');
    expect(r2.pathname).toBe('/c/api/users.yml');
    expect(r2.filename).toBe('users.yml');
    expect(r3.pathname).toBe('/c/api/v2/deep.yml');
    expect(r3.filename).toBe('deep.yml');
  });

  it('flips collection.format to yml and updates brunoConfig', () => {
    const next = reducer(
      makeState(),
      migrateCollectionToYmlInPlace({ collectionUid: 'col1', brunoConfig: { opencollection: '1.0.0', version: 'v1' } })
    );
    expect(next.collections[0].format).toBe('yml');
    expect(next.collections[0].brunoConfig).toEqual({ opencollection: '1.0.0', version: 'v1' });
  });

  it('preserves item uids, seq, draft, and folder collapsed state', () => {
    const next = reducer(
      makeState(),
      migrateCollectionToYmlInPlace({ collectionUid: 'col1', brunoConfig: {} })
    );
    const col = next.collections[0];
    const r1 = col.items[0];
    const f1 = col.items[1];
    const f2 = f1.items[1];

    expect(r1.uid).toBe('r1');
    expect(r1.seq).toBe(1);
    expect(r1.draft).toEqual({ request: { url: 'https://example.com/ping' } });
    expect(f1.uid).toBe('f1');
    expect(f1.collapsed).toBe(false);
    expect(f2.collapsed).toBe(false);
  });

  it('leaves folder pathnames/filenames unchanged (only files migrate)', () => {
    const next = reducer(
      makeState(),
      migrateCollectionToYmlInPlace({ collectionUid: 'col1', brunoConfig: {} })
    );
    const f1 = next.collections[0].items[1];
    const f2 = f1.items[1];
    expect(f1.pathname).toBe('/c/api');
    expect(f1.filename).toBe('api');
    expect(f2.pathname).toBe('/c/api/v2');
    expect(f2.filename).toBe('v2');
  });

  it('rewrites environment file pathnames .bru -> .yml', () => {
    const next = reducer(
      makeState(),
      migrateCollectionToYmlInPlace({ collectionUid: 'col1', brunoConfig: {} })
    );
    expect(next.collections[0].environments[0].pathname).toBe('/c/environments/Local.yml');
    expect(next.collections[0].environments[0].uid).toBe('e1');
  });

  it('is a no-op for an unknown collection', () => {
    const state = makeState();
    const next = reducer(state, migrateCollectionToYmlInPlace({ collectionUid: 'nope', brunoConfig: {} }));
    expect(next.collections[0].items[0].pathname).toBe('/c/ping.bru');
    expect(next.collections[0].format).toBe('bru');
  });
});
