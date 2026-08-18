import reducer, { brunoConfigUpdateEvent, collectionLoadedFromTree } from 'providers/ReduxStore/slices/collections';

const COLLECTION_UID = 'col-1';

const makeState = (format) => ({
  collections: [
    {
      uid: COLLECTION_UID,
      pathname: '/coll',
      format,
      items: [],
      environments: [],
      brunoConfig: format === 'yml' ? { opencollection: '1.0.0', name: 'demo' } : { version: '1', name: 'demo' }
    }
  ]
});

describe('collection format derivation from disk config', () => {
  it('brunoConfigUpdateEvent flips format to yml when opencollection appears', () => {
    const state = reducer(
      makeState('bru'),
      brunoConfigUpdateEvent({ collectionUid: COLLECTION_UID, brunoConfig: { opencollection: '1.0.0', name: 'demo' } })
    );

    expect(state.collections[0].format).toBe('yml');
  });

  it('brunoConfigUpdateEvent drops a stale yml format when the disk config is bru again', () => {
    // migrate-to-yml followed by a git revert: bruno.json is back, format must follow
    const state = reducer(
      makeState('yml'),
      brunoConfigUpdateEvent({ collectionUid: COLLECTION_UID, brunoConfig: { version: '1', name: 'demo' } })
    );

    expect(state.collections[0].format).toBe('bru');
  });

  it('brunoConfigUpdateEvent adopts the yaml layout the main process detected', () => {
    // `opencollection` alone can't distinguish `.yml` from `.yaml`; the renderer must take the
    // detected layout, because it decides the extension of every file it asks main to create.
    const state = reducer(
      makeState('bru'),
      brunoConfigUpdateEvent({
        collectionUid: COLLECTION_UID,
        brunoConfig: { opencollection: '1.0.0', name: 'demo', format: 'yaml' }
      })
    );

    expect(state.collections[0].format).toBe('yaml');
  });

  it('brunoConfigUpdateEvent follows the detected layout back to yml', () => {
    // A `.yaml` root renamed to `.yml` on disk must not leave a stale `yaml` format behind.
    const state = reducer(
      makeState('yml'),
      brunoConfigUpdateEvent({
        collectionUid: COLLECTION_UID,
        brunoConfig: { opencollection: '1.0.0', name: 'demo', format: 'yml' }
      })
    );

    expect(state.collections[0].format).toBe('yml');
  });

  it('collectionLoadedFromTree adopts the detected yaml layout', () => {
    const state = reducer(
      makeState('bru'),
      collectionLoadedFromTree({
        collectionUid: COLLECTION_UID,
        tree: { items: [], brunoConfig: { opencollection: '1.0.0', name: 'demo', format: 'yaml' } }
      })
    );

    expect(state.collections[0].format).toBe('yaml');
  });

  it('collectionLoadedFromTree derives format from the tree brunoConfig', () => {
    const state = reducer(
      makeState('bru'),
      collectionLoadedFromTree({
        collectionUid: COLLECTION_UID,
        tree: { items: [], brunoConfig: { opencollection: '1.0.0', name: 'demo' } }
      })
    );

    expect(state.collections[0].format).toBe('yml');
  });
});
