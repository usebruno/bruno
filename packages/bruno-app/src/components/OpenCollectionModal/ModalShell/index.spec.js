import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'providers/Theme';
import openCollectionModalReducer, {
  hideOpenCollectionModal,
  showOpenCollectionModal
} from 'providers/ReduxStore/slices/open-collection-modal';
import OpenCollectionModal from 'components/OpenCollectionModal';
import ModalShell from './index';

jest.mock('../ChooseFolderPage', () => ({
  __esModule: true,
  default: () => (
    <div>
      <a href="#docs" data-testid="page-link">Docs</a>
      <input type="checkbox" aria-label="Option" data-testid="page-checkbox" />
      <input type="file" hidden />
    </div>
  )
}));

jest.mock('../RecentsPage', () => ({
  __esModule: true,
  default: () => <input aria-label="Search recents" autoFocus />
}));

const createStore = (openCollectionModal = { isOpen: true, page: 'choose-folder' }) =>
  configureStore({
    reducer: { openCollectionModal: openCollectionModalReducer },
    preloadedState: { openCollectionModal }
  });

const renderWithStore = (ui, store) =>
  render(
    <Provider store={store}>
      <ThemeProvider>{ui}</ThemeProvider>
    </Provider>
  );

const renderShell = (page = 'choose-folder') => {
  const store = createStore({ isOpen: true, page });
  renderWithStore(<ModalShell />, store);
  return store;
};

const isOpen = (store) => store.getState().openCollectionModal.isOpen;

describe('ModalShell', () => {
  beforeAll(() => {
    Element.prototype.checkVisibility = function () {
      return !this.closest('[hidden]');
    };
  });

  afterAll(() => {
    delete Element.prototype.checkVisibility;
  });

  it('shows the page from the store with its title and description', () => {
    renderShell('recents');

    expect(screen.getByTestId('open-collection-page-title')).toHaveTextContent('Recents');
    expect(screen.getByText('Collections you opened recently, including ones you closed')).toBeInTheDocument();
    expect(screen.getByTestId('open-collection-page-recents')).toBeInTheDocument();
  });

  it('falls back to the first page for an unknown page id', () => {
    renderShell('unknown');

    expect(screen.getByTestId('open-collection-page-title')).toHaveTextContent('Choose folder');
    expect(screen.getByTestId('open-collection-menu-item-choose-folder')).toHaveAttribute('aria-current', 'page');
  });

  it('is a modal dialog labelled by its heading', () => {
    renderShell();

    expect(screen.getByRole('dialog', { name: 'Open collection' })).toHaveAttribute('aria-modal', 'true');
  });

  it('closes from the Close button', () => {
    const store = renderShell();

    fireEvent.click(screen.getByTestId('open-collection-close'));

    expect(isOpen(store)).toBe(false);
  });

  it('closes when the backdrop is clicked', () => {
    const store = renderShell();

    fireEvent.click(screen.getByTestId('open-collection-backdrop'));

    expect(isOpen(store)).toBe(false);
  });

  it('closes on Escape', () => {
    const store = renderShell();

    fireEvent.keyDown(screen.getByTestId('open-collection-menu-item-choose-folder'), { key: 'Escape' });

    expect(isOpen(store)).toBe(false);
  });

  it('closes on Escape when focus has left the dialog', () => {
    const store = renderShell();

    fireEvent.keyDown(document.body, { key: 'Escape' });

    expect(isOpen(store)).toBe(false);
  });

  it('stays open when an inner control already handled Escape', () => {
    const store = renderShell();
    const item = screen.getByTestId('open-collection-menu-item-choose-folder');
    item.addEventListener('keydown', (event) => event.preventDefault());

    fireEvent.keyDown(item, { key: 'Escape' });

    expect(isOpen(store)).toBe(true);
  });

  it('focuses the active menu item when it opens', () => {
    renderShell('import');

    expect(screen.getByTestId('open-collection-menu-item-import')).toHaveFocus();
  });

  it('wraps Tab from the last tabbable element to the first, skipping hidden ones', () => {
    renderShell();
    const checkbox = screen.getByTestId('page-checkbox');
    checkbox.focus();

    fireEvent.keyDown(checkbox, { key: 'Tab' });

    expect(screen.getByTestId('open-collection-menu-item-choose-folder')).toHaveFocus();
  });

  it('wraps Shift+Tab from the first tabbable element to the last', () => {
    renderShell();
    const first = screen.getByTestId('open-collection-menu-item-choose-folder');
    first.focus();

    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });

    expect(screen.getByTestId('page-checkbox')).toHaveFocus();
  });

  it('lets Tab move between elements in the middle of the dialog', () => {
    renderShell();
    const link = screen.getByTestId('page-link');
    link.focus();

    const event = fireEvent.keyDown(link, { key: 'Tab' });

    expect(event).toBe(true);
    expect(link).toHaveFocus();
  });

  it('moves Tab from the dialog itself to its first tabbable element', () => {
    renderShell();
    const dialog = screen.getByTestId('open-collection-modal');
    dialog.focus();

    fireEvent.keyDown(dialog, { key: 'Tab' });

    expect(screen.getByTestId('open-collection-menu-item-choose-folder')).toHaveFocus();
  });

  it('moves Shift+Tab from the dialog itself to its last tabbable element', () => {
    renderShell();
    const dialog = screen.getByTestId('open-collection-modal');
    dialog.focus();

    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });

    expect(screen.getByTestId('page-checkbox')).toHaveFocus();
  });

  it('brings Tab back into the dialog when focus has left it', () => {
    renderShell();
    document.activeElement.blur();

    fireEvent.keyDown(document.body, { key: 'Tab' });

    expect(screen.getByTestId('open-collection-menu-item-choose-folder')).toHaveFocus();
  });

  it('leaves Tab and Escape to another dialog that has focus', () => {
    const store = createStore();
    renderWithStore(
      <>
        <ModalShell />
        <button type="button" data-testid="other-dialog-button">Other</button>
      </>,
      store
    );
    const otherButton = screen.getByTestId('other-dialog-button');
    otherButton.focus();

    expect(fireEvent.keyDown(otherButton, { key: 'Tab' })).toBe(true);
    expect(fireEvent.keyDown(otherButton, { key: 'Escape' })).toBe(true);
    expect(otherButton).toHaveFocus();
    expect(isOpen(store)).toBe(true);
  });

  it('returns focus to the element that opened it', () => {
    const store = createStore({ isOpen: false, page: null });
    renderWithStore(
      <>
        <button type="button" data-testid="opener">Open</button>
        <OpenCollectionModal />
      </>,
      store
    );
    const opener = screen.getByTestId('opener');
    opener.focus();

    act(() => {
      store.dispatch(showOpenCollectionModal('choose-folder'));
    });
    expect(opener).not.toHaveFocus();

    act(() => {
      store.dispatch(hideOpenCollectionModal());
    });
    expect(screen.queryByTestId('open-collection-modal')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('returns focus to the opener when the page focuses its own control on open', () => {
    const store = createStore({ isOpen: false, page: null });
    renderWithStore(
      <>
        <button type="button" data-testid="opener">Open</button>
        <OpenCollectionModal />
      </>,
      store
    );
    const opener = screen.getByTestId('opener');
    opener.focus();

    act(() => {
      store.dispatch(showOpenCollectionModal('recents'));
    });
    act(() => {
      store.dispatch(hideOpenCollectionModal());
    });

    expect(opener).toHaveFocus();
  });

  it('stops handling keys once it is closed', () => {
    const store = createStore({ isOpen: true, page: 'choose-folder' });
    renderWithStore(<OpenCollectionModal />, store);

    act(() => {
      store.dispatch(hideOpenCollectionModal());
    });
    act(() => {
      store.dispatch(showOpenCollectionModal('recents'));
    });
    act(() => {
      store.dispatch(hideOpenCollectionModal());
    });
    const event = fireEvent.keyDown(document.body, { key: 'Escape' });

    expect(event).toBe(true);
  });
});
