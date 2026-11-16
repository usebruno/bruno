import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'providers/Theme';
import { callIpc } from 'utils/common/ipc';
import openCollectionModalReducer from 'providers/ReduxStore/slices/open-collection-modal';
import MyComputerSubtitle from './index';

jest.mock('nanoid', () => {
  let count = 0;
  return { customAlphabet: () => () => `mock-id-${(count += 1)}` };
});
jest.mock('utils/common/ipc', () => ({ callIpc: jest.fn() }));

const START_SCAN = 'renderer:collection-scan:start';

const location = (kind, path) => ({ id: path, path, kind, status: 'done', found: 0 });

const defaultLocation = location('default-location', '/Users/me/collections');
const searchedLocations = [
  defaultLocation,
  location('workspace', '/Users/me/Library/Application Support/bruno/default-workspace'),
  location('workspace', '/Users/me/work/team'),
  location('user', '/Users/me/projects')
];

const closedState = openCollectionModalReducer(undefined, { type: 'init' });

const renderSubtitle = (myComputer) => {
  const store = configureStore({
    reducer: { openCollectionModal: openCollectionModalReducer },
    preloadedState: {
      openCollectionModal: { ...closedState, isOpen: true, page: 'my-computer', myComputer: { ...closedState.myComputer, scanId: 'scan-1', ...myComputer } }
    }
  });
  const { container } = render(
    <Provider store={store}>
      <ThemeProvider>
        <MyComputerSubtitle />
      </ThemeProvider>
    </Provider>
  );
  return { store, container };
};

const subtitle = () => screen.getByTestId('my-computer-subtitle');
const rescanButton = () => screen.getByRole('button', { name: 'Rescan locations' });

describe('MyComputerSubtitle', () => {
  beforeEach(() => {
    callIpc.mockReturnValue(new Promise(() => {}));
  });

  it('shows nothing until main says where it searches, but keeps its row so the header does not grow', () => {
    const { container } = renderSubtitle({ status: 'scanning', locations: null });

    expect(screen.queryByTestId('my-computer-subtitle')).not.toBeInTheDocument();
    expect(container.firstChild).toBeEmptyDOMElement();
    expect(container.firstChild).toHaveStyle({ minHeight: '1.5rem' });
  });

  it.each([
    ['3 locations, counting the workspace folders as one', searchedLocations, 'Searching 3 locations…'],
    ['a single location', [defaultLocation], 'Searching 1 location…']
  ])('says it is searching %s', (_description, locations, text) => {
    renderSubtitle({ status: 'scanning', locations });

    expect(subtitle()).toHaveTextContent(new RegExp(`^${text}Manage$`));
  });

  it.each([
    ['3 locations, counting the workspace folders as one', searchedLocations, 'Collections Bruno found in 3 search locations ·'],
    ['a single location', [defaultLocation], 'Collections Bruno found in 1 search location ·']
  ])('once the search is done, says it searched %s', (_description, locations, text) => {
    renderSubtitle({ status: 'done', locations });

    expect(subtitle()).toHaveTextContent(new RegExp(`^${text}Manage$`));
  });

  it('announces a new search through the status text it keeps in place', () => {
    renderSubtitle({ status: 'done', locations: searchedLocations });
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/^Collections Bruno found in 3 search locations ·$/);

    fireEvent.click(rescanButton());

    expect(status).toHaveTextContent(/^Searching 3 locations…$/);
  });

  it('opens Locations from Manage', () => {
    const { store } = renderSubtitle({ status: 'done', locations: searchedLocations });

    fireEvent.click(screen.getByRole('button', { name: 'Manage' }));

    expect(store.getState().openCollectionModal.page).toBe('locations');
  });

  it('keeps Rescan in reach while searching, spinning, but ignores it', () => {
    renderSubtitle({ status: 'scanning', locations: searchedLocations });
    const rescan = rescanButton();
    rescan.focus();

    fireEvent.click(rescan);

    expect(rescan).toHaveAttribute('aria-disabled', 'true');
    expect(rescan).not.toBeDisabled();
    expect(rescan).toHaveFocus();
    expect(rescan.querySelector('svg')).toHaveClass('is-spinning');
    expect(callIpc).not.toHaveBeenCalled();
  });

  it('searches again from Rescan once the search is done, keeping focus on it', () => {
    const { store } = renderSubtitle({ status: 'done', locations: searchedLocations });
    const rescan = rescanButton();
    expect(rescan).toHaveAttribute('aria-disabled', 'false');
    expect(rescan.querySelector('svg')).not.toHaveClass('is-spinning');
    rescan.focus();

    fireEvent.click(rescan);

    const { scanId } = store.getState().openCollectionModal.myComputer;
    expect(scanId).not.toBe('scan-1');
    expect(callIpc).toHaveBeenCalledWith(START_SCAN, { scanId });
    expect(subtitle()).toHaveTextContent(/^Searching 3 locations…Manage$/);
    expect(rescan).toHaveAttribute('aria-disabled', 'true');
    expect(rescan).toHaveFocus();
  });
});
