import reducer, {
  showMigrateToYmlModal,
  hideMigrateToYmlModal,
  migrationStarted,
  migrationProgressEvent,
  migrationCancelRequested,
  migrationEnded
} from 'providers/ReduxStore/slices/collection-migration';

const COLLECTION = {
  collectionUid: 'col-1',
  collectionPathname: '/collections/demo',
  collectionName: 'demo'
};

const initialState = reducer(undefined, { type: 'init' });

describe('collectionMigration slice', () => {
  it('showMigrateToYmlModal captures the collection identity and enters confirming', () => {
    const state = reducer(initialState, showMigrateToYmlModal(COLLECTION));

    expect(state).toMatchObject({ ...COLLECTION, status: 'confirming' });
  });

  it('showMigrateToYmlModal is ignored while another migration is active', () => {
    let state = reducer(initialState, showMigrateToYmlModal(COLLECTION));
    state = reducer(state, migrationStarted());

    const next = reducer(state, showMigrateToYmlModal({ ...COLLECTION, collectionUid: 'col-2' }));

    expect(next.collectionUid).toBe('col-1');
    expect(next.status).toBe('migrating');
  });

  it('hideMigrateToYmlModal resets only from confirming', () => {
    let state = reducer(initialState, showMigrateToYmlModal(COLLECTION));
    expect(reducer(state, hideMigrateToYmlModal())).toEqual(initialState);

    state = reducer(state, migrationStarted());
    expect(reducer(state, hideMigrateToYmlModal()).status).toBe('migrating');
  });

  it('migrationProgressEvent applies only for the migrating collection', () => {
    let state = reducer(initialState, showMigrateToYmlModal(COLLECTION));
    state = reducer(state, migrationStarted());

    state = reducer(state, migrationProgressEvent({ collectionUid: 'col-1', phase: 'parsing', current: 3, total: 10 }));
    expect(state).toMatchObject({ phase: 'parsing', current: 3, total: 10 });

    const other = reducer(state, migrationProgressEvent({ collectionUid: 'col-2', phase: 'writing', current: 9, total: 9 }));
    expect(other).toMatchObject({ phase: 'parsing', current: 3, total: 10 });
  });

  it('migrationProgressEvent is ignored while idle or confirming', () => {
    const confirming = reducer(initialState, showMigrateToYmlModal(COLLECTION));
    const state = reducer(confirming, migrationProgressEvent({ collectionUid: 'col-1', phase: 'parsing', current: 1, total: 2 }));

    expect(state.phase).toBeNull();
    expect(state.current).toBe(0);
  });

  it('migrationCancelRequested moves migrating to cancelling and keeps receiving progress', () => {
    let state = reducer(initialState, showMigrateToYmlModal(COLLECTION));
    state = reducer(state, migrationStarted());
    state = reducer(state, migrationCancelRequested());
    expect(state.status).toBe('cancelling');

    state = reducer(state, migrationProgressEvent({ collectionUid: 'col-1', phase: 'writing', current: 5, total: 8 }));
    expect(state).toMatchObject({ phase: 'writing', current: 5, total: 8 });

    expect(reducer(initialState, migrationCancelRequested()).status).toBe('idle');
  });

  it('migrationEnded resets to idle from any status', () => {
    let state = reducer(initialState, showMigrateToYmlModal(COLLECTION));
    state = reducer(state, migrationStarted());
    state = reducer(state, migrationProgressEvent({ collectionUid: 'col-1', phase: 'finalizing', current: 8, total: 8 }));

    expect(reducer(state, migrationEnded())).toEqual(initialState);
  });
});
