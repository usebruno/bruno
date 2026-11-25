import React from 'react';
import Mousetrap from 'mousetrap';
import { act, createEvent, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'providers/Theme';
import { getKeyBindingOS, getKeyBindingsForActionAllOS } from 'providers/Hotkeys/keyMappings';
import appReducer from 'providers/ReduxStore/slices/app';
import openCollectionModalReducer, {
  collectionsOpeningEnded,
  collectionsOpeningStarted,
  hideOpenCollectionModal,
  showOpenCollectionModal
} from 'providers/ReduxStore/slices/open-collection-modal';
import { openCollectionModal } from 'providers/ReduxStore/slices/open-collection-modal/actions';
import OpenCollectionModal from 'components/OpenCollectionModal';
import { OPEN_COLLECTION_PAGE, OPEN_COLLECTION_SUB_PAGE } from 'utils/common/constants';
import { ImportHandoffContext } from '../ImportHandoff/context';
import ModalShell from './index';

jest.mock('nanoid', () => {
  let count = 0;
  return { customAlphabet: () => () => `mock-id-${(count += 1)}` };
});
jest.mock('../../sidebar/ChooseFolderPage', () => ({
  __esModule: true,
  default: () => (
    <div>
      <a href="#docs" data-testid="page-link">Docs</a>
      <input type="checkbox" aria-label="Option" data-testid="page-checkbox" />
      <input type="file" hidden />
    </div>
  )
}));

jest.mock('../../sidebar/RecentsPage', () => ({
  __esModule: true,
  default: () => <input aria-label="Search recents" autoFocus />
}));

jest.mock('../../sidebar/MyComputerPage', () => ({
  __esModule: true,
  default: () => <input aria-label="Search my computer" data-focus-on-show />
}));

jest.mock('../../sidebar/MyComputerPage/MyComputerSubtitle', () => ({
  __esModule: true,
  default: () => <span data-testid="my-computer-subtitle">Searching 3 locations…</span>
}));

jest.mock('../../sidebar/LocationsPage', () => ({
  __esModule: true,
  default: () => <div data-testid="locations-page">Folders Bruno searches for collections.</div>
}));

const closedState = openCollectionModalReducer(undefined, { type: 'init' });

const createStore = (openCollectionModal = { isOpen: true, page: OPEN_COLLECTION_PAGE.CHOOSE_FOLDER }) =>
  configureStore({
    reducer: { openCollectionModal: openCollectionModalReducer, app: appReducer },
    preloadedState: { openCollectionModal: { ...closedState, ...openCollectionModal } }
  });

const renderWithStore = (ui, store) =>
  render(
    <Provider store={store}>
      <ImportHandoffContext.Provider value={(load) => store.dispatch(load)}>
        <ThemeProvider>{ui}</ThemeProvider>
      </ImportHandoffContext.Provider>
    </Provider>
  );

const renderShell = (page = OPEN_COLLECTION_PAGE.CHOOSE_FOLDER) => {
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
    renderShell(OPEN_COLLECTION_PAGE.RECENTS);

    expect(screen.getByTestId('open-collection-page-title')).toHaveTextContent('Recents');
    expect(screen.getByText('Collections you recently closed or opened')).toBeInTheDocument();
    expect(screen.getByTestId('open-collection-page-recents')).toBeInTheDocument();
  });

  it('falls back to the first page for an unknown page id', () => {
    renderShell('unknown');

    expect(screen.getByTestId('open-collection-page-title')).toHaveTextContent('Choose folder');
    expect(screen.getByTestId('open-collection-menu-item-choose-folder')).toHaveAttribute('aria-current', 'page');
  });

  it('shows a page’s own subtitle in place of a description', () => {
    renderShell(OPEN_COLLECTION_PAGE.MY_COMPUTER);

    const title = screen.getByTestId('open-collection-page-title');
    expect(title).toHaveTextContent('My computer');
    expect(title.parentElement).toContainElement(screen.getByTestId('my-computer-subtitle'));
  });

  it('keeps a page and what was typed in it when you leave and come back, putting focus in its search box', async () => {
    const store = createStore({ isOpen: true, page: OPEN_COLLECTION_PAGE.MY_COMPUTER, myComputer: { ...closedState.myComputer, status: 'done', locations: [] } });
    renderWithStore(<ModalShell />, store);
    const search = screen.getByRole('textbox', { name: 'Search my computer' });
    fireEvent.change(search, { target: { value: 'orders' } });

    fireEvent.click(screen.getByTestId('open-collection-menu-item-recents'));
    expect(search).not.toBeVisible();

    fireEvent.click(screen.getByTestId('open-collection-menu-item-my-computer'));

    expect(search).toBeVisible();
    expect(search).toHaveValue('orders');
    await waitFor(() => expect(search).toHaveFocus());
  });

  describe('Locations, a page under My computer', () => {
    const renderMyComputer = (page = OPEN_COLLECTION_PAGE.MY_COMPUTER) => {
      const store = createStore({ isOpen: true, page, myComputer: { ...closedState.myComputer, status: 'done', locations: [] } });
      renderWithStore(<ModalShell />, store);
      return store;
    };
    const myComputerSearch = () => screen.getByRole('textbox', { name: 'Search my computer', hidden: true });

    it('shows its title with a Back button that takes focus, no description, and My computer marked in the menu', () => {
      const store = renderMyComputer();
      myComputerSearch().focus();

      act(() => {
        store.dispatch(openCollectionModal(OPEN_COLLECTION_SUB_PAGE.LOCATIONS));
      });

      const title = screen.getByTestId('open-collection-page-title');
      expect(title).toHaveTextContent('Locations');
      expect(title.parentElement).toHaveTextContent(/^Locations$/);
      expect(screen.getByTestId('open-collection-back')).toHaveFocus();
      expect(screen.getByTestId('open-collection-menu-item-my-computer')).toHaveAttribute('aria-current', 'page');
      expect(screen.getByTestId('open-collection-page-locations')).toContainElement(screen.getByTestId('locations-page'));
    });

    it('goes back to My computer from Back, keeping what was typed there and putting focus in it', async () => {
      const store = renderMyComputer();
      const search = myComputerSearch();
      fireEvent.change(search, { target: { value: 'orders' } });
      act(() => {
        store.dispatch(openCollectionModal(OPEN_COLLECTION_SUB_PAGE.LOCATIONS));
      });
      expect(search).not.toBeVisible();

      fireEvent.click(screen.getByTestId('open-collection-back'));

      expect(store.getState().openCollectionModal.page).toBe(OPEN_COLLECTION_PAGE.MY_COMPUTER);
      expect(screen.queryByTestId('open-collection-back')).not.toBeInTheDocument();
      await waitFor(() => expect(search).toHaveFocus());
      expect(search).toBeVisible();
      expect(search).toHaveValue('orders');
    });

    it('goes back to My computer from its menu item, leaving focus on the menu', async () => {
      const store = renderMyComputer(OPEN_COLLECTION_SUB_PAGE.LOCATIONS);
      const menuItem = screen.getByTestId('open-collection-menu-item-my-computer');
      menuItem.focus();

      fireEvent.click(menuItem);
      await act(async () => {});

      expect(store.getState().openCollectionModal.page).toBe(OPEN_COLLECTION_PAGE.MY_COMPUTER);
      expect(screen.queryByTestId('locations-page')).not.toBeInTheDocument();
      expect(myComputerSearch()).toBeVisible();
      expect(menuItem).toHaveFocus();
    });

    it('keeps My computer hidden behind another page chosen from Locations', () => {
      renderMyComputer(OPEN_COLLECTION_SUB_PAGE.LOCATIONS);

      fireEvent.click(screen.getByTestId('open-collection-menu-item-recents'));

      expect(screen.getByRole('textbox', { name: 'Search recents' })).toBeVisible();
      expect(screen.queryByTestId('locations-page')).not.toBeInTheDocument();
      expect(myComputerSearch()).not.toBeVisible();
    });
  });

  it('shows that collections are opening over the page and keeps the page out of reach', () => {
    const store = createStore({ isOpen: true, page: OPEN_COLLECTION_PAGE.CHOOSE_FOLDER, openingId: 'opening-1' });
    renderWithStore(<ModalShell />, store);

    const page = screen.getByTestId('open-collection-page-choose-folder');
    expect(within(page).getByTestId('open-collection-busy')).toHaveTextContent('Opening…');
    expect(page.querySelector('.modal-page-content')).toHaveAttribute('inert');
  });

  it('keeps Tab inside the dialog while the page is out of reach', () => {
    const store = createStore({ isOpen: true, page: OPEN_COLLECTION_PAGE.CHOOSE_FOLDER, openingId: 'opening-1' });
    renderWithStore(<ModalShell />, store);
    const close = screen.getByTestId('open-collection-close');
    const firstItem = screen.getByTestId('open-collection-menu-item-recents');
    close.focus();

    fireEvent.keyDown(close, { key: 'Tab' });
    expect(firstItem).toHaveFocus();

    fireEvent.keyDown(firstItem, { key: 'Tab', shiftKey: true });
    expect(close).toHaveFocus();
  });

  it('gives focus back to the page once nothing opened', async () => {
    const store = renderShell();
    const checkbox = screen.getByTestId('page-checkbox');
    checkbox.focus();

    act(() => {
      store.dispatch(collectionsOpeningStarted('opening-1'));
    });
    checkbox.blur();
    act(() => {
      store.dispatch(collectionsOpeningEnded('opening-1'));
    });

    await waitFor(() => expect(checkbox).toHaveFocus());
  });

  describe('dragging over the modal', () => {
    const fileDrag = { types: ['Files'] };
    const dialog = () => screen.getByTestId('open-collection-modal');
    const queryOverlay = () => screen.queryByTestId('open-collection-drop-overlay');
    const dragLeaveTo = (relatedTarget) => {
      const event = createEvent.dragLeave(dialog(), { dataTransfer: fileDrag });
      Object.defineProperty(event, 'relatedTarget', { value: relatedTarget });
      fireEvent(dialog(), event);
    };

    it('shows the drop overlay while files are over it and hides it when they leave', () => {
      renderShell();

      fireEvent.dragEnter(dialog(), { dataTransfer: fileDrag });
      expect(queryOverlay()).toHaveTextContent('Drop to open');

      dragLeaveTo(screen.getByTestId('open-collection-backdrop'));
      expect(queryOverlay()).not.toBeInTheDocument();
    });

    it('hides the overlay when the drag leaves the window', () => {
      renderShell();

      fireEvent.dragEnter(dialog(), { dataTransfer: fileDrag });
      dragLeaveTo(null);

      expect(queryOverlay()).not.toBeInTheDocument();
    });

    it('keeps the overlay while the drag moves between elements inside the modal', () => {
      renderShell();

      fireEvent.dragEnter(dialog(), { dataTransfer: fileDrag });
      fireEvent.dragEnter(screen.getByTestId('page-link'), { dataTransfer: fileDrag });
      dragLeaveTo(screen.getByTestId('page-link'));

      expect(queryOverlay()).toBeInTheDocument();
    });

    it('leaves a dragged link or text to the field under it', () => {
      renderShell();
      const textDrag = { types: ['text/plain'] };

      expect(fireEvent.dragOver(dialog(), { dataTransfer: textDrag })).toBe(true);
      expect(fireEvent.drop(dialog(), { dataTransfer: textDrag })).toBe(true);
    });

    it('ignores a drag that carries no files', () => {
      renderShell();

      fireEvent.dragEnter(dialog(), { dataTransfer: { types: ['text/plain'] } });

      expect(queryOverlay()).not.toBeInTheDocument();
    });

    it('does not offer a drop while collections are opening', () => {
      const store = createStore({ isOpen: true, page: OPEN_COLLECTION_PAGE.CHOOSE_FOLDER, openingId: 'opening-1' });
      renderWithStore(<ModalShell />, store);

      fireEvent.dragEnter(dialog(), { dataTransfer: fileDrag });

      expect(queryOverlay()).not.toBeInTheDocument();
    });

    it('offers the drop once collections finish opening during the drag', () => {
      const store = createStore({ isOpen: true, page: OPEN_COLLECTION_PAGE.CHOOSE_FOLDER, openingId: 'opening-1' });
      renderWithStore(<ModalShell />, store);

      fireEvent.dragEnter(dialog(), { dataTransfer: fileDrag });
      act(() => {
        store.dispatch(collectionsOpeningEnded('opening-1'));
      });

      expect(queryOverlay()).toBeInTheDocument();
    });

    it('hides the overlay on drop and goes to Import when only files were dropped', async () => {
      window.ipcRenderer = { getFilePath: jest.fn(), send: jest.fn() };
      const store = renderShell();
      const file = { name: 'notes.json', text: () => Promise.resolve('{}') };
      const item = { kind: 'file', webkitGetAsEntry: () => ({ isDirectory: false }), getAsFile: () => file };

      fireEvent.dragEnter(dialog(), { dataTransfer: fileDrag });
      fireEvent.drop(dialog(), { dataTransfer: { ...fileDrag, items: [item] } });

      expect(queryOverlay()).not.toBeInTheDocument();
      expect(store.getState().openCollectionModal.page).toBe(OPEN_COLLECTION_PAGE.IMPORT);
      await waitFor(() => expect(store.getState().openCollectionModal.importLoadId).toBeNull());
      delete window.ipcRenderer;
    });
  });

  it('offers to import the file a note names', async () => {
    const importFile = { path: '/work/backup.zip', name: 'backup.zip', format: 'zip' };
    const result = { id: 'search-1', type: 'message', note: { tone: 'info', text: 'Needs importing.', importFile } };
    const store = createStore({ isOpen: true, page: OPEN_COLLECTION_PAGE.CHOOSE_FOLDER, chooseFolder: { ...closedState.chooseFolder, result } });
    renderWithStore(<ModalShell />, store);

    fireEvent.click(screen.getByTestId('open-collection-note-action'));

    expect(store.getState().openCollectionModal.page).toBe(OPEN_COLLECTION_PAGE.IMPORT);
    await waitFor(() => expect(store.getState().openCollectionModal.importLoadId).toBeNull());
  });

  it('leaves the note without an action when it names no file', () => {
    const result = { id: 'search-1', type: 'message', note: { tone: 'info', text: 'Not a collection.' } };
    const store = createStore({ isOpen: true, page: OPEN_COLLECTION_PAGE.CHOOSE_FOLDER, chooseFolder: { ...closedState.chooseFolder, result } });
    renderWithStore(<ModalShell />, store);

    expect(screen.queryByTestId('open-collection-note-action')).not.toBeInTheDocument();
  });

  describe('Add to search locations on the note of a found list', () => {
    const note = { tone: 'info', text: 'work isn’t a collection itself, but it has 2 collections inside. Pick the ones to open.' };
    const renderListNote = (fields) => {
      const result = { id: 'search-1', type: 'list', collections: [], preselect: [], note, ...fields };
      const store = configureStore({
        reducer: { openCollectionModal: openCollectionModalReducer, app: appReducer },
        preloadedState: {
          openCollectionModal: { ...closedState, isOpen: true, page: OPEN_COLLECTION_PAGE.CHOOSE_FOLDER, chooseFolder: { ...closedState.chooseFolder, result } }
        }
      });
      renderWithStore(<ModalShell />, store);
    };

    afterEach(() => {
      delete window.ipcRenderer;
    });

    it('adds the folders the list was found in, says so and keeps focus in the note', async () => {
      window.ipcRenderer = { invoke: jest.fn(() => Promise.resolve()), send: jest.fn() };
      renderListNote({ folders: ['/Users/me/work'] });
      const action = screen.getByTestId('open-collection-note-action');
      expect(action).toHaveTextContent('Add to search locations');
      action.focus();

      await act(async () => {
        fireEvent.click(action);
      });

      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:save-search-folders', ['/Users/me/work']);
      expect(screen.getByTestId('open-collection-note')).toHaveTextContent('Bruno now also searches work. Its collections show up in My computer too.');
      expect(screen.queryByTestId('open-collection-note-action')).not.toBeInTheDocument();
      expect(screen.getByTestId('open-collection-note-dismiss')).toHaveFocus();
    });

    it('ignores another click while the save is pending, keeping the note and its action when that save fails', async () => {
      let failSave;
      window.ipcRenderer = {
        invoke: jest.fn(() => new Promise((_resolve, reject) => {
          failSave = reject;
        })),
        send: jest.fn()
      };
      renderListNote({ folders: ['/Users/me/work'] });
      const action = screen.getByTestId('open-collection-note-action');

      fireEvent.click(action);
      await act(async () => {
        fireEvent.click(action);
      });
      expect(screen.getByTestId('open-collection-note')).toHaveTextContent(note.text);

      await act(async () => {
        failSave(new Error('disk full'));
      });
      expect(screen.getByTestId('open-collection-note')).toHaveTextContent(note.text);

      fireEvent.click(screen.getByTestId('open-collection-note-action'));
      expect(window.ipcRenderer.invoke).toHaveBeenCalledTimes(2);
    });

    it('is not offered when its folders were already added', () => {
      renderListNote({ folders: ['/Users/me/work'], addedToSearch: true });

      expect(screen.getByTestId('open-collection-note')).toHaveTextContent(note.text);
      expect(screen.queryByTestId('open-collection-note-action')).not.toBeInTheDocument();
    });
  });

  it('leaves the page reachable when nothing is opening', () => {
    renderShell();

    const page = screen.getByTestId('open-collection-page-choose-folder');
    expect(page.querySelector('.modal-page-content')).not.toHaveAttribute('inert');
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

  it('stays open while collections are opening', () => {
    const store = createStore({ isOpen: true, page: 'choose-folder', openingId: 'opening-1' });
    renderWithStore(<ModalShell />, store);

    fireEvent.click(screen.getByTestId('open-collection-close'));
    fireEvent.click(screen.getByTestId('open-collection-backdrop'));
    fireEvent.keyDown(document.body, { key: 'Escape' });

    expect(isOpen(store)).toBe(true);
  });

  it('stays open when an inner control already handled Escape', () => {
    const store = renderShell();
    const item = screen.getByTestId('open-collection-menu-item-choose-folder');
    item.addEventListener('keydown', (event) => event.preventDefault());

    fireEvent.keyDown(item, { key: 'Escape' });

    expect(isOpen(store)).toBe(true);
  });

  it('moves focus into the dialog when it opens', () => {
    renderShell(OPEN_COLLECTION_PAGE.IMPORT);

    expect(screen.getByTestId('open-collection-modal')).toHaveFocus();
  });

  it('leaves focus on a page control that took it on open', () => {
    renderShell(OPEN_COLLECTION_PAGE.RECENTS);

    expect(screen.getByRole('textbox', { name: 'Search recents' })).toHaveFocus();
  });

  it('shows the Choose folder note between the header and the page, and dismisses it', () => {
    const note = { tone: 'info', text: 'work isn’t a collection itself, but it has 2 collections inside. Pick the ones to open.' };
    const store = createStore({
      isOpen: true,
      page: OPEN_COLLECTION_PAGE.CHOOSE_FOLDER,
      chooseFolder: { ...closedState.chooseFolder, result: { id: 'search-1', type: 'list', collections: [], preselect: [], note } }
    });
    renderWithStore(<ModalShell />, store);

    const shownNote = screen.getByTestId('open-collection-note');
    expect(shownNote).toHaveTextContent(note.text);
    expect(shownNote.closest('.modal-page')).toBeNull();

    fireEvent.click(screen.getByTestId('open-collection-note-dismiss'));

    expect(screen.queryByTestId('open-collection-note')).not.toBeInTheDocument();
    expect(store.getState().openCollectionModal.chooseFolder.result.note).toBeNull();
  });

  it('moves focus to the page when the focused note is dismissed', () => {
    const store = createStore({
      isOpen: true,
      page: OPEN_COLLECTION_PAGE.CHOOSE_FOLDER,
      chooseFolder: { ...closedState.chooseFolder, result: { id: 'search-1', type: 'message', note: { tone: 'info', text: 'Note' } } }
    });
    renderWithStore(<ModalShell />, store);
    const dismiss = screen.getByTestId('open-collection-note-dismiss');
    dismiss.focus();

    fireEvent.click(dismiss);

    expect(screen.getByTestId('page-link')).toHaveFocus();
  });

  it('wraps Tab from the last tabbable element to the first, skipping hidden ones', () => {
    renderShell();
    const checkbox = screen.getByTestId('page-checkbox');
    checkbox.focus();

    fireEvent.keyDown(checkbox, { key: 'Tab' });

    expect(screen.getByTestId('open-collection-menu-item-recents')).toHaveFocus();
  });

  it('wraps Shift+Tab from the first tabbable element to the last', () => {
    renderShell();
    const first = screen.getByTestId('open-collection-menu-item-recents');
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

    expect(screen.getByTestId('open-collection-menu-item-recents')).toHaveFocus();
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

    expect(screen.getByTestId('open-collection-menu-item-recents')).toHaveFocus();
  });

  it('takes focus back when a control behind it grabs focus', () => {
    const store = createStore();
    renderWithStore(
      <>
        <ModalShell />
        <input data-testid="background-search" aria-label="Search sidebar" />
      </>,
      store
    );
    const menuItem = screen.getByTestId('open-collection-menu-item-choose-folder');
    menuItem.focus();

    screen.getByTestId('background-search').focus();

    expect(menuItem).toHaveFocus();
  });

  it('closes on Escape pressed on a control behind it', () => {
    const store = createStore();
    renderWithStore(
      <>
        <ModalShell />
        <button type="button" data-testid="background-button">Background</button>
      </>,
      store
    );

    fireEvent.keyDown(screen.getByTestId('background-button'), { key: 'Escape' });

    expect(isOpen(store)).toBe(false);
  });

  it('leaves Tab and Escape to another dialog that has focus', () => {
    const store = createStore();
    renderWithStore(
      <>
        <ModalShell />
        <div role="dialog">
          <button type="button" data-testid="other-dialog-button">Other</button>
        </div>
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
      store.dispatch(showOpenCollectionModal(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER));
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
      store.dispatch(showOpenCollectionModal(OPEN_COLLECTION_PAGE.RECENTS));
    });
    act(() => {
      store.dispatch(hideOpenCollectionModal());
    });

    expect(opener).toHaveFocus();
  });

  it('stops handling keys once it is closed', () => {
    const store = createStore({ isOpen: true, page: OPEN_COLLECTION_PAGE.CHOOSE_FOLDER });
    renderWithStore(<OpenCollectionModal />, store);

    act(() => {
      store.dispatch(hideOpenCollectionModal());
    });
    act(() => {
      store.dispatch(showOpenCollectionModal(OPEN_COLLECTION_PAGE.RECENTS));
    });
    act(() => {
      store.dispatch(hideOpenCollectionModal());
    });
    const event = fireEvent.keyDown(document.body, { key: 'Escape' });

    expect(event).toBe(true);
  });

  describe('page shortcuts', () => {
    const initialApp = appReducer(undefined, { type: 'init' });
    const shortcutModifier = getKeyBindingOS() === 'mac' ? { metaKey: true } : { ctrlKey: true };
    const pressO = (element, modifiers) => fireEvent.keyDown(element, { key: 'o', code: 'KeyO', keyCode: 79, which: 79, ...modifiers });
    const currentPage = (store) => store.getState().openCollectionModal.page;

    const renderOnMyComputer = (preferences = {}) => {
      const store = configureStore({
        reducer: { openCollectionModal: openCollectionModalReducer, app: appReducer },
        preloadedState: {
          openCollectionModal: {
            ...closedState,
            isOpen: true,
            page: OPEN_COLLECTION_PAGE.MY_COMPUTER,
            myComputer: { ...closedState.myComputer, status: 'done', locations: [] }
          },
          app: { ...initialApp, preferences: { ...initialApp.preferences, ...preferences } }
        }
      });
      renderWithStore(<ModalShell />, store);
      const search = screen.getByRole('textbox', { name: 'Search my computer', hidden: true });
      search.focus();
      return { store, search };
    };

    it('goes to Choose folder and opens the folder picker when its shortcut is pressed in a search box, putting focus on the page', async () => {
      const { store, search } = renderOnMyComputer();

      pressO(search, { ...shortcutModifier, shiftKey: true });

      expect(currentPage(store)).toBe(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER);
      expect(store.getState().openCollectionModal.chooseFolder.status).toBe('picking');
      await waitFor(() => expect(screen.getByTestId('page-link')).toHaveFocus());
    });

    it('goes to Import when its shortcut is pressed in a search box, putting focus in its text box', async () => {
      const { store, search } = renderOnMyComputer();

      pressO(search, shortcutModifier);

      expect(currentPage(store)).toBe(OPEN_COLLECTION_PAGE.IMPORT);
      await waitFor(() => expect(screen.getByTestId('import-page-text')).toHaveFocus());
    });

    it('leaves a shortcut without Ctrl or Cmd to typing in a search box', () => {
      const { store, search } = renderOnMyComputer({ keyBindings: { openCollection: { mac: 'shift+bind+o', windows: 'shift+bind+o' } } });

      expect(pressO(search, { shiftKey: true })).toBe(true);

      expect(currentPage(store)).toBe(OPEN_COLLECTION_PAGE.MY_COMPUTER);
    });

    it('runs a shortcut without Ctrl or Cmd from a control that is not a text field', () => {
      const { store } = renderOnMyComputer({ keyBindings: { openCollection: { mac: 'shift+bind+o', windows: 'shift+bind+o' } } });

      pressO(screen.getByTestId('open-collection-menu-item-recents'), { shiftKey: true });

      expect(currentPage(store)).toBe(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER);
    });

    it('handles a shortcut once, without passing it on to the app-wide binding', () => {
      const combos = getKeyBindingsForActionAllOS('openCollection');
      const appWideHandler = jest.fn();
      Mousetrap.bind(combos, appWideHandler);
      try {
        const { store } = renderOnMyComputer();

        pressO(screen.getByTestId('open-collection-menu-item-recents'), { ...shortcutModifier, shiftKey: true });

        expect(currentPage(store)).toBe(OPEN_COLLECTION_PAGE.CHOOSE_FOLDER);
        expect(appWideHandler).not.toHaveBeenCalled();
      } finally {
        Mousetrap.unbind(combos);
      }
    });

    it('ignores the shortcuts when keyboard shortcuts are turned off', () => {
      const { store, search } = renderOnMyComputer({ keybindingsEnabled: false });

      pressO(search, { ...shortcutModifier, shiftKey: true });
      pressO(search, shortcutModifier);

      expect(currentPage(store)).toBe(OPEN_COLLECTION_PAGE.MY_COMPUTER);
    });
  });
});
