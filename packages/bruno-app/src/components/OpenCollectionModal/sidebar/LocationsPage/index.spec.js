import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'providers/Theme';
import { callIpc } from 'utils/common/ipc';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';
import appReducer, { updatePreferences } from 'providers/ReduxStore/slices/app';
import openCollectionModalReducer, { myComputerScanStarted } from 'providers/ReduxStore/slices/open-collection-modal';
import LocationsPage from './index';

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
  browseDirectory: jest.fn(),
  mountCollection: jest.fn(),
  openMultipleCollections: jest.fn()
}));

const START_SCAN = 'renderer:collection-scan:start';
const SAVE_SEARCH_FOLDERS = 'renderer:save-search-folders';
const SAVE_SEARCH_WHOLE_COMPUTER = 'renderer:save-search-whole-computer';

const location = (kind, path, fields = {}) => ({ id: path, path, kind, status: 'done', found: 0, ...fields });

const defaultLocation = location('default-location', '/Users/me/collections', { found: 2 });
const documents = location('documents', '/Users/me/Documents/bruno', { found: 1 });
const defaultWorkspace = location('workspace', '/Users/me/Library/Application Support/bruno/default-workspace', { found: 1 });
const teamWorkspace = location('workspace', '/Users/me/work/team', { found: 4 });
const projects = location('user', '/Users/me/projects', { found: 5 });
const archive = location('user', '/Volumes/archive/collections', { status: 'missing' });
const home = location('home', '/Users/me', { found: 9 });
const searchedLocations = [defaultLocation, documents, defaultWorkspace, teamWorkspace, projects, archive, home];

const closedState = openCollectionModalReducer(undefined, { type: 'init' });

const renderPage = ({ locations = searchedLocations, error = null, searchWholeComputer = false } = {}) => {
  const store = configureStore({
    reducer: { openCollectionModal: openCollectionModalReducer, app: appReducer },
    preloadedState: {
      openCollectionModal: {
        ...closedState,
        isOpen: true,
        page: 'locations',
        myComputer: { ...closedState.myComputer, status: 'done', scanId: 'scan-1', locations, error }
      }
    }
  });
  store.dispatch(updatePreferences({
    ...store.getState().app.preferences,
    openCollection: { searchFolders: [projects.path, archive.path], searchWholeComputer }
  }));
  render(
    <Provider store={store}>
      <ThemeProvider>
        <LocationsPage />
      </ThemeProvider>
    </Provider>
  );
  return store;
};

const rows = () => screen.queryAllByTestId('locations-row');
const rowLabels = () => rows().map((row) => within(row).getByTestId('locations-row-label').textContent);
const rowStatuses = () => rows().map((row) => within(row).getByTestId('locations-row-status').textContent);
const rowFor = (text) => rows().find((row) => within(row).getByTestId('locations-row-label').textContent === text);
const wholeComputerSwitch = () => within(screen.getByTestId('locations-search-whole-computer')).getByRole('checkbox');

describe('LocationsPage', () => {
  beforeAll(() => {
    Element.prototype.checkVisibility = () => true;
  });

  afterAll(() => {
    delete Element.prototype.checkVisibility;
  });

  beforeEach(() => {
    callIpc.mockImplementation((channel) => (channel === START_SCAN ? new Promise(() => {}) : Promise.resolve()));
  });

  it('lists where the last search looked, with the workspace folders as one row and the home folder left out', () => {
    renderPage();

    expect(rowLabels()).toEqual([
      'Default collection location',
      'Documents/bruno',
      'All open workspace folders',
      '~/projects',
      '/Volumes/archive/collections'
    ]);
    expect(rowStatuses()).toEqual(['2 found', '1 found', '5 found', '5 found', 'Not found']);
    expect(screen.queryByTestId('locations-empty')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('locations-row-remove').map((button) => button.getAttribute('aria-label'))).toEqual([
      'Stop looking in /Users/me/projects',
      'Stop looking in /Volumes/archive/collections'
    ]);
  });

  it('lists the workspace folders in the group’s tooltip and shows when Bruno cannot read one of them', () => {
    renderPage({ locations: [defaultWorkspace, { ...teamWorkspace, status: 'denied', found: 0 }] });

    const group = rowFor('All open workspace folders');
    expect(within(group).getByTestId('locations-row-label')).toHaveAttribute(
      'title',
      '~/Library/Application Support/bruno/default-workspace\n~/work/team'
    );
    expect(within(group).getByTestId('locations-row-status')).toHaveTextContent('No access');
  });

  it('shows the stored whole computer setting on a switch named by its card', () => {
    renderPage({ searchWholeComputer: true });

    expect(wholeComputerSwitch()).toBeChecked();
    expect(wholeComputerSwitch()).toHaveAccessibleName(/^Search my whole computer/);
  });

  it('saves the whole computer setting, then searches again with every row reading Scanning…', async () => {
    const store = renderPage();
    callIpc.mockImplementation((channel) =>
      Promise.resolve(channel === START_SCAN ? { locations: searchedLocations.map(({ id, path, kind }) => ({ id, path, kind })) } : undefined));
    expect(wholeComputerSwitch()).not.toBeChecked();

    await act(async () => {
      fireEvent.click(screen.getByText('Search my whole computer'));
    });

    expect(callIpc).toHaveBeenCalledWith(SAVE_SEARCH_WHOLE_COMPUTER, true);
    expect(store.getState().app.preferences.openCollection.searchWholeComputer).toBe(true);
    expect(wholeComputerSwitch()).toBeChecked();
    expect(callIpc).toHaveBeenCalledWith(START_SCAN, { scanId: store.getState().openCollectionModal.myComputer.scanId });
    expect(rowStatuses()).toEqual(['Scanning…', 'Scanning…', 'Scanning…', 'Scanning…', 'Scanning…']);
  });

  it('adds the folder picked in the folder picker', async () => {
    browseDirectory.mockReturnValue(() => Promise.resolve('/Users/me/clients'));
    renderPage();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add folder…' }));
    });

    expect(callIpc).toHaveBeenCalledWith(SAVE_SEARCH_FOLDERS, [projects.path, archive.path, '/Users/me/clients']);
  });

  it('adds nothing when the folder picker is cancelled', async () => {
    browseDirectory.mockReturnValue(() => Promise.resolve(false));
    renderPage();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add folder…' }));
    });

    expect(browseDirectory).toHaveBeenCalledTimes(1);
    expect(callIpc).not.toHaveBeenCalledWith(SAVE_SEARCH_FOLDERS, expect.anything());
  });

  it('stops looking in an added folder, saving the others, and moves focus to the next control', async () => {
    renderPage();
    const remove = within(rowFor('~/projects')).getByRole('button', { name: 'Stop looking in /Users/me/projects' });
    remove.focus();

    await act(async () => {
      fireEvent.click(remove);
    });

    expect(callIpc).toHaveBeenCalledWith(SAVE_SEARCH_FOLDERS, [archive.path]);
    expect(screen.getByRole('button', { name: 'Stop looking in /Volumes/archive/collections' })).toHaveFocus();
  });

  it('shows why the last search failed as an alert until the next one starts', () => {
    const store = renderPage({ error: 'The collection scan stopped unexpectedly.' });

    expect(screen.getByRole('alert')).toHaveTextContent('The collection scan stopped unexpectedly.');

    act(() => {
      store.dispatch(myComputerScanStarted('scan-2'));
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says when there is nowhere to search yet and still offers Add folder', () => {
    renderPage({ locations: [home] });

    expect(rows()).toHaveLength(0);
    expect(screen.getByTestId('locations-empty')).toHaveTextContent('No search locations yet.');
    expect(screen.getByRole('button', { name: 'Add folder…' })).toBeInTheDocument();
  });

  it('explains what Bruno skips from an info button that a keyboard and a screen reader can reach', async () => {
    const skipsText = 'Bruno skips hidden folders, dependency caches and network drives.';
    renderPage();
    const info = screen.getByRole('button', { name: 'What Bruno skips' });

    expect(screen.getByRole('heading', { name: 'Search locations' })).toBeInTheDocument();
    expect(info).toHaveAttribute('data-tooltip-content', skipsText);
    expect(info).toHaveAccessibleDescription(skipsText);

    act(() => {
      info.focus();
    });

    expect(info).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent(skipsText);
  });
});
