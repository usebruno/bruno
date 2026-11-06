import reducer, {
  showOpenCollectionModal,
  showOpenCollectionPage,
  hideOpenCollectionModal
} from 'providers/ReduxStore/slices/open-collection-modal';

const initialState = reducer(undefined, { type: 'init' });

describe('openCollectionModal slice', () => {
  it('starts closed with no page', () => {
    expect(initialState).toEqual({ isOpen: false, page: null });
  });

  it('showOpenCollectionModal opens the modal on the given page', () => {
    expect(reducer(initialState, showOpenCollectionModal('import'))).toEqual({ isOpen: true, page: 'import' });
  });

  it('showOpenCollectionModal switches the page when the modal is already open', () => {
    const open = reducer(initialState, showOpenCollectionModal('choose-folder'));

    expect(reducer(open, showOpenCollectionModal('recents'))).toEqual({ isOpen: true, page: 'recents' });
  });

  it('showOpenCollectionPage changes only the page', () => {
    const open = reducer(initialState, showOpenCollectionModal('choose-folder'));

    expect(reducer(open, showOpenCollectionPage('my-computer'))).toEqual({ isOpen: true, page: 'my-computer' });
  });

  it('hideOpenCollectionModal resets the state so the next open starts fresh', () => {
    const open = reducer(initialState, showOpenCollectionModal('recents'));

    expect(reducer(open, hideOpenCollectionModal())).toEqual(initialState);
  });
});
