import reducer, {
  showOpenCollectionModal,
  showOpenCollectionPage,
  hideOpenCollectionModal,
  folderPickStarted,
  folderSearchStarted,
  folderSearchFinished,
  folderPickEnded,
  folderNoteDismissed,
  folderResultCleared,
  collectionsOpeningStarted,
  collectionsOpeningEnded
} from 'providers/ReduxStore/slices/open-collection-modal';

const initialState = reducer(undefined, { type: 'init' });

const listResult = {
  id: 'search-1',
  type: 'list',
  collections: [{ path: '/work/api', name: 'API' }],
  preselect: [],
  note: { tone: 'info', text: 'Found 1 collection.' }
};

const applyActions = (actions) => actions.reduce(reducer, initialState);

describe('openCollectionModal slice', () => {
  it('starts closed with no page and nothing in progress', () => {
    expect(initialState).toEqual({
      isOpen: false,
      page: null,
      openingId: null,
      chooseFolder: { status: 'idle', searchId: null, searchLabel: null, result: null }
    });
  });

  it('showOpenCollectionModal opens the modal on the given page', () => {
    expect(reducer(initialState, showOpenCollectionModal('import'))).toMatchObject({ isOpen: true, page: 'import' });
  });

  it('showOpenCollectionModal switches the page when the modal is already open', () => {
    const open = reducer(initialState, showOpenCollectionModal('choose-folder'));

    expect(reducer(open, showOpenCollectionModal('recents'))).toMatchObject({ isOpen: true, page: 'recents' });
  });

  it('showOpenCollectionPage changes the page', () => {
    const open = reducer(initialState, showOpenCollectionModal('choose-folder'));

    expect(reducer(open, showOpenCollectionPage('my-computer'))).toEqual({ ...open, page: 'my-computer' });
  });

  it('showOpenCollectionPage drops the note and keeps the rest of the result', () => {
    const found = applyActions([
      showOpenCollectionModal('choose-folder'),
      folderSearchStarted({ searchId: 'search-1', searchLabel: 'work' }),
      folderSearchFinished({ searchId: 'search-1', result: listResult })
    ]);

    expect(reducer(found, showOpenCollectionPage('choose-folder')).chooseFolder.result).toEqual({ ...listResult, note: null });
  });

  it('tracks a folder pick and search, then keeps the result', () => {
    const picking = applyActions([folderPickStarted()]);
    expect(picking.chooseFolder.status).toBe('picking');

    const searching = reducer(picking, folderSearchStarted({ searchId: 'search-1', searchLabel: 'work' }));
    expect(searching.chooseFolder).toEqual({ status: 'searching', searchId: 'search-1', searchLabel: 'work', result: null });

    const finished = reducer(searching, folderSearchFinished({ searchId: 'search-1', result: listResult }));
    expect(finished.chooseFolder).toEqual({ status: 'idle', searchId: null, searchLabel: null, result: listResult });
  });

  it('ignores the result of a search that is no longer the current one', () => {
    const searching = applyActions([folderSearchStarted({ searchId: 'search-2', searchLabel: 'work' })]);

    expect(reducer(searching, folderSearchFinished({ searchId: 'search-1', result: listResult }))).toBe(searching);
  });

  it('folderPickEnded stops the pick or search and keeps the last result', () => {
    const searchingAgain = applyActions([
      folderSearchStarted({ searchId: 'search-1', searchLabel: 'work' }),
      folderSearchFinished({ searchId: 'search-1', result: listResult }),
      folderSearchStarted({ searchId: 'search-2', searchLabel: 'docs' })
    ]);

    expect(reducer(searchingAgain, folderPickEnded()).chooseFolder).toEqual({
      status: 'idle',
      searchId: null,
      searchLabel: null,
      result: listResult
    });
  });

  it('folderNoteDismissed drops the note and keeps the rest of the result', () => {
    const found = applyActions([
      folderSearchStarted({ searchId: 'search-1', searchLabel: 'work' }),
      folderSearchFinished({ searchId: 'search-1', result: listResult })
    ]);

    expect(reducer(found, folderNoteDismissed()).chooseFolder.result).toEqual({ ...listResult, note: null });
    expect(reducer(initialState, folderNoteDismissed())).toEqual(initialState);
  });

  it('folderResultCleared drops the result', () => {
    const found = applyActions([
      folderSearchStarted({ searchId: 'search-1', searchLabel: 'work' }),
      folderSearchFinished({ searchId: 'search-1', result: listResult })
    ]);

    expect(reducer(found, folderResultCleared()).chooseFolder.result).toBeNull();
  });

  it('tracks collections being opened by the id of that opening', () => {
    const opening = applyActions([collectionsOpeningStarted('opening-1')]);
    expect(opening.openingId).toBe('opening-1');

    expect(reducer(opening, collectionsOpeningEnded('opening-0'))).toBe(opening);
    expect(reducer(opening, collectionsOpeningEnded('opening-1')).openingId).toBeNull();
  });

  it('hideOpenCollectionModal resets everything so the next open starts fresh', () => {
    const busy = applyActions([
      showOpenCollectionModal('choose-folder'),
      collectionsOpeningStarted('opening-1'),
      folderSearchStarted({ searchId: 'search-1', searchLabel: 'work' })
    ]);

    expect(reducer(busy, hideOpenCollectionModal())).toEqual(initialState);
  });
});
