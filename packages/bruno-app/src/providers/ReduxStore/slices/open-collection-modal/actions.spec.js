import { configureStore } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';
import { callIpc } from 'utils/common/ipc';
import { browseDirectories, browseDirectory, mountCollection, openMultipleCollections } from 'providers/ReduxStore/slices/collections/actions';
import { updatePreferences } from 'providers/ReduxStore/slices/app';
import { expandCollection } from 'providers/ReduxStore/slices/collections';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { DEFAULT_OPEN_COLLECTION_PAGE, OPEN_COLLECTION_PAGE, OPEN_COLLECTION_SUB_PAGE } from 'utils/common/constants';
import openCollectionModalReducer, {
  showOpenCollectionModal,
  myComputerScanStarted,
  myComputerLocationsReceived,
  myComputerScanFinished
} from './index';
import { readImportableFile, readImportFiles, readImportText } from './import-sources';
import {
  addFolderResultToSearch,
  addSearchFolders,
  cancelCollectionSearch,
  closeOpenCollectionModal,
  findCollectionsInFolders,
  loadImportableFile,
  loadImportFiles,
  loadImportText,
  loadRecentCollections,
  openCollectionModal,
  openCollectionModalOnLastPage,
  openCollectionsFromModal,
  openDroppedItems,
  pickCollectionFolders,
  pickSearchFolder,
  recentCollectionsChangedEvent,
  removeSearchFolder,
  saveSearchWholeComputer,
  scanMyComputer,
  switchToCollection
} from './actions';

jest.mock('nanoid', () => {
  let count = 0;
  return { customAlphabet: () => () => `mock-id-${(count += 1)}` };
});
jest.mock('react-hot-toast', () => {
  const mockToast = jest.fn();
  mockToast.success = jest.fn();
  mockToast.error = jest.fn();
  return { __esModule: true, default: mockToast };
});
jest.mock('utils/common/ipc', () => ({ callIpc: jest.fn() }));
jest.mock('./import-sources', () => ({
  readImportFiles: jest.fn(),
  readImportText: jest.fn(),
  readImportableFile: jest.fn()
}));
jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  browseDirectories: jest.fn(),
  browseDirectory: jest.fn(),
  mountCollection: jest.fn(),
  openMultipleCollections: jest.fn()
}));

const FIND_IN_FOLDERS = 'renderer:collection-search:find-in-folders';
const CANCEL_SEARCH = 'renderer:collection-search:cancel';
const LIST_RECENT_COLLECTIONS = 'datastore:recent_collections:list_recent_collections';
const START_SCAN = 'renderer:collection-scan:start';
const CANCEL_SCAN = 'renderer:collection-scan:cancel';
const SAVE_SEARCH_FOLDERS = 'renderer:save-search-folders';
const SAVE_SEARCH_WHOLE_COMPUTER = 'renderer:save-search-whole-computer';

const workspace = { uid: 'workspace-1', collections: [{ path: '/work/open' }, { path: '/work/open-too' }] };
const openCollectionInRedux = {
  uid: 'collection-1',
  pathname: '/work/open',
  collapsed: true,
  mountStatus: 'unmounted',
  brunoConfig: { name: 'Open One' }
};
const otherOpenCollectionInRedux = {
  uid: 'collection-2',
  pathname: '/work/open-too',
  collapsed: false,
  mountStatus: 'mounted',
  brunoConfig: { name: 'Open Too' }
};

const closedModal = openCollectionModalReducer(undefined, { type: 'init' });

const listResult = {
  id: 'search-0',
  type: 'list',
  collections: [{ path: '/work/api', name: 'API' }],
  preselect: [],
  note: { tone: 'info', text: 'Found 1 collection.' }
};

const folderResult = (folders, collections) => ({
  folders,
  collections,
  unreadableFolderCount: 0,
  stoppedEarly: false
});

const pickedCollection = folderResult(
  [{ path: '/work/api', status: 'collection', collectionPaths: ['/work/api'], importableFiles: [] }],
  [{ path: '/work/api', name: 'API' }]
);

const createStore = ({ preferences = {}, modal = closedModal, collections = [openCollectionInRedux, otherOpenCollectionInRedux] } = {}) => {
  const dispatchedActions = [];
  const store = configureStore({
    reducer: {
      openCollectionModal: openCollectionModalReducer,
      app: (state = { preferences }, action) =>
        (action.type === updatePreferences.type ? { ...state, preferences: action.payload } : state),
      collections: (state = { collections }) => state,
      workspaces: (state = { workspaces: [workspace], activeWorkspaceUid: workspace.uid }) => state
    },
    preloadedState: { openCollectionModal: modal },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(() => (next) => (action) => {
        dispatchedActions.push(action);
        return next(action);
      })
  });
  return { store, dispatchedActions };
};

const openOn = (page, chooseFolder = closedModal.chooseFolder) => ({ ...closedModal, isOpen: true, page, chooseFolder });

const modalState = (store) => store.getState().openCollectionModal;

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

const pickerReturns = (result) => browseDirectories.mockReturnValue(() => result);

const searchReturns = (result) =>
  callIpc.mockImplementation((channel) => (channel === FIND_IN_FOLDERS ? result : Promise.resolve()));

const droppedFile = { name: 'openapi.yaml' };
const importData = { rawData: { openapi: '3.0.0' }, type: 'openapi' };

const openingReturns = (result) => openMultipleCollections.mockReturnValue(() => result);

const workLocation = { id: '/work', path: '/work', kind: 'user' };
const shopLocation = { id: '/shop', path: '/shop', kind: 'user' };

const scanningOnMyComputer = [
  myComputerScanStarted('scan-0'),
  myComputerLocationsReceived({ scanId: 'scan-0', locations: [workLocation] })
].reduce(openCollectionModalReducer, openOn(OPEN_COLLECTION_PAGE.MY_COMPUTER));

const scannedOnMyComputer = openCollectionModalReducer(
  scanningOnMyComputer,
  myComputerScanFinished({ scanId: 'scan-0', locations: [{ ...workLocation, status: 'done', found: 0 }], error: null })
);

const scanFailedOnMyComputer = openCollectionModalReducer(
  scanningOnMyComputer,
  myComputerScanFinished({ scanId: 'scan-0', locations: [{ ...workLocation, status: 'done', found: 0 }], error: 'The collection scan stopped unexpectedly.' })
);

const scanReturns = (result) =>
  callIpc.mockImplementation((channel) => (channel === START_SCAN ? result : Promise.resolve()));

const callsTo = (channel) => callIpc.mock.calls.filter(([calledChannel]) => calledChannel === channel);

describe('open collection modal actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    callIpc.mockResolvedValue(undefined);
    mountCollection.mockImplementation((payload) => ({ type: 'test/mountCollection', payload }));
  });

  describe('openCollectionModal', () => {
    it('opens on Choose folder without the folder picker', () => {
      const { store } = createStore();

      store.dispatch(openCollectionModal(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER));

      expect(modalState(store)).toMatchObject({ isOpen: true, page: OPEN_COLLECTION_PAGE.CHOOSE_FOLDER });
      expect(browseDirectories).not.toHaveBeenCalled();
    });

    it('opens on Choose folder and opens the folder picker when asked to pick folders', async () => {
      pickerReturns(Promise.resolve([]));
      const { store } = createStore();

      store.dispatch(openCollectionModal(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER, { pickFolders: true }));
      await flushPromises();

      expect(modalState(store)).toMatchObject({ isOpen: true, page: OPEN_COLLECTION_PAGE.CHOOSE_FOLDER });
      expect(browseDirectories).toHaveBeenCalledTimes(1);
    });

    it('opens other pages without the folder picker', () => {
      const { store } = createStore();

      store.dispatch(openCollectionModal(OPEN_COLLECTION_PAGE.RECENTS, { pickFolders: true }));

      expect(modalState(store)).toMatchObject({ isOpen: true, page: OPEN_COLLECTION_PAGE.RECENTS });
      expect(browseDirectories).not.toHaveBeenCalled();
    });

    it('keeps the found collections when Choose folder is shown again', () => {
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.RECENTS, { ...closedModal.chooseFolder, result: listResult }) });

      store.dispatch(openCollectionModal(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER));

      expect(modalState(store).page).toBe(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER);
      expect(modalState(store).chooseFolder.result).toEqual({ ...listResult, note: null });
      expect(browseDirectories).not.toHaveBeenCalled();
    });

    it('opens the folder picker over the found collections and keeps them when the pick is cancelled', async () => {
      pickerReturns(Promise.resolve([]));
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.RECENTS, { ...closedModal.chooseFolder, result: listResult }) });

      store.dispatch(openCollectionModal(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER, { pickFolders: true }));
      await flushPromises();

      expect(browseDirectories).toHaveBeenCalledTimes(1);
      expect(modalState(store).chooseFolder).toMatchObject({ status: 'idle', result: { ...listResult, note: null } });
    });

    it('leaves the folder picker closed while collections are opening', () => {
      const chooseFolder = { ...closedModal.chooseFolder, result: listResult };
      const { store } = createStore({ modal: { ...openOn(OPEN_COLLECTION_PAGE.RECENTS, chooseFolder), openingId: 'opening-1' } });

      store.dispatch(openCollectionModal(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER, { pickFolders: true }));

      expect(modalState(store).page).toBe(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER);
      expect(browseDirectories).not.toHaveBeenCalled();
    });

    it('drops the note of an earlier message when Choose folder is shown again', () => {
      const messageResult = { id: 'search-0', type: 'message', note: { tone: 'info', text: 'notes isn’t a Bruno collection.' } };
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.RECENTS, { ...closedModal.chooseFolder, result: messageResult }) });

      store.dispatch(openCollectionModal(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER));

      expect(modalState(store).chooseFolder.result).toEqual({ ...messageResult, note: null });
      expect(browseDirectories).not.toHaveBeenCalled();
    });
  });

  describe('openCollectionModalOnLastPage', () => {
    const showPagesAndClose = (...pages) => {
      const { store } = createStore();
      pages.forEach((page) => store.dispatch(openCollectionModal(page)));
      store.dispatch(closeOpenCollectionModal());
      jest.clearAllMocks();
      return store;
    };

    it('opens on the default page the first time, without the folder picker', () => {
      const { store } = createStore();

      store.dispatch(openCollectionModalOnLastPage());

      expect(modalState(store)).toMatchObject({ isOpen: true, page: DEFAULT_OPEN_COLLECTION_PAGE });
      expect(browseDirectories).not.toHaveBeenCalled();
    });

    it('opens again on the menu page shown last and loads Recents without the folder picker', () => {
      const store = showPagesAndClose(OPEN_COLLECTION_PAGE.RECENTS);

      store.dispatch(openCollectionModalOnLastPage());

      expect(modalState(store)).toMatchObject({ isOpen: true, page: OPEN_COLLECTION_PAGE.RECENTS });
      expect(callsTo(LIST_RECENT_COLLECTIONS)).toHaveLength(1);
      expect(browseDirectories).not.toHaveBeenCalled();
    });

    it('opens again on My computer, not its Locations sub page, and scans afresh', () => {
      const store = showPagesAndClose(OPEN_COLLECTION_PAGE.MY_COMPUTER, OPEN_COLLECTION_SUB_PAGE.LOCATIONS);

      store.dispatch(openCollectionModalOnLastPage());

      expect(modalState(store).page).toBe(OPEN_COLLECTION_PAGE.MY_COMPUTER);
      expect(callsTo(START_SCAN)).toHaveLength(1);
    });

    it('remembers a menu page reached without the menu, like Import after files are dropped', async () => {
      readImportFiles.mockResolvedValue(importData);
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.RECENTS) });
      await store.dispatch(openDroppedItems({ folderPaths: [], hasFolders: false, files: [droppedFile] }));
      store.dispatch(closeOpenCollectionModal());

      store.dispatch(openCollectionModalOnLastPage());

      expect(modalState(store).page).toBe(OPEN_COLLECTION_PAGE.IMPORT);
    });

    it('starts on the default page again once Bruno restarts', () => {
      showPagesAndClose(OPEN_COLLECTION_PAGE.RECENTS);
      const { store } = createStore();

      store.dispatch(openCollectionModalOnLastPage());

      expect(modalState(store).page).toBe(DEFAULT_OPEN_COLLECTION_PAGE);
    });
  });

  describe('pickCollectionFolders', () => {
    it('opens one folder picker at a time', () => {
      pickerReturns(new Promise(() => {}));
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) });

      store.dispatch(pickCollectionFolders());
      store.dispatch(pickCollectionFolders());

      expect(browseDirectories).toHaveBeenCalledTimes(1);
      expect(modalState(store).chooseFolder.status).toBe('picking');
    });

    it('does not open the folder picker while collections are opening', async () => {
      const { store } = createStore({ modal: { ...openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER), openingId: 'opening-1' } });

      await store.dispatch(pickCollectionFolders());

      expect(browseDirectories).not.toHaveBeenCalled();
      expect(modalState(store).chooseFolder.status).toBe('idle');
    });

    it('keeps what the page showed when the picker is cancelled', async () => {
      pickerReturns(Promise.resolve([]));
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER, { ...closedModal.chooseFolder, result: listResult }) });

      await store.dispatch(pickCollectionFolders());

      expect(modalState(store).chooseFolder).toEqual({ ...closedModal.chooseFolder, result: listResult });
      expect(callIpc).not.toHaveBeenCalled();
    });

    it('shows an error when the folder picker fails', async () => {
      pickerReturns(Promise.reject(new Error('dialog failed')));
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) });

      await store.dispatch(pickCollectionFolders());

      expect(toast.error).toHaveBeenCalledWith('An error occurred while opening the folder picker');
      expect(modalState(store).chooseFolder.status).toBe('idle');
    });

    it('does not search when the modal was closed while the picker was open', async () => {
      const picker = deferred();
      pickerReturns(picker.promise);
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) });

      const pick = store.dispatch(pickCollectionFolders());
      store.dispatch(closeOpenCollectionModal());
      picker.resolve(['/work']);
      await pick;

      expect(callIpc).not.toHaveBeenCalledWith(FIND_IN_FOLDERS, expect.anything());
    });

    it('searches the picked folders', async () => {
      pickerReturns(Promise.resolve(['/work', '/shop']));
      searchReturns(new Promise(() => {}));
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) });

      store.dispatch(pickCollectionFolders());
      await flushPromises();

      expect(callIpc).toHaveBeenCalledWith(FIND_IN_FOLDERS, { requestId: expect.any(String), paths: ['/work', '/shop'] });
      expect(modalState(store).chooseFolder).toMatchObject({ status: 'searching', searchLabel: '2 folders' });
    });
  });

  describe('findCollectionsInFolders', () => {
    it('shows the folder name while it searches one folder', () => {
      searchReturns(new Promise(() => {}));
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) });

      store.dispatch(findCollectionsInFolders(['/work/api']));

      expect(modalState(store).chooseFolder).toMatchObject({ status: 'searching', searchLabel: 'api' });
    });

    it('opens a picked collection and closes the modal', async () => {
      searchReturns(Promise.resolve(pickedCollection));
      openingReturns(Promise.resolve({ opened: ['/work/api'], failed: [], invalid: [] }));
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) });

      await store.dispatch(findCollectionsInFolders(['/work/api']));

      expect(openMultipleCollections).toHaveBeenCalledWith(['/work/api'], { silent: true, recordRecent: true });
      expect(toast.success).toHaveBeenCalledWith('Collection added to workspace');
      expect(modalState(store).isOpen).toBe(false);
    });

    it('says which picked folders were skipped when it opens the rest', async () => {
      searchReturns(Promise.resolve(folderResult(
        [
          { path: '/work/api', status: 'collection', collectionPaths: ['/work/api'], importableFiles: [] },
          { path: '/work/docs', status: 'folder', collectionPaths: [], importableFiles: [] }
        ],
        [{ path: '/work/api', name: 'API' }]
      )));
      openingReturns(Promise.resolve({ opened: ['/work/api'], failed: [], invalid: [] }));
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) });

      await store.dispatch(findCollectionsInFolders(['/work/api', '/work/docs']));

      expect(toast).toHaveBeenCalledWith('docs isn’t a collection, so it was skipped.');
      expect(openMultipleCollections).toHaveBeenCalledWith(['/work/api'], expect.anything());
    });

    it('switches to a picked collection that is already open', async () => {
      searchReturns(Promise.resolve(folderResult(
        [{ path: '/work/open', status: 'collection', collectionPaths: ['/work/open'], importableFiles: [] }],
        [{ path: '/work/open', name: 'Open One' }]
      )));
      const { store, dispatchedActions } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) });

      await store.dispatch(findCollectionsInFolders(['/work/open']));

      expect(openMultipleCollections).not.toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Open One is already open');
      expect(dispatchedActions).toContainEqual(expandCollection('collection-1'));
      expect(dispatchedActions).toContainEqual(addTab({ uid: 'collection-1', collectionUid: 'collection-1', type: 'collection-settings' }));
      expect(modalState(store).isOpen).toBe(false);
    });

    it('closes and says so when every picked collection is already open', async () => {
      searchReturns(Promise.resolve(folderResult(
        [
          { path: '/work/open', status: 'collection', collectionPaths: ['/work/open'], importableFiles: [] },
          { path: '/work/open-too', status: 'collection', collectionPaths: ['/work/open-too'], importableFiles: [] }
        ],
        [{ path: '/work/open', name: 'Open One' }, { path: '/work/open-too', name: 'Open Too' }]
      )));
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) });

      await store.dispatch(findCollectionsInFolders(['/work/open', '/work/open-too']));

      expect(openMultipleCollections).not.toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Those collections are already open');
      expect(modalState(store).isOpen).toBe(false);
    });

    it('goes back to Choose folder when the search ends while another page shows', async () => {
      const search = deferred();
      searchReturns(search.promise);
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) });

      const searching = store.dispatch(findCollectionsInFolders(['/work']));
      store.dispatch(openCollectionModal(OPEN_COLLECTION_PAGE.RECENTS));
      search.resolve(folderResult(
        [{ path: '/work', status: 'folder', collectionPaths: ['/work/api'], importableFiles: [] }],
        [{ path: '/work/api', name: 'API' }]
      ));
      await searching;

      expect(modalState(store).page).toBe(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER);
      expect(modalState(store).chooseFolder.result.note).toEqual({
        tone: 'info',
        text: 'work isn’t a collection itself, but it has 1 collection inside. Pick the ones to open.'
      });
    });

    it('shows the collections found inside a folder', async () => {
      searchReturns(Promise.resolve(folderResult(
        [{ path: '/work', status: 'folder', collectionPaths: ['/work/api', '/work/open'], importableFiles: [] }],
        [{ path: '/work/api', name: 'API' }, { path: '/work/open', name: 'Open One' }]
      )));
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) });

      await store.dispatch(findCollectionsInFolders(['/work']));

      const { status, result } = modalState(store).chooseFolder;
      expect(status).toBe('idle');
      expect(result).toMatchObject({
        id: expect.any(String),
        type: 'list',
        collections: [{ path: '/work/api', name: 'API' }, { path: '/work/open', name: 'Open One' }],
        preselect: []
      });
    });

    it('cancels the search already running when a new one starts', async () => {
      searchReturns(new Promise(() => {}));
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) });

      store.dispatch(findCollectionsInFolders(['/work']));
      const { searchId } = modalState(store).chooseFolder;
      store.dispatch(findCollectionsInFolders(['/shop']));

      expect(callIpc).toHaveBeenCalledWith(CANCEL_SEARCH, { requestId: searchId });
      expect(modalState(store).chooseFolder.searchId).not.toBe(searchId);
    });

    it('ignores the result of a search that was cancelled', async () => {
      const search = deferred();
      searchReturns(search.promise);
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) });

      const searching = store.dispatch(findCollectionsInFolders(['/work']));
      const { searchId } = modalState(store).chooseFolder;
      store.dispatch(cancelCollectionSearch());
      search.resolve(pickedCollection);
      await searching;

      expect(callIpc).toHaveBeenCalledWith(CANCEL_SEARCH, { requestId: searchId });
      expect(modalState(store).chooseFolder).toEqual(closedModal.chooseFolder);
      expect(openMultipleCollections).not.toHaveBeenCalled();
    });

    it('cancels the search in the main process when the modal closes', () => {
      searchReturns(new Promise(() => {}));
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) });

      store.dispatch(findCollectionsInFolders(['/work']));
      const { searchId } = modalState(store).chooseFolder;
      store.dispatch(closeOpenCollectionModal());

      expect(callIpc).toHaveBeenCalledWith(CANCEL_SEARCH, { requestId: searchId });
    });

    it('shows an error when the search fails', async () => {
      searchReturns(Promise.reject(new Error('disk failure')));
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) });

      await store.dispatch(findCollectionsInFolders(['/work']));

      expect(toast.error).toHaveBeenCalledWith('Could not inspect that folder');
      expect(modalState(store).chooseFolder.status).toBe('idle');
    });
  });

  describe('loading something to import', () => {
    it('returns what it read and ends the load', async () => {
      readImportFiles.mockResolvedValue(importData);
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.IMPORT) });

      await expect(store.dispatch(loadImportFiles([droppedFile]))).resolves.toEqual(importData);

      expect(modalState(store).importLoadId).toBeNull();
    });

    it('says which picked files were skipped when it loads the rest', async () => {
      const severalFiles = { type: 'multiple', filesData: [{ file: droppedFile, data: importData.rawData, type: 'openapi' }], skippedFileNames: ['notes.json', 'broken.json'] };
      readImportFiles.mockResolvedValue(severalFiles);
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.IMPORT) });

      await expect(store.dispatch(loadImportFiles([droppedFile]))).resolves.toEqual(severalFiles);

      expect(toast).toHaveBeenCalledWith('notes.json, broken.json aren’t valid collections, so they were skipped.');
    });

    it('stays quiet when every picked file can be loaded', async () => {
      readImportFiles.mockResolvedValue({ type: 'multiple', filesData: [{ file: droppedFile, data: importData.rawData, type: 'openapi' }], skippedFileNames: [] });
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.IMPORT) });

      await store.dispatch(loadImportFiles([droppedFile]));

      expect(toast).not.toHaveBeenCalled();
    });

    it('marks the page as loading while it reads', () => {
      readImportText.mockReturnValue(new Promise(() => {}));
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.IMPORT) });

      store.dispatch(loadImportText('https://example.com/spec.yaml'));

      expect(modalState(store).importLoadId).toEqual(expect.any(String));
    });

    it('shows why in a toast when it cannot be read, without the IPC prefix', async () => {
      readImportText.mockRejectedValue(new Error('Error invoking remote method \'renderer:x\': Error: No such file'));
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.IMPORT) });

      await expect(store.dispatch(loadImportText('{}'))).resolves.toBeNull();

      expect(toast.error).toHaveBeenCalledWith('No such file');
      expect(modalState(store).importLoadId).toBeNull();
    });

    it('ignores a read that finishes after the page was left', async () => {
      const reading = deferred();
      readImportText.mockReturnValue(reading.promise);
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.IMPORT) });

      const loading = store.dispatch(loadImportText('https://example.com/spec.yaml'));
      store.dispatch(openCollectionModal(OPEN_COLLECTION_PAGE.RECENTS));
      reading.resolve(importData);

      await expect(loading).resolves.toBeNull();
      expect(modalState(store).importLoadId).toBeNull();
    });

    it('stays quiet about a failed read after the page was left', async () => {
      const reading = deferred();
      readImportText.mockReturnValue(reading.promise);
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.IMPORT) });

      const loading = store.dispatch(loadImportText('https://example.com/spec.yaml'));
      store.dispatch(openCollectionModal(OPEN_COLLECTION_PAGE.RECENTS));
      reading.reject(new Error('Nope'));

      await expect(loading).resolves.toBeNull();
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('cancels a running folder search, which would otherwise take the page away', async () => {
      readImportFiles.mockResolvedValue(importData);
      const chooseFolder = { ...closedModal.chooseFolder, status: 'searching', searchId: 'search-1', searchLabel: 'work' };
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.IMPORT, chooseFolder) });

      await store.dispatch(loadImportFiles([droppedFile]));

      expect(callIpc).toHaveBeenCalledWith(CANCEL_SEARCH, { requestId: 'search-1' });
      expect(modalState(store).chooseFolder).toMatchObject({ status: 'idle', searchId: null });
    });

    it('shows the Import page before reading a file named in a note', async () => {
      readImportableFile.mockResolvedValue(importData);
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) });
      const file = { path: '/work/openapi.yaml', name: 'openapi.yaml', format: 'openapi' };

      await expect(store.dispatch(loadImportableFile(file))).resolves.toEqual(importData);

      expect(readImportableFile).toHaveBeenCalledWith(file);
      expect(modalState(store).page).toBe(OPEN_COLLECTION_PAGE.IMPORT);
    });
  });

  describe('openDroppedItems', () => {
    const plainFolderResult = folderResult(
      [{ path: '/work', status: 'folder', collectionPaths: ['/work/api'], importableFiles: [] }],
      [{ path: '/work/api', name: 'API' }]
    );

    it('goes to Choose folder and searches the dropped folders without the folder picker', async () => {
      searchReturns(Promise.resolve(plainFolderResult));
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.RECENTS) });

      await store.dispatch(openDroppedItems({ folderPaths: ['/work'], hasFolders: true, files: [] }));

      expect(browseDirectories).not.toHaveBeenCalled();
      expect(callIpc).toHaveBeenCalledWith(FIND_IN_FOLDERS, expect.objectContaining({ paths: ['/work'] }));
      expect(modalState(store).page).toBe(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER);
      expect(modalState(store).chooseFolder.result).toMatchObject({ type: 'list', folders: ['/work'] });
    });

    it('says when files dropped with the folders were left out', async () => {
      searchReturns(Promise.resolve(plainFolderResult));
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) });

      await store.dispatch(openDroppedItems({ folderPaths: ['/work'], hasFolders: true, files: [droppedFile, droppedFile] }));

      expect(modalState(store).chooseFolder.result.note.text).toContain('2 dropped files weren’t opened.');
    });

    it('goes to Import and returns what the dropped files hold', async () => {
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) });
      readImportFiles.mockResolvedValue(importData);

      const result = await store.dispatch(openDroppedItems({ folderPaths: [], hasFolders: false, files: [droppedFile] }));

      expect(result).toEqual(importData);
      expect(readImportFiles).toHaveBeenCalledWith([droppedFile]);
      expect(modalState(store).page).toBe(OPEN_COLLECTION_PAGE.IMPORT);
      expect(callIpc).not.toHaveBeenCalledWith(FIND_IN_FOLDERS, expect.anything());
    });

    it('says when the dropped folders cannot be read', async () => {
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.RECENTS) });

      await store.dispatch(openDroppedItems({ folderPaths: [], hasFolders: true, files: [droppedFile] }));

      expect(toast.error).toHaveBeenCalledWith('Could not read the dropped folders');
      expect(modalState(store).page).toBe(OPEN_COLLECTION_PAGE.RECENTS);
    });

    it('does nothing when the drop held neither folders nor files', async () => {
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.RECENTS) });

      await store.dispatch(openDroppedItems({ folderPaths: [], hasFolders: false, files: [] }));

      expect(modalState(store).page).toBe(OPEN_COLLECTION_PAGE.RECENTS);
    });

    it('ignores a drop while collections are opening', async () => {
      const { store } = createStore({ modal: { ...openOn(OPEN_COLLECTION_PAGE.RECENTS), openingId: 'opening-1' } });

      await store.dispatch(openDroppedItems({ folderPaths: ['/work'], hasFolders: true, files: [] }));

      expect(callIpc).not.toHaveBeenCalledWith(FIND_IN_FOLDERS, expect.anything());
      expect(modalState(store).page).toBe(OPEN_COLLECTION_PAGE.RECENTS);
    });
  });

  describe('openCollectionsFromModal', () => {
    it('keeps the modal open and counts the failures when nothing opened', async () => {
      openingReturns(Promise.resolve({ opened: [], failed: [{ path: '/work/api', error: 'Unable to parse bruno.json' }], invalid: [] }));
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) });

      await store.dispatch(openCollectionsFromModal(['/work/api']));

      expect(toast.error).toHaveBeenCalledWith('Failed to open 1 collection');
      expect(modalState(store)).toMatchObject({ isOpen: true, openingId: null });
    });

    it('reports folders that no longer exist', async () => {
      openingReturns(Promise.resolve({ opened: ['/work/api'], failed: [], invalid: ['/work/gone'] }));
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) });

      await store.dispatch(openCollectionsFromModal(['/work/api', '/work/gone']));

      expect(toast.success).toHaveBeenCalledWith('Collection added to workspace');
      expect(toast.error).toHaveBeenCalledWith('Failed to open 1 collection');
      expect(modalState(store).isOpen).toBe(false);
    });

    it('opens the collections once even when asked twice', () => {
      openingReturns(new Promise(() => {}));
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) });

      store.dispatch(openCollectionsFromModal(['/work/api']));
      store.dispatch(openCollectionsFromModal(['/work/api']));

      expect(openMultipleCollections).toHaveBeenCalledTimes(1);
      expect(modalState(store).openingId).toEqual(expect.any(String));
    });

    it('leaves a modal opened again in the meantime alone', async () => {
      const opening = deferred();
      openingReturns(opening.promise);
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) });

      const result = store.dispatch(openCollectionsFromModal(['/work/api']));
      store.dispatch(closeOpenCollectionModal());
      store.dispatch(showOpenCollectionModal(OPEN_COLLECTION_PAGE.RECENTS));
      opening.resolve({ opened: ['/work/api'], failed: [], invalid: [] });
      await result;

      expect(toast.success).toHaveBeenCalledWith('Collection added to workspace');
      expect(modalState(store)).toMatchObject({ isOpen: true, page: OPEN_COLLECTION_PAGE.RECENTS, openingId: null });
    });

    it('lets an opening from before a close finish without ending the next one', async () => {
      const firstOpening = deferred();
      const secondOpening = deferred();
      openMultipleCollections
        .mockReturnValueOnce(() => firstOpening.promise)
        .mockReturnValueOnce(() => secondOpening.promise);
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) });

      const first = store.dispatch(openCollectionsFromModal(['/work/api']));
      store.dispatch(closeOpenCollectionModal());
      store.dispatch(showOpenCollectionModal(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER));
      store.dispatch(openCollectionsFromModal(['/work/billing']));
      const { openingId } = modalState(store);
      firstOpening.resolve({ opened: [], failed: [{ path: '/work/api', error: 'bad json' }], invalid: [] });
      await first;

      expect(modalState(store)).toMatchObject({ isOpen: true, openingId });
    });

    it('shows an error when opening fails', async () => {
      openingReturns(Promise.reject());
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) });

      await store.dispatch(openCollectionsFromModal(['/work/api']));

      expect(toast.error).toHaveBeenCalledWith('An error occurred while opening the collections');
      expect(modalState(store)).toMatchObject({ isOpen: true, openingId: null });
    });
  });

  describe('My computer scan', () => {
    it.each([
      ['still running', () => [], 'scanning'],
      ['done', (scanId) => [myComputerScanFinished({ scanId, locations: [], error: null })], 'done'],
      ['failed', (scanId) => [myComputerScanFinished({ scanId, locations: [], error: 'The collection scan stopped unexpectedly.' })], 'error']
    ])('starts one scan the first time My computer is shown, and not when it is shown again with the scan %s', async (_, scanEvents, status) => {
      scanReturns(Promise.resolve({ locations: [workLocation] }));
      const { store } = createStore();

      store.dispatch(openCollectionModal(OPEN_COLLECTION_PAGE.MY_COMPUTER));
      await flushPromises();
      const { scanId } = modalState(store).myComputer;
      scanEvents(scanId).forEach((action) => store.dispatch(action));
      store.dispatch(openCollectionModal(OPEN_COLLECTION_PAGE.IMPORT));
      store.dispatch(openCollectionModal(OPEN_COLLECTION_PAGE.MY_COMPUTER));

      expect(callsTo(START_SCAN)).toEqual([[START_SCAN, { scanId }]]);
      expect(modalState(store)).toMatchObject({ page: OPEN_COLLECTION_PAGE.MY_COMPUTER, myComputer: { scanId, status } });
    });

    it('shows the locations the main process starts to scan', async () => {
      scanReturns(Promise.resolve({ locations: [workLocation, shopLocation] }));
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.MY_COMPUTER) });

      await store.dispatch(scanMyComputer());

      expect(modalState(store).myComputer).toMatchObject({
        status: 'scanning',
        locations: [{ ...workLocation, status: 'scanning', found: 0 }, { ...shopLocation, status: 'scanning', found: 0 }],
        error: null
      });
    });

    it.each([null, undefined])('changes nothing when the main process answers %p, because a newer scan or a close took over', async (answer) => {
      scanReturns(Promise.resolve(answer));
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.MY_COMPUTER) });

      const scanning = store.dispatch(scanMyComputer());
      const whileScanning = modalState(store);
      await scanning;

      expect(modalState(store)).toBe(whileScanning);
    });

    it('says why the scan could not start, without the IPC prefix', async () => {
      scanReturns(Promise.reject(new Error('Error invoking remote method \'renderer:collection-scan:start\': Error: The database is unavailable')));
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.MY_COMPUTER) });

      await store.dispatch(scanMyComputer());

      expect(modalState(store).myComputer).toMatchObject({ status: 'error', error: 'The database is unavailable' });
    });

    it('says the scan could not start when the failure has no message', async () => {
      scanReturns(Promise.reject());
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.MY_COMPUTER) });

      await store.dispatch(scanMyComputer());

      expect(modalState(store).myComputer).toMatchObject({ status: 'error', error: 'Could not start the scan' });
    });

    it('keeps the locations of the newer scan when an older start answers last', async () => {
      const olderStart = deferred();
      callIpc.mockReturnValueOnce(olderStart.promise).mockReturnValueOnce(Promise.resolve({ locations: [workLocation] }));
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.MY_COMPUTER) });

      const older = store.dispatch(scanMyComputer());
      await store.dispatch(scanMyComputer());
      olderStart.resolve({ locations: [shopLocation] });
      await older;

      expect(modalState(store).myComputer.locations).toEqual([{ ...workLocation, status: 'scanning', found: 0 }]);
    });

    it('cancels the scan in the main process when the modal closes during it', () => {
      scanReturns(new Promise(() => {}));
      const { store } = createStore();
      store.dispatch(openCollectionModal(OPEN_COLLECTION_PAGE.MY_COMPUTER));
      const { scanId } = modalState(store).myComputer;

      store.dispatch(closeOpenCollectionModal());

      expect(callIpc).toHaveBeenCalledWith(CANCEL_SCAN, { scanId });
      expect(modalState(store)).toEqual({ ...closedModal, lastPage: OPEN_COLLECTION_PAGE.MY_COMPUTER });
    });

    it('leaves a finished scan alone when the modal closes', () => {
      const { store } = createStore({ modal: scannedOnMyComputer });

      store.dispatch(closeOpenCollectionModal());

      expect(callIpc).not.toHaveBeenCalledWith(CANCEL_SCAN, expect.anything());
      expect(modalState(store)).toEqual(closedModal);
    });
  });

  describe('saveSearchWholeComputer', () => {
    it('shows the new setting at once and saves only that setting', async () => {
      const { store } = createStore({
        preferences: { general: { defaultLocation: '/collections' }, openCollection: { searchFolders: ['/work'] } }
      });

      const saving = store.dispatch(saveSearchWholeComputer(true));

      expect(store.getState().app.preferences).toEqual({
        general: { defaultLocation: '/collections' },
        openCollection: { searchFolders: ['/work'], searchWholeComputer: true }
      });
      await expect(saving).resolves.toBe(true);
      expect(callIpc).toHaveBeenCalledWith(SAVE_SEARCH_WHOLE_COMPUTER, true);
    });

    it('does not scan when My computer was not shown in this modal session', async () => {
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) });

      await store.dispatch(saveSearchWholeComputer(true));

      expect(callIpc).not.toHaveBeenCalledWith(START_SCAN, expect.anything());
      expect(modalState(store).myComputer.status).toBe('idle');
    });

    it('puts the setting back, says why and does not scan again when saving fails', async () => {
      callIpc.mockRejectedValue(new Error('Error invoking remote method \'renderer:save-search-whole-computer\': Error: The whole computer search setting must be true or false'));
      const preferences = { openCollection: { searchWholeComputer: false } };
      const { store } = createStore({ preferences, modal: scannedOnMyComputer });

      await expect(store.dispatch(saveSearchWholeComputer(true))).resolves.toBe(false);

      expect(store.getState().app.preferences).toEqual(preferences);
      expect(toast.error).toHaveBeenCalledWith('The whole computer search setting must be true or false');
      expect(callIpc).not.toHaveBeenCalledWith(START_SCAN, expect.anything());
    });

    it('says it could not update whole computer search when the failure has no message', async () => {
      callIpc.mockRejectedValue(new Error());
      const { store } = createStore();

      await store.dispatch(saveSearchWholeComputer(true));

      expect(toast.error).toHaveBeenCalledWith('Could not update whole computer search');
    });

    it('keeps newer preferences when an older save fails', async () => {
      const save = deferred();
      callIpc.mockReturnValue(save.promise);
      const { store } = createStore();

      const saving = store.dispatch(saveSearchWholeComputer(true));
      store.dispatch(updatePreferences({ display: { zoomPercentage: 120 } }));
      save.reject(new Error('disk full'));
      await saving;

      expect(store.getState().app.preferences).toEqual({ display: { zoomPercentage: 120 } });
    });
  });

  describe('search folders', () => {
    const savedFolders = (store) => store.getState().app.preferences.openCollection.searchFolders;

    it('adds only the folders that are not saved yet, after the saved ones', async () => {
      const { store } = createStore({ preferences: { openCollection: { searchFolders: ['/work', '/shop'] } } });

      await expect(store.dispatch(addSearchFolders(['/shop/', '/notes', '/archive']))).resolves.toBe(true);

      expect(callIpc).toHaveBeenCalledWith(SAVE_SEARCH_FOLDERS, ['/work', '/shop', '/notes', '/archive']);
      expect(savedFolders(store)).toEqual(['/work', '/shop', '/notes', '/archive']);
    });

    it('adds the first folder when none is saved yet', async () => {
      const { store } = createStore();

      await store.dispatch(addSearchFolders(['/work']));

      expect(callIpc).toHaveBeenCalledWith(SAVE_SEARCH_FOLDERS, ['/work']);
    });

    it('skips the save when every folder is saved already', async () => {
      const { store } = createStore({ preferences: { openCollection: { searchFolders: ['/work'] } } });

      await expect(store.dispatch(addSearchFolders(['/work/']))).resolves.toBe(true);

      expect(callIpc).not.toHaveBeenCalled();
    });

    it('sends the whole list each time, so two quick adds keep both folders', async () => {
      const { store } = createStore();

      await Promise.all([store.dispatch(addSearchFolders(['/work'])), store.dispatch(addSearchFolders(['/shop']))]);

      expect(callsTo(SAVE_SEARCH_FOLDERS)).toEqual([[SAVE_SEARCH_FOLDERS, ['/work']], [SAVE_SEARCH_FOLDERS, ['/work', '/shop']]]);
    });

    it('removes the saved folder with the same path key', async () => {
      const { store } = createStore({ preferences: { openCollection: { searchFolders: ['/work', '/shop'] } } });

      await expect(store.dispatch(removeSearchFolder('/work/'))).resolves.toBe(true);

      expect(callIpc).toHaveBeenCalledWith(SAVE_SEARCH_FOLDERS, ['/shop']);
      expect(savedFolders(store)).toEqual(['/shop']);
    });

    it('skips the save when the folder to remove is not saved', async () => {
      const { store } = createStore({ preferences: { openCollection: { searchFolders: ['/work'] } } });

      await expect(store.dispatch(removeSearchFolder('/shop'))).resolves.toBe(true);

      expect(callIpc).not.toHaveBeenCalled();
    });

    it.each([
      ['adding', () => addSearchFolders(['/shop']), 'Could not add that folder'],
      ['removing', () => removeSearchFolder('/work'), 'Could not remove that folder']
    ])('puts the folders back and says so when %s a folder fails', async (_, saveFolders, text) => {
      callIpc.mockRejectedValue(new Error());
      const preferences = { openCollection: { searchFolders: ['/work'] } };
      const { store } = createStore({ preferences });

      await expect(store.dispatch(saveFolders())).resolves.toBe(false);

      expect(store.getState().app.preferences).toEqual(preferences);
      expect(toast.error).toHaveBeenCalledWith(text);
    });
  });

  describe('overlapping search setting saves', () => {
    const preferences = { openCollection: { searchFolders: ['/work'], searchWholeComputer: false } };

    const savesReturn = (wholeComputerSave, foldersSave) =>
      callIpc.mockImplementation((channel) => (channel === SAVE_SEARCH_WHOLE_COMPUTER ? wholeComputerSave : foldersSave));

    it('keeps a folder change that saved while putting back the whole computer search whose save failed', async () => {
      const wholeComputerSave = deferred();
      const foldersSave = deferred();
      savesReturn(wholeComputerSave.promise, foldersSave.promise);
      const { store } = createStore({ preferences });

      const savingWholeComputer = store.dispatch(saveSearchWholeComputer(true));
      const savingFolders = store.dispatch(removeSearchFolder('/work'));
      wholeComputerSave.reject(new Error('disk full'));
      await savingWholeComputer;
      foldersSave.resolve();
      await savingFolders;

      expect(store.getState().app.preferences).toEqual({ openCollection: { searchFolders: [], searchWholeComputer: false } });
    });

    it('puts back both the whole computer search and a folder change when both saves fail', async () => {
      const wholeComputerSave = deferred();
      const foldersSave = deferred();
      savesReturn(wholeComputerSave.promise, foldersSave.promise);
      const { store } = createStore({ preferences });

      const savingWholeComputer = store.dispatch(saveSearchWholeComputer(true));
      const savingFolders = store.dispatch(removeSearchFolder('/work'));
      wholeComputerSave.reject(new Error('disk full'));
      await savingWholeComputer;
      foldersSave.reject(new Error('disk full'));
      await savingFolders;

      expect(store.getState().app.preferences).toEqual(preferences);
    });

    it('keeps the whole computer search on when an older save of it fails after newer saves of it', async () => {
      const saves = [deferred(), deferred(), deferred()];
      saves.forEach((save) => callIpc.mockReturnValueOnce(save.promise));
      const { store } = createStore({ preferences });

      const savings = [true, false, true].map((enabled) => store.dispatch(saveSearchWholeComputer(enabled)));
      saves[0].reject(new Error('disk full'));
      await savings[0];
      saves[1].resolve();
      saves[2].resolve();
      await Promise.all(savings);

      expect(store.getState().app.preferences).toEqual({ openCollection: { searchFolders: ['/work'], searchWholeComputer: true } });
    });
  });

  describe.each([
    ['still running', scanningOnMyComputer],
    ['done', scannedOnMyComputer],
    ['failed', scanFailedOnMyComputer]
  ])('scanning again after a search setting is saved with the scan %s', (_, modal) => {
    it.each([
      ['the whole computer search', () => saveSearchWholeComputer(true), SAVE_SEARCH_WHOLE_COMPUTER],
      ['an added folder', () => addSearchFolders(['/shop']), SAVE_SEARCH_FOLDERS],
      ['a removed folder', () => removeSearchFolder('/work'), SAVE_SEARCH_FOLDERS]
    ])('scans again once %s is saved when My computer was shown in this modal session', async (_, saveSetting, saveChannel) => {
      const save = deferred();
      callIpc.mockImplementation((channel) => (channel === saveChannel ? save.promise : new Promise(() => {})));
      const { store } = createStore({ preferences: { openCollection: { searchFolders: ['/work'] } }, modal });

      const saving = store.dispatch(saveSetting());
      expect(callIpc).not.toHaveBeenCalledWith(START_SCAN, expect.anything());
      save.resolve();
      await saving;

      expect(callsTo(START_SCAN)).toEqual([[START_SCAN, { scanId: modalState(store).myComputer.scanId }]]);
      expect(modalState(store).myComputer.status).toBe('scanning');
      expect(modalState(store).myComputer.scanId).not.toBe('scan-0');
    });
  });

  describe('pickSearchFolder', () => {
    const folderPickerReturns = (result) => browseDirectory.mockReturnValue(() => result);

    it('adds the picked folder to the search locations', async () => {
      folderPickerReturns(Promise.resolve('/work'));
      const { store } = createStore();

      await store.dispatch(pickSearchFolder());

      expect(callIpc).toHaveBeenCalledWith(SAVE_SEARCH_FOLDERS, ['/work']);
    });

    it('does nothing when the picker is cancelled', async () => {
      folderPickerReturns(Promise.resolve(false));
      const { store } = createStore();

      await store.dispatch(pickSearchFolder());

      expect(callIpc).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });

    it.each([
      [new Error('Error invoking remote method \'renderer:browse-directory\': Error: dialog failed'), 'dialog failed'],
      [new Error(), 'Could not add that folder']
    ])('says so when the folder picker fails with %p', async (error, text) => {
      folderPickerReturns(Promise.reject(error));
      const { store } = createStore();

      await store.dispatch(pickSearchFolder());

      expect(toast.error).toHaveBeenCalledWith(text);
      expect(callIpc).not.toHaveBeenCalled();
    });
  });

  describe('addFolderResultToSearch', () => {
    const foundInFolders = { ...listResult, folders: ['/work', '/shop/clients'] };
    const showingFoundInFolders = openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER, { ...closedModal.chooseFolder, result: foundInFolders });

    it('adds the folders of the result to the search locations and says so in the note', async () => {
      const { store } = createStore({ modal: showingFoundInFolders });

      await store.dispatch(addFolderResultToSearch());

      expect(callIpc).toHaveBeenCalledWith(SAVE_SEARCH_FOLDERS, ['/work', '/shop/clients']);
      expect(modalState(store).chooseFolder.result).toEqual({
        ...foundInFolders,
        note: { tone: 'info', text: 'Bruno now also searches work, clients. Its collections show up in My computer too.' },
        addedToSearch: true
      });
    });

    it('says so too when the folders were search locations already', async () => {
      const { store } = createStore({
        preferences: { openCollection: { searchFolders: ['/work', '/shop/clients'] } },
        modal: showingFoundInFolders
      });

      await store.dispatch(addFolderResultToSearch());

      expect(callIpc).not.toHaveBeenCalled();
      expect(modalState(store).chooseFolder.result).toMatchObject({ addedToSearch: true });
    });

    it('keeps the note and its action when adding fails', async () => {
      callIpc.mockRejectedValue(new Error('disk full'));
      const { store } = createStore({ modal: showingFoundInFolders });

      await store.dispatch(addFolderResultToSearch());

      expect(modalState(store).chooseFolder.result).toEqual(foundInFolders);
      expect(toast.error).toHaveBeenCalledWith('disk full');
    });

    it('does not scan when My computer was not shown in this modal session', async () => {
      const { store } = createStore({ modal: showingFoundInFolders });

      await store.dispatch(addFolderResultToSearch());

      expect(callIpc).not.toHaveBeenCalledWith(START_SCAN, expect.anything());
      expect(modalState(store).myComputer.status).toBe('idle');
    });
  });

  describe('switchToCollection', () => {
    it('mounts and expands the collection, shows its settings and closes the modal', () => {
      const { store, dispatchedActions } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) });

      store.dispatch(switchToCollection('/work/open'));

      expect(mountCollection).toHaveBeenCalledWith({
        collectionUid: 'collection-1',
        collectionPathname: '/work/open',
        brunoConfig: { name: 'Open One' }
      });
      expect(dispatchedActions).toContainEqual(expandCollection('collection-1'));
      expect(dispatchedActions).toContainEqual(addTab({ uid: 'collection-1', collectionUid: 'collection-1', type: 'collection-settings' }));
      expect(modalState(store).isOpen).toBe(false);
    });

    it('leaves a mounted, expanded collection as it is', () => {
      const { store, dispatchedActions } = createStore({
        modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER),
        collections: [{ ...openCollectionInRedux, collapsed: false, mountStatus: 'mounted' }]
      });

      store.dispatch(switchToCollection('/work/open'));

      expect(mountCollection).not.toHaveBeenCalled();
      expect(dispatchedActions).toContainEqual(addTab({ uid: 'collection-1', collectionUid: 'collection-1', type: 'collection-settings' }));
    });

    it('closes the modal when the collection was closed in the meantime', () => {
      const { store, dispatchedActions } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER), collections: [] });

      store.dispatch(switchToCollection('/work/open'));

      expect(dispatchedActions.some((action) => action.type === addTab.type)).toBe(false);
      expect(modalState(store).isOpen).toBe(false);
    });
  });

  describe('recent collections', () => {
    const recentItems = [
      { path: '/work/billing', name: 'Billing', usedAt: 1700000002000, lastEvent: 'closed' },
      { path: '/work/api', name: 'API', usedAt: 1700000001000, lastEvent: 'opened' }
    ];

    const recentsReturn = (result) =>
      callIpc.mockImplementation((channel) => (channel === LIST_RECENT_COLLECTIONS ? result : Promise.resolve()));

    it('reads them from the main process', async () => {
      recentsReturn(Promise.resolve(recentItems));
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.RECENTS) });

      await store.dispatch(loadRecentCollections());

      expect(callIpc).toHaveBeenCalledWith(LIST_RECENT_COLLECTIONS);
      expect(modalState(store).recents).toEqual({ status: 'ready', loadId: null, items: recentItems, error: null });
    });

    it('keeps the last ones on screen while it reads them again', async () => {
      recentsReturn(Promise.resolve(recentItems));
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.RECENTS) });
      await store.dispatch(loadRecentCollections());
      const reading = deferred();
      recentsReturn(reading.promise);

      const loading = store.dispatch(loadRecentCollections());
      expect(modalState(store).recents).toMatchObject({ status: 'ready', items: recentItems });

      reading.resolve([recentItems[1]]);
      await loading;
      expect(modalState(store).recents).toMatchObject({ status: 'ready', items: [recentItems[1]] });
    });

    it('says why they could not be read, without the IPC prefix', async () => {
      recentsReturn(Promise.reject(new Error('Error invoking remote method \'datastore:recent_collections:list_recent_collections\': Error: disk failure')));
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.RECENTS) });

      await store.dispatch(loadRecentCollections());

      expect(modalState(store).recents).toMatchObject({ status: 'error', error: 'disk failure' });
    });

    it('ignores an answer that arrives after the modal was closed and opened again', async () => {
      const reading = deferred();
      recentsReturn(reading.promise);
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.RECENTS) });

      const loading = store.dispatch(loadRecentCollections());
      store.dispatch(closeOpenCollectionModal());
      store.dispatch(showOpenCollectionModal(OPEN_COLLECTION_PAGE.RECENTS));
      reading.resolve(recentItems);
      await loading;

      expect(modalState(store).recents).toEqual(closedModal.recents);
    });

    it('keeps the newest answer when an older read finishes last', async () => {
      const olderRead = deferred();
      const newerRead = deferred();
      callIpc.mockReturnValueOnce(olderRead.promise).mockReturnValueOnce(newerRead.promise);
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.RECENTS) });

      const older = store.dispatch(loadRecentCollections());
      const newer = store.dispatch(loadRecentCollections());
      newerRead.resolve([recentItems[0]]);
      await newer;
      olderRead.resolve(recentItems);
      await older;

      expect(modalState(store).recents.items).toEqual([recentItems[0]]);
    });

    it('reads them when the modal opens on Recents', async () => {
      recentsReturn(Promise.resolve(recentItems));
      const { store } = createStore();

      store.dispatch(openCollectionModal(OPEN_COLLECTION_PAGE.RECENTS));
      await flushPromises();

      expect(callIpc).toHaveBeenCalledWith(LIST_RECENT_COLLECTIONS);
      expect(modalState(store)).toMatchObject({ isOpen: true, page: OPEN_COLLECTION_PAGE.RECENTS, recents: { status: 'ready', items: recentItems } });
    });

    it('reads them when Recents is shown from another page', async () => {
      recentsReturn(Promise.resolve(recentItems));
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.IMPORT) });

      store.dispatch(openCollectionModal(OPEN_COLLECTION_PAGE.RECENTS));
      await flushPromises();

      expect(callIpc).toHaveBeenCalledWith(LIST_RECENT_COLLECTIONS);
      expect(modalState(store)).toMatchObject({ page: OPEN_COLLECTION_PAGE.RECENTS, recents: { status: 'ready', items: recentItems } });
    });

    it.each([OPEN_COLLECTION_PAGE.CHOOSE_FOLDER, OPEN_COLLECTION_PAGE.IMPORT])('leaves them alone when the modal opens on %s', (page) => {
      pickerReturns(new Promise(() => {}));
      const { store } = createStore();

      store.dispatch(openCollectionModal(page));

      expect(callIpc).not.toHaveBeenCalledWith(LIST_RECENT_COLLECTIONS);
      expect(modalState(store).recents).toEqual(closedModal.recents);
    });

    it('reads them the first time My computer is shown, and not when it is shown again', async () => {
      recentsReturn(Promise.resolve(recentItems));
      const { store } = createStore();

      store.dispatch(openCollectionModal(OPEN_COLLECTION_PAGE.MY_COMPUTER));
      await flushPromises();
      store.dispatch(openCollectionModal(OPEN_COLLECTION_PAGE.IMPORT));
      store.dispatch(openCollectionModal(OPEN_COLLECTION_PAGE.MY_COMPUTER));

      expect(callsTo(LIST_RECENT_COLLECTIONS)).toHaveLength(1);
      expect(modalState(store).recents).toMatchObject({ status: 'ready', items: recentItems });
    });

    it('reads them again when they change while the modal is open', async () => {
      recentsReturn(Promise.resolve(recentItems));
      const { store } = createStore({ modal: openOn(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) });

      store.dispatch(recentCollectionsChangedEvent());
      await flushPromises();

      expect(callIpc).toHaveBeenCalledWith(LIST_RECENT_COLLECTIONS);
      expect(modalState(store).recents.items).toEqual(recentItems);
    });

    it('leaves them alone when they change while the modal is closed', () => {
      const { store } = createStore();

      store.dispatch(recentCollectionsChangedEvent());

      expect(callIpc).not.toHaveBeenCalled();
      expect(modalState(store).recents).toEqual(closedModal.recents);
    });
  });
});
