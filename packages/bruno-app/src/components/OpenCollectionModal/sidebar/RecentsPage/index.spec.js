import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { VirtuosoMockContext } from 'react-virtuoso';
import { ThemeProvider } from 'providers/Theme';
import { callIpc } from 'utils/common/ipc';
import { browseDirectories, openMultipleCollections } from 'providers/ReduxStore/slices/collections/actions';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import appReducer from 'providers/ReduxStore/slices/app';
import openCollectionModalReducer from 'providers/ReduxStore/slices/open-collection-modal';
import { openCollectionModal, recentCollectionsChangedEvent } from 'providers/ReduxStore/slices/open-collection-modal/actions';
import RecentsPage from './index';

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

const GET_RECENT_COLLECTIONS = 'renderer:get-recent-collections';
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const billing = { path: '/Users/me/work/billing', name: 'Billing', usedAt: Date.now() - 5 * MINUTE, lastEvent: 'closed' };
const openOne = { path: '/Users/me/work/open', name: 'Open One', usedAt: Date.now() - 2 * HOUR, lastEvent: 'opened' };
const orders = { path: '/Users/me/shop/orders', name: 'Orders', usedAt: Date.now() - 30 * HOUR, lastEvent: 'opened' };
const recentCollections = [billing, openOne, orders];

const openCollectionInRedux = { uid: 'collection-1', pathname: '/Users/me/work/open', mountStatus: 'mounted', collapsed: false };

const recentsReturn = (result) =>
  callIpc.mockImplementation((channel) => (channel === GET_RECENT_COLLECTIONS ? result : Promise.resolve()));

const renderPage = () => {
  const dispatchedActions = [];
  const store = configureStore({
    reducer: {
      openCollectionModal: openCollectionModalReducer,
      app: appReducer,
      collections: (state = { collections: [openCollectionInRedux] }) => state,
      workspaces: (state = { workspaces: [{ uid: 'workspace-1', collections: [{ path: '/Users/me/work/open' }] }], activeWorkspaceUid: 'workspace-1' }) => state
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(() => (next) => (action) => {
        dispatchedActions.push(action);
        return next(action);
      })
  });
  store.dispatch(openCollectionModal('recents'));
  render(
    <Provider store={store}>
      <ThemeProvider>
        <VirtuosoMockContext.Provider value={{ viewportHeight: 1000, itemHeight: 49 }}>
          <RecentsPage />
        </VirtuosoMockContext.Provider>
      </ThemeProvider>
    </Provider>
  );
  return { store, dispatchedActions };
};

const modalState = (store) => store.getState().openCollectionModal;
const findRows = () => screen.findAllByTestId('recents-row');
const rowNames = () => screen.queryAllByTestId('recents-row').map((row) => within(row).getByTestId('recents-row-name').textContent);
const rowFor = (name) => screen.queryAllByTestId('recents-row').find((row) => within(row).getByTestId('recents-row-name').textContent === name);
const checkboxFor = (name) => within(rowFor(name)).getByLabelText(`Select ${name}`);

describe('RecentsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    recentsReturn(Promise.resolve(recentCollections));
    browseDirectories.mockReturnValue(() => Promise.resolve([]));
    openMultipleCollections.mockReturnValue(() => new Promise(() => {}));
  });

  it('shows that it is loading until the recent collections arrive', () => {
    recentsReturn(new Promise(() => {}));
    renderPage();

    expect(screen.getByTestId('recents-loading')).toHaveTextContent('Loading…');
    expect(callIpc).toHaveBeenCalledWith(GET_RECENT_COLLECTIONS);
  });

  it('lists the newest first, with the ones already open greyed out at the bottom', async () => {
    renderPage();
    await findRows();

    expect(rowNames()).toEqual(['Billing', 'Orders', 'Open One']);
    expect(rowFor('Open One')).toHaveClass('is-open');
    expect(rowFor('Billing')).not.toHaveClass('is-open');
  });

  it('says whether each collection was last opened or closed, and when', async () => {
    renderPage();
    await findRows();

    expect(within(rowFor('Billing')).getByTestId('recents-row-meta')).toHaveTextContent('Closed 5m ago');
    expect(within(rowFor('Open One')).getByTestId('recents-row-meta')).toHaveTextContent('Opened 2h ago');
    expect(within(rowFor('Orders')).getByTestId('recents-row-meta')).toHaveTextContent('Opened yesterday');
  });

  it('puts focus in the search box once the list appears', async () => {
    renderPage();
    await findRows();

    expect(screen.getByTestId('recents-search')).toHaveFocus();
  });

  it('opens the ticked collections and has them recorded in Recents', async () => {
    renderPage();
    await findRows();

    fireEvent.click(rowFor('Billing'));
    fireEvent.click(rowFor('Orders'));
    const openSelected = screen.getByTestId('recents-open-selected');
    expect(openSelected).toHaveTextContent('Open 2 collections');

    fireEvent.click(openSelected);
    expect(openMultipleCollections).toHaveBeenCalledWith(['/Users/me/work/billing', '/Users/me/shop/orders'], { silent: true, recordRecent: true });
  });

  it('opens the focused collection with Enter', async () => {
    renderPage();
    await findRows();

    checkboxFor('Orders').focus();
    fireEvent.keyDown(checkboxFor('Orders'), { key: 'Enter' });

    expect(openMultipleCollections).toHaveBeenCalledWith(['/Users/me/shop/orders'], { silent: true, recordRecent: true });
  });

  it('switches to a collection that is already open instead of opening it again', async () => {
    const { store, dispatchedActions } = renderPage();
    await findRows();

    fireEvent.click(within(rowFor('Open One')).getByTestId('recents-row-switch'));

    expect(openMultipleCollections).not.toHaveBeenCalled();
    expect(dispatchedActions).toContainEqual(addTab({ uid: 'collection-1', collectionUid: 'collection-1', type: 'collection-settings' }));
    expect(modalState(store).isOpen).toBe(false);
  });

  it('shows the greyed rows when every recent collection is already open', async () => {
    recentsReturn(Promise.resolve([openOne]));
    renderPage();
    await findRows();

    expect(rowNames()).toEqual(['Open One']);
    expect(rowFor('Open One')).toHaveClass('is-open');
    expect(screen.queryByTestId('recents-empty')).not.toBeInTheDocument();
  });

  it('finds a collection by its path and offers Choose folder when nothing matches', async () => {
    const { store } = renderPage();
    await findRows();
    const search = (text) => fireEvent.change(screen.getByTestId('recents-search'), { target: { value: text } });

    search('shop');
    expect(rowNames()).toEqual(['Orders']);

    search('  payroll ');
    const noMatch = screen.getByTestId('recents-no-match');
    expect(noMatch).toHaveTextContent('No collection matches “payroll”');
    expect(noMatch).toHaveTextContent('Recents only lists collections you have opened before. If it lives somewhere else, choose its folder.');

    await act(async () => {
      fireEvent.click(screen.getByTestId('recents-no-match-choose-folder'));
    });
    expect(modalState(store).page).toBe('choose-folder');
    expect(browseDirectories).toHaveBeenCalledTimes(1);
  });

  it('explains an empty Recents and offers the other ways to open a collection', async () => {
    recentsReturn(Promise.resolve([]));
    const { store } = renderPage();

    const emptyState = await screen.findByTestId('recents-empty');
    expect(emptyState).toHaveTextContent('No collections opened yet');
    expect(emptyState).toHaveTextContent('Open a Bruno collection folder to work on it in place. Collections you open show up here next time.');
    expect(emptyState).toHaveTextContent('Have a .yml, .zip or a Postman export? Import it');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open a collection folder…' }));
    });
    expect(modalState(store).page).toBe('choose-folder');
    expect(browseDirectories).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Show collections on this computer' }));
    expect(modalState(store).page).toBe('my-computer');

    fireEvent.click(screen.getByRole('button', { name: 'Import it' }));
    expect(modalState(store).page).toBe('import');
  });

  it('says why Recents is not available and lists the collections after trying again', async () => {
    recentsReturn(Promise.reject(new Error('Error invoking remote method \'renderer:get-recent-collections\': Error: disk failure')));
    renderPage();

    const failure = await screen.findByTestId('recents-error');
    expect(failure).toHaveTextContent('Recents isn’t available');
    expect(failure).toHaveTextContent('disk failure');
    expect(within(failure).getByRole('button', { name: 'Open a collection folder…' })).toBeInTheDocument();

    recentsReturn(Promise.resolve(recentCollections));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await findRows();
    expect(rowNames()).toEqual(['Billing', 'Orders', 'Open One']);
  });

  it('puts focus on Open a collection folder when trying again finds no collections', async () => {
    recentsReturn(Promise.reject(new Error('disk failure')));
    renderPage();
    const tryAgain = await screen.findByRole('button', { name: 'Try again' });
    tryAgain.focus();

    recentsReturn(Promise.resolve([]));
    await act(async () => {
      fireEvent.click(tryAgain);
    });

    expect(screen.getByTestId('recents-empty')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open a collection folder…' })).toHaveFocus();
  });

  it('updates the list when the recent collections change and keeps the ticked ones', async () => {
    const { store } = renderPage();
    await findRows();
    fireEvent.click(rowFor('Billing'));

    recentsReturn(Promise.resolve([orders, billing]));
    await act(async () => {
      store.dispatch(recentCollectionsChangedEvent());
    });

    expect(rowNames()).toEqual(['Orders', 'Billing']);
    expect(screen.getByTestId('recents-open-selected')).toHaveTextContent('Open 1 collection');
  });

  it('keeps a collection whose folder is gone until the main process forgets it, then puts focus in the search box', async () => {
    openMultipleCollections.mockReturnValue(() => Promise.resolve({ opened: [], failed: [], invalid: [billing.path] }));
    const { store } = renderPage();
    await findRows();
    checkboxFor('Billing').focus();

    await act(async () => {
      fireEvent.keyDown(checkboxFor('Billing'), { key: 'Enter' });
    });
    expect(modalState(store).isOpen).toBe(true);
    expect(rowNames()).toEqual(['Billing', 'Orders', 'Open One']);

    recentsReturn(Promise.resolve([openOne, orders]));
    await act(async () => {
      store.dispatch(recentCollectionsChangedEvent());
    });

    expect(rowNames()).toEqual(['Orders', 'Open One']);
    expect(screen.getByTestId('recents-search')).toHaveFocus();
  });

  it('puts focus on its first action when the last collection goes away', async () => {
    recentsReturn(Promise.resolve([billing]));
    const { store } = renderPage();
    await findRows();
    checkboxFor('Billing').focus();

    recentsReturn(Promise.resolve([]));
    await act(async () => {
      store.dispatch(recentCollectionsChangedEvent());
    });

    expect(screen.getByRole('button', { name: 'Open a collection folder…' })).toHaveFocus();
  });
});
