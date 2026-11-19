import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'providers/Theme';
import { callIpc } from 'utils/common/ipc';
import openCollectionModalReducer from 'providers/ReduxStore/slices/open-collection-modal';
import { OPEN_COLLECTION_PAGE, OPEN_COLLECTION_SUB_PAGE } from 'utils/common/constants';
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
const wholeComputerLocations = [location('home', '/Users/me'), { ...location('computer', '/'), id: 'computer' }];

const closedState = openCollectionModalReducer(undefined, { type: 'init' });

const renderSubtitle = (myComputer) => {
  const store = configureStore({
    reducer: { openCollectionModal: openCollectionModalReducer },
    preloadedState: {
      openCollectionModal: { ...closedState, isOpen: true, page: OPEN_COLLECTION_PAGE.MY_COMPUTER, myComputer: { ...closedState.myComputer, scanId: 'scan-1', ...myComputer } }
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
    ['my computer when the whole computer is searched', [...searchedLocations, ...wholeComputerLocations], 'Searching my computer…'],
    ['a single location', [defaultLocation], 'Searching 1 location…']
  ])('says it is searching %s', (_description, locations, text) => {
    renderSubtitle({ status: 'scanning', locations });

    expect(subtitle()).toHaveTextContent(new RegExp(`^${text}Manage$`));
  });

  it.each([
    ['3 locations, counting the workspace folders as one', searchedLocations, 'Collections found in 3 locations ·'],
    ['this computer when the whole computer was searched', [...searchedLocations, ...wholeComputerLocations], 'Collections found in this computer ·'],
    ['a single location', [defaultLocation], 'Collections found in 1 location ·']
  ])('once the search is done, says it searched %s', (_description, locations, text) => {
    renderSubtitle({ status: 'done', locations });

    expect(subtitle()).toHaveTextContent(new RegExp(`^${text}Manage$`));
  });

  it.each([
    ['its locations', searchedLocations, /^Collections found in 3 locations ·$/, /^Searching 3 locations…$/],
    ['the whole computer', [...searchedLocations, ...wholeComputerLocations], /^Collections found in this computer ·$/, /^Searching my computer…$/]
  ])('announces a new search of %s through the status text it keeps in place', (_description, locations, doneText, scanningText) => {
    renderSubtitle({ status: 'done', locations });
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(doneText);

    fireEvent.click(rescanButton());

    expect(status).toHaveTextContent(scanningText);
  });

  it('says the search did not finish when it stopped with an error, with the reason on hover, and searches again from Rescan', () => {
    const { store } = renderSubtitle({ status: 'error', error: 'The collection scan stopped unexpectedly.', locations: searchedLocations });
    const status = screen.getByRole('status');

    expect(subtitle()).toHaveTextContent(/^Search didn’t finish ·Manage$/);
    expect(status).toHaveAttribute('title', 'The collection scan stopped unexpectedly.');
    expect(rescanButton()).toHaveAttribute('aria-disabled', 'false');

    fireEvent.click(rescanButton());

    expect(callIpc).toHaveBeenCalledWith(START_SCAN, { scanId: store.getState().openCollectionModal.myComputer.scanId });
    expect(status).toHaveTextContent(/^Searching 3 locations…$/);
    expect(status).not.toHaveAttribute('title');
  });

  it('opens Locations from Manage', () => {
    const { store } = renderSubtitle({ status: 'done', locations: searchedLocations });

    fireEvent.click(screen.getByRole('button', { name: 'Manage' }));

    expect(store.getState().openCollectionModal.page).toBe(OPEN_COLLECTION_SUB_PAGE.LOCATIONS);
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
