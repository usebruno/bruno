import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { VirtuosoMockContext } from 'react-virtuoso';
import { ThemeProvider } from 'providers/Theme';
import { callIpc } from 'utils/common/ipc';
import { browseDirectories, openMultipleCollections } from 'providers/ReduxStore/slices/collections/actions';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import appReducer, { updatePreferences } from 'providers/ReduxStore/slices/app';
import openCollectionModalReducer, {
  myComputerCollectionsFound,
  myComputerScanFinished
} from 'providers/ReduxStore/slices/open-collection-modal';
import { openCollectionModal } from 'providers/ReduxStore/slices/open-collection-modal/actions';
import MyComputerPage from './index';

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
jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  browseDirectories: jest.fn(),
  mountCollection: jest.fn(),
  openMultipleCollections: jest.fn()
}));

const START_SCAN = 'renderer:collection-scan:start';
const CANCEL_SCAN = 'renderer:collection-scan:cancel';
const LIST_RECENT_COLLECTIONS = 'datastore:recent_collections:list_recent_collections';
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const location = (kind, path) => ({ id: path, path, kind });

const searchLocations = [
  location('default-location', '/Users/me/collections'),
  location('workspace', '/Users/me/work/team'),
  location('workspace', '/Users/me/work/api'),
  location('user', '/Users/me/shop')
];

const billing = { path: '/Users/me/work/team/billing', name: 'Billing', mtime: Date.now() - 2 * HOUR, locationId: '/Users/me/work/team' };
const payments = { path: '/Users/me/collections/payments', name: 'Payments', mtime: 0, locationId: '/Users/me/collections' };
const openOne = { path: '/Users/me/work/team/open', name: 'Open One', mtime: Date.now() - 3 * DAY, locationId: '/Users/me/work/team' };
const orders = { path: '/Users/me/shop/orders', name: 'Orders', mtime: Date.now() - 3 * DAY, locationId: '/Users/me/shop' };

const recentCollections = [
  { path: '/Users/me/shop/orders', name: 'Orders', usedAt: Date.now() - 5 * MINUTE, lastEvent: 'closed' },
  { path: '/Users/me/work/team/open', name: 'Open One', usedAt: Date.now() - 2 * HOUR, lastEvent: 'opened' }
];

const openCollectionInRedux = { uid: 'collection-1', pathname: '/Users/me/work/team/open', mountStatus: 'mounted', collapsed: false };

const ipcReturns = ({ scan = () => Promise.resolve({ locations: searchLocations }), recents = () => Promise.resolve(recentCollections) } = {}) =>
  callIpc.mockImplementation((channel) => {
    if (channel === START_SCAN) {
      return scan();
    }
    return channel === LIST_RECENT_COLLECTIONS ? recents() : Promise.resolve();
  });

const renderPage = ({ searchWholeComputer = false } = {}) => {
  const dispatchedActions = [];
  const store = configureStore({
    reducer: {
      openCollectionModal: openCollectionModalReducer,
      app: appReducer,
      collections: (state = { collections: [openCollectionInRedux] }) => state,
      workspaces: (state = { workspaces: [{ uid: 'workspace-1', collections: [{ path: openOne.path }] }], activeWorkspaceUid: 'workspace-1' }) => state
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(() => (next) => (action) => {
        dispatchedActions.push(action);
        return next(action);
      })
  });
  if (searchWholeComputer) {
    store.dispatch(updatePreferences({ ...store.getState().app.preferences, openCollection: { searchWholeComputer } }));
  }
  store.dispatch(openCollectionModal('my-computer'));
  render(
    <Provider store={store}>
      <ThemeProvider>
        <VirtuosoMockContext.Provider value={{ viewportHeight: 1000, itemHeight: 49 }}>
          <MyComputerPage />
        </VirtuosoMockContext.Provider>
      </ThemeProvider>
    </Provider>
  );
  return { store, dispatchedActions };
};

const modalState = (store) => store.getState().openCollectionModal;
const currentScanId = (store) => modalState(store).myComputer.scanId;

const findCollections = (store, collections) =>
  act(() => {
    store.dispatch(myComputerCollectionsFound({ scanId: currentScanId(store), collections }));
  });

const finishScan = (store, { locations = searchLocations, error = null } = {}) =>
  act(() => {
    store.dispatch(myComputerScanFinished({
      scanId: currentScanId(store),
      locations: locations.map((searched) => ({ ...searched, status: error ? 'idle' : 'done', found: 0 })),
      error
    }));
  });

const waitForList = () => screen.findByTestId('my-computer-list');
const rows = () => screen.queryAllByTestId('my-computer-row');
const rowNames = () => rows().map((row) => within(row).getByTestId('my-computer-row-name').textContent);
const rowFor = (name) => rows().find((row) => within(row).getByTestId('my-computer-row-name').textContent === name);
const metaFor = (name) => within(rowFor(name)).getByTestId('my-computer-row-meta');

describe('MyComputerPage', () => {
  beforeEach(() => {
    ipcReturns();
    browseDirectories.mockReturnValue(() => Promise.resolve([]));
    openMultipleCollections.mockReturnValue(() => new Promise(() => {}));
  });

  it('shows that it is loading until main says where it searches', () => {
    ipcReturns({ scan: () => new Promise(() => {}), recents: () => new Promise(() => {}) });
    const { store } = renderPage();

    expect(screen.getByTestId('my-computer-loading')).toHaveTextContent('Loading…');
    expect(callIpc).toHaveBeenCalledWith(START_SCAN, { scanId: currentScanId(store) });
    expect(callIpc).toHaveBeenCalledWith(LIST_RECENT_COLLECTIONS);
  });

  it('looks for collections, with the banner showing, until the first ones arrive', async () => {
    renderPage();

    expect(await screen.findByTestId('my-computer-list-empty')).toHaveTextContent('Looking for collections…');
    expect(screen.getByTestId('my-computer-banner')).toBeInTheDocument();
    expect(screen.getByTestId('my-computer-search')).toHaveFocus();
  });

  it('lists what it finds by folder path, with the ones already open greyed out at the bottom', async () => {
    const { store } = renderPage();
    await waitForList();

    findCollections(store, [billing, payments, openOne, orders]);

    expect(rowNames()).toEqual(['Payments', 'Orders', 'Billing', 'Open One']);
    expect(rowFor('Open One')).toHaveClass('is-open');
    expect(rowFor('Billing')).not.toHaveClass('is-open');
  });

  it('says when each collection was last opened or closed in Bruno, or else when its folder changed', async () => {
    const { store } = renderPage();
    await waitForList();

    findCollections(store, [billing, payments, openOne, orders]);

    expect(metaFor('Orders')).toHaveTextContent('Closed 5m ago');
    expect(metaFor('Open One')).toHaveTextContent('Opened 2h ago');
    expect(metaFor('Billing')).toHaveTextContent('Modified 2h ago');
    expect(metaFor('Payments')).toBeEmptyDOMElement();
  });

  it('counts the collections found so far in the search box', async () => {
    const { store } = renderPage();
    await waitForList();

    findCollections(store, [billing]);
    expect(screen.getByTestId('my-computer-search')).toHaveAttribute('placeholder', 'Search 1 collection');

    findCollections(store, [payments, openOne]);
    expect(screen.getByTestId('my-computer-search')).toHaveAttribute('placeholder', 'Search 3 collections');
    expect(screen.getByTestId('my-computer-search')).toHaveAccessibleName('Search collections');
  });

  it('finds a collection by its path and explains why one may be missing when nothing matches', async () => {
    const { store } = renderPage();
    await waitForList();
    findCollections(store, [billing, payments, orders]);
    const search = (text) => fireEvent.change(screen.getByTestId('my-computer-search'), { target: { value: text } });

    search('shop');
    expect(rowNames()).toEqual(['Orders']);

    search('payroll');
    const noMatch = screen.getByTestId('my-computer-no-match');
    expect(noMatch).toHaveTextContent('No collection matches “payroll”');
    expect(noMatch).toHaveTextContent('Bruno may not search the folder it lives in. Choose its folder to open it, or add the folder to your search locations.');

    await act(async () => {
      fireEvent.click(screen.getByTestId('my-computer-no-match-choose-folder'));
    });
    expect(modalState(store).page).toBe('choose-folder');
    expect(browseDirectories).toHaveBeenCalledTimes(1);
  });

  it('explains a search that found nothing and offers the other ways to open a collection', async () => {
    const { store } = renderPage();
    await waitForList();

    finishScan(store);

    const emptyState = screen.getByTestId('my-computer-empty');
    expect(emptyState).toHaveTextContent('No collections found on this computer');
    expect(emptyState).toHaveTextContent('Bruno searched 3 locations. Open a collection folder from anywhere, or add more places to search.');
    expect(emptyState).toHaveTextContent('Have a .yml, .zip or a Postman export? Import it');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open a collection folder…' }));
    });
    expect(modalState(store).page).toBe('choose-folder');
    expect(browseDirectories).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Manage search locations' }));
    expect(modalState(store).page).toBe('locations');

    fireEvent.click(screen.getByRole('button', { name: 'Import it' }));
    expect(modalState(store).page).toBe('import');
  });

  it('says it searched its default locations when it had nowhere else to look', async () => {
    ipcReturns({ scan: () => Promise.resolve({ locations: [] }) });
    const { store } = renderPage();
    await waitForList();

    finishScan(store, { locations: [] });

    expect(screen.getByTestId('my-computer-empty')).toHaveTextContent('Bruno searched its default locations. Open a collection folder from anywhere, or add more places to search.');
  });

  it('puts focus on Open a collection folder when the search ends with nothing found', async () => {
    const { store } = renderPage();
    await waitForList();
    expect(screen.getByTestId('my-computer-search')).toHaveFocus();

    finishScan(store);

    expect(screen.getByRole('button', { name: 'Open a collection folder…' })).toHaveFocus();
  });

  it('says why the search could not start and searches again from Try again', async () => {
    ipcReturns({ scan: () => Promise.reject(new Error('Error invoking remote method \'renderer:collection-scan:start\': Error: spawn EACCES')) });
    const { store } = renderPage();

    const failure = await screen.findByTestId('my-computer-error');
    expect(failure).toHaveTextContent('Collection discovery isn’t available');
    expect(failure).toHaveTextContent('spawn EACCES');
    expect(failure).not.toHaveTextContent('Error invoking remote method');
    expect(within(failure).getByRole('button', { name: 'Open a collection folder…' })).toBeInTheDocument();
    const failedScanId = currentScanId(store);

    ipcReturns();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByTestId('my-computer-list-empty')).toHaveTextContent('Looking for collections…');
    expect(currentScanId(store)).not.toBe(failedScanId);
    expect(callIpc).toHaveBeenLastCalledWith(START_SCAN, { scanId: currentScanId(store) });
  });

  it('keeps the collections it found when the search fails later', async () => {
    const { store } = renderPage();
    await waitForList();
    findCollections(store, [billing]);

    finishScan(store, { error: 'The collection scan stopped unexpectedly.' });

    expect(screen.queryByTestId('my-computer-error')).not.toBeInTheDocument();
    expect(rowNames()).toEqual(['Billing']);
  });

  it('leaves the banner out when it already searches the whole computer', async () => {
    renderPage({ searchWholeComputer: true });

    expect(await screen.findByTestId('my-computer-list-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('my-computer-banner')).not.toBeInTheDocument();
  });

  it('opens Locations from the banner', async () => {
    const { store } = renderPage();
    await waitForList();

    fireEvent.click(screen.getByRole('button', { name: 'Manage locations' }));

    expect(modalState(store).page).toBe('locations');
  });

  it('opens the ticked collections and has them recorded in Recents', async () => {
    const { store } = renderPage();
    await waitForList();
    findCollections(store, [billing, payments, openOne, orders]);

    fireEvent.click(rowFor('Billing'));
    fireEvent.click(rowFor('Payments'));
    fireEvent.click(screen.getByTestId('my-computer-open-selected'));

    expect(openMultipleCollections).toHaveBeenCalledWith([payments.path, billing.path], { silent: true, recordRecent: true });
  });

  it('switches to a collection that is already open, closing the modal and stopping the search', async () => {
    const { store, dispatchedActions } = renderPage();
    await waitForList();
    findCollections(store, [billing, openOne]);
    const scanId = currentScanId(store);

    fireEvent.click(within(rowFor('Open One')).getByRole('button', { name: 'Switch to Open One' }));

    expect(openMultipleCollections).not.toHaveBeenCalled();
    expect(dispatchedActions).toContainEqual(addTab({ uid: 'collection-1', collectionUid: 'collection-1', type: 'collection-settings' }));
    expect(modalState(store).isOpen).toBe(false);
    expect(callIpc).toHaveBeenCalledWith(CANCEL_SCAN, { scanId });
  });

  it('closes from Cancel, stopping the search', async () => {
    const { store } = renderPage();
    await waitForList();
    findCollections(store, [billing]);
    const scanId = currentScanId(store);

    fireEvent.click(rowFor('Billing'));
    fireEvent.click(screen.getByTestId('my-computer-cancel'));

    expect(modalState(store).isOpen).toBe(false);
    expect(callIpc).toHaveBeenCalledWith(CANCEL_SCAN, { scanId });
  });
});
