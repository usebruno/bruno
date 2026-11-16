import reducer, {
  showOpenCollectionModal,
  showOpenCollectionPage,
  importLoadStarted,
  importLoadEnded,
  hideOpenCollectionModal,
  folderPickStarted,
  folderSearchStarted,
  folderSearchFinished,
  folderPickEnded,
  folderNoteDismissed,
  folderResultAddedToSearch,
  folderResultCleared,
  collectionsOpeningStarted,
  collectionsOpeningEnded,
  recentsLoadStarted,
  recentsLoadFinished,
  recentsLoadFailed,
  myComputerScanStarted,
  myComputerLocationsReceived,
  myComputerCollectionsFound,
  myComputerScanFinished,
  myComputerScanFailed
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
      importLoadId: null,
      chooseFolder: { status: 'idle', searchId: null, searchLabel: null, result: null },
      recents: { status: 'idle', loadId: null, items: [], error: null },
      myComputer: { status: 'idle', scanId: null, locations: null, collections: [], previousCollections: [], error: null }
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

  describe('folderResultAddedToSearch', () => {
    const found = [
      folderSearchStarted({ searchId: 'search-1', searchLabel: 'work' }),
      folderSearchFinished({ searchId: 'search-1', result: listResult })
    ];
    const addedText = 'Bruno now also searches work. Its collections show up in My computer too.';

    it('swaps the note of that result and marks its folders as added', () => {
      const added = applyActions([...found, folderResultAddedToSearch({ resultId: 'search-1', text: addedText })]);

      expect(added.chooseFolder.result).toEqual({ ...listResult, note: { tone: 'info', text: addedText }, addedToSearch: true });
    });

    it('leaves a newer result alone, and does nothing without a result', () => {
      const newer = applyActions(found);

      expect(reducer(newer, folderResultAddedToSearch({ resultId: 'search-0', text: addedText }))).toBe(newer);
      expect(reducer(initialState, folderResultAddedToSearch({ resultId: 'search-1', text: addedText }))).toBe(initialState);
    });

    it('keeps a note the user dismissed in the meantime dismissed', () => {
      const dismissed = applyActions([...found, folderNoteDismissed()]);

      expect(reducer(dismissed, folderResultAddedToSearch({ resultId: 'search-1', text: addedText }))).toBe(dismissed);
    });
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

  describe('importLoadId', () => {
    const importLoadId = (actions) => applyActions([showOpenCollectionModal('import'), ...actions]).importLoadId;

    it('tracks the load that is running', () => {
      expect(importLoadId([importLoadStarted('load-1')])).toBe('load-1');
      expect(importLoadId([importLoadStarted('load-1'), importLoadEnded()])).toBeNull();
    });

    it('forgets the load when the page changes but not when the same page is shown again', () => {
      const loading = [importLoadStarted('load-1')];

      expect(importLoadId([...loading, showOpenCollectionPage('import')])).toBe('load-1');
      expect(importLoadId([...loading, showOpenCollectionPage('recents')])).toBeNull();
    });
  });

  describe('recents', () => {
    const items = [{ path: '/work/api', name: 'API', usedAt: 1700000000000, lastEvent: 'closed' }];
    const recents = (actions) => applyActions([showOpenCollectionModal('recents'), ...actions]).recents;
    const loaded = [recentsLoadStarted('load-1'), recentsLoadFinished({ loadId: 'load-1', items })];
    const failed = [recentsLoadStarted('load-1'), recentsLoadFailed({ loadId: 'load-1', error: 'disk failure' })];

    it('shows the first load as loading, then keeps the collections it read', () => {
      expect(recents([recentsLoadStarted('load-1')])).toEqual({ status: 'loading', loadId: 'load-1', items: [], error: null });
      expect(recents(loaded)).toEqual({ status: 'ready', loadId: null, items, error: null });
    });

    it('keeps showing the last answer while it loads again', () => {
      expect(recents([...loaded, recentsLoadStarted('load-2')])).toEqual({ status: 'ready', loadId: 'load-2', items, error: null });
      expect(recents([...failed, recentsLoadStarted('load-2')])).toEqual({ status: 'error', loadId: 'load-2', items: [], error: 'disk failure' });
    });

    it('keeps why a load failed until a later load succeeds', () => {
      expect(recents(failed)).toEqual({ status: 'error', loadId: null, items: [], error: 'disk failure' });
      expect(recents([...failed, recentsLoadStarted('load-2'), recentsLoadFinished({ loadId: 'load-2', items })]))
        .toEqual({ status: 'ready', loadId: null, items, error: null });
    });

    it('ignores the answer of a load that is no longer the current one', () => {
      const reloading = applyActions([recentsLoadStarted('load-1'), recentsLoadStarted('load-2')]);

      expect(reducer(reloading, recentsLoadFinished({ loadId: 'load-1', items }))).toBe(reloading);
      expect(reducer(reloading, recentsLoadFailed({ loadId: 'load-1', error: 'disk failure' }))).toBe(reloading);
    });

    it('forgets the collections when the modal closes', () => {
      expect(reducer(applyActions(loaded), hideOpenCollectionModal()).recents).toEqual(initialState.recents);
    });
  });

  describe('myComputer', () => {
    const workLocation = { id: '/work', path: '/work', kind: 'user' };
    const shopLocation = { id: '/shop', path: '/shop', kind: 'default-location' };
    const withStatus = (status, found = 0) => (location) => ({ ...location, status, found });
    const doneLocations = [withStatus('done', 1)(workLocation), withStatus('done', 1)(shopLocation)];

    const api = { path: '/work/api', name: 'API', mtime: 1700000000000, locationId: '/work' };
    const orders = { path: '/shop/orders', name: 'Orders', mtime: 1700000001000, locationId: '/shop' };
    const notes = { path: '/elsewhere/notes', name: 'Notes', mtime: 1700000002000, locationId: 'recents' };

    const firstScan = [
      myComputerScanStarted('scan-1'),
      myComputerLocationsReceived({ scanId: 'scan-1', locations: [workLocation, shopLocation] }),
      myComputerCollectionsFound({ scanId: 'scan-1', collections: [api, orders, notes] }),
      myComputerScanFinished({ scanId: 'scan-1', locations: doneLocations, error: null })
    ];
    const secondScanStarted = [...firstScan, myComputerScanStarted('scan-2')];

    const scannedModal = (actions) => applyActions([showOpenCollectionModal('my-computer'), ...actions]);
    const myComputer = (actions) => scannedModal(actions).myComputer;

    it('shows a first scan as scanning with no locations until the main process answers', () => {
      expect(myComputer([myComputerScanStarted('scan-1')])).toEqual({
        status: 'scanning',
        scanId: 'scan-1',
        locations: null,
        collections: [],
        previousCollections: [],
        error: null
      });
    });

    it('marks every location of the answer as scanning', () => {
      const answered = myComputer([
        myComputerScanStarted('scan-1'),
        myComputerLocationsReceived({ scanId: 'scan-1', locations: [workLocation, shopLocation] })
      ]);

      expect(answered.locations).toEqual([withStatus('scanning')(workLocation), withStatus('scanning')(shopLocation)]);
    });

    it('keeps the rows and locations on screen when a new scan starts, and starts its own rows empty', () => {
      expect(myComputer(secondScanStarted)).toEqual({
        status: 'scanning',
        scanId: 'scan-2',
        locations: doneLocations,
        collections: [],
        previousCollections: [api, orders, notes],
        error: null
      });
    });

    it('moves the rows of a scan that was restarted midway over the rows on screen', () => {
      const renamedApi = { ...api, name: 'Public API' };
      const restartedMidway = myComputer([
        ...secondScanStarted,
        myComputerCollectionsFound({ scanId: 'scan-2', collections: [renamedApi] }),
        myComputerScanStarted('scan-3')
      ]);

      expect(restartedMidway).toMatchObject({ scanId: 'scan-3', collections: [], previousCollections: [renamedApi, orders, notes] });
    });

    it('drops the rows of a location the new answer no longer has, and keeps Recents rows', () => {
      const withoutShop = myComputer([
        ...secondScanStarted,
        myComputerLocationsReceived({ scanId: 'scan-2', locations: [workLocation] })
      ]);

      expect(withoutShop.previousCollections).toEqual([api, notes]);
      expect(withoutShop.locations).toEqual([withStatus('scanning')(workLocation)]);
    });

    it('ignores the answer of a replaced scan, and an answer that arrives after its scan is done', () => {
      const restarted = scannedModal(secondScanStarted);
      const finishedFirst = scannedModal([
        myComputerScanStarted('scan-1'),
        myComputerScanFinished({ scanId: 'scan-1', locations: doneLocations, error: null })
      ]);

      expect(reducer(restarted, myComputerLocationsReceived({ scanId: 'scan-1', locations: [workLocation] }))).toBe(restarted);
      expect(reducer(finishedFirst, myComputerLocationsReceived({ scanId: 'scan-1', locations: [workLocation] }))).toBe(finishedFirst);
    });

    it('adds found collections in the order they arrive and updates a row with the same path in place', () => {
      const recentApi = { ...api, name: 'api', locationId: 'recents' };
      const scanning = myComputer([
        myComputerScanStarted('scan-1'),
        myComputerCollectionsFound({ scanId: 'scan-1', collections: [recentApi, notes] }),
        myComputerCollectionsFound({ scanId: 'scan-1', collections: [orders, api] })
      ]);

      expect(scanning.collections).toEqual([api, notes, orders]);
    });

    it('ignores collections from a scan that is no longer the current one', () => {
      const restarted = scannedModal(secondScanStarted);

      expect(reducer(restarted, myComputerCollectionsFound({ scanId: 'scan-1', collections: [api] }))).toBe(restarted);
      expect(reducer(initialState, myComputerCollectionsFound({ scanId: 'scan-1', collections: [api] }))).toBe(initialState);
    });

    it('shows the final locations and only the rows of this scan once it is done', () => {
      const finalLocations = [withStatus('done', 1)(workLocation), withStatus('denied')(shopLocation)];
      const done = myComputer([
        ...secondScanStarted,
        myComputerLocationsReceived({ scanId: 'scan-2', locations: [workLocation, shopLocation] }),
        myComputerCollectionsFound({ scanId: 'scan-2', collections: [api] }),
        myComputerScanFinished({ scanId: 'scan-2', locations: finalLocations, error: null })
      ]);

      expect(done).toEqual({
        status: 'done',
        scanId: 'scan-2',
        locations: finalLocations,
        collections: [api],
        previousCollections: [],
        error: null
      });
    });

    it('keeps the rows on screen and says why when the scan ends with an error', () => {
      const idleLocations = [withStatus('idle')(workLocation), withStatus('idle')(shopLocation)];
      const failed = myComputer([
        ...secondScanStarted,
        myComputerCollectionsFound({ scanId: 'scan-2', collections: [api] }),
        myComputerScanFinished({ scanId: 'scan-2', locations: idleLocations, error: 'The collection scan stopped unexpectedly.' })
      ]);

      expect(failed).toEqual({
        status: 'error',
        scanId: 'scan-2',
        locations: idleLocations,
        collections: [api],
        previousCollections: [api, orders, notes],
        error: 'The collection scan stopped unexpectedly.'
      });
    });

    it('ignores the end of a scan that is no longer the current one', () => {
      const restarted = scannedModal(secondScanStarted);

      expect(reducer(restarted, myComputerScanFinished({ scanId: 'scan-1', locations: doneLocations, error: null }))).toBe(restarted);
      expect(reducer(restarted, myComputerScanFailed({ scanId: 'scan-1', error: 'Could not start the scan' }))).toBe(restarted);
    });

    it('keeps what was on screen and says why when a scan cannot start', () => {
      const failedStart = myComputer([...secondScanStarted, myComputerScanFailed({ scanId: 'scan-2', error: 'Could not start the scan' })]);

      expect(failedStart).toEqual({
        status: 'error',
        scanId: 'scan-2',
        locations: doneLocations,
        collections: [],
        previousCollections: [api, orders, notes],
        error: 'Could not start the scan'
      });
    });

    it('clears the error when the next scan starts', () => {
      const retried = myComputer([
        myComputerScanStarted('scan-1'),
        myComputerScanFailed({ scanId: 'scan-1', error: 'Could not start the scan' }),
        myComputerScanStarted('scan-2')
      ]);

      expect(retried).toMatchObject({ status: 'scanning', scanId: 'scan-2', error: null });
    });

    it('forgets the scan when the modal closes', () => {
      expect(reducer(scannedModal(secondScanStarted), hideOpenCollectionModal()).myComputer).toEqual(initialState.myComputer);
    });
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
