import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import toast from 'react-hot-toast';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'providers/Theme';
import appReducer from 'providers/ReduxStore/slices/app';
import openCollectionModalReducer from 'providers/ReduxStore/slices/open-collection-modal';
import { readImportFiles, readImportText } from 'utils/importers/import-sources';
import { OPEN_COLLECTION_PAGE } from 'utils/common/constants';
import { isMacOS } from 'utils/common/platform';
import { ImportHandoffContext } from '../../components/ImportHandoff/context';
import ImportPage from './index';

jest.mock('nanoid', () => {
  let count = 0;
  return { customAlphabet: () => () => `mock-id-${(count += 1)}` };
});
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn(), success: jest.fn() } }));
jest.mock('utils/common/platform', () => ({
  ...jest.requireActual('utils/common/platform'),
  isMacOS: jest.fn(),
  isLinuxOS: jest.fn()
}));
jest.mock('utils/importers/import-sources', () => ({
  ...jest.requireActual('utils/importers/import-sources'),
  readImportFiles: jest.fn(),
  readImportText: jest.fn()
}));

const importData = { rawData: { openapi: '3.0.0' }, type: 'openapi' };
const closedState = openCollectionModalReducer(undefined, { type: 'init' });

const renderPage = ({ preferences = {} } = {}) => {
  const store = configureStore({
    reducer: { openCollectionModal: openCollectionModalReducer, app: appReducer },
    preloadedState: {
      openCollectionModal: { ...closedState, isOpen: true, page: OPEN_COLLECTION_PAGE.IMPORT },
      app: { ...appReducer(undefined, { type: 'init' }), preferences }
    }
  });
  const importFrom = jest.fn((load) => store.dispatch(load));
  render(
    <Provider store={store}>
      <ImportHandoffContext.Provider value={importFrom}>
        <ThemeProvider>
          <ImportPage />
        </ThemeProvider>
      </ImportHandoffContext.Provider>
    </Provider>
  );
  return { importFrom, store };
};

const textField = () => screen.getByTestId('import-page-text');
const type = (value) => fireEvent.change(textField(), { target: { value } });
const submit = () => fireEvent.submit(textField().closest('form'));
const paste = (value) => fireEvent.paste(textField(), { clipboardData: { getData: () => value } });

describe('ImportPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isMacOS.mockReturnValue(false);
  });

  afterEach(() => {
    delete window.ipcRenderer;
  });

  it('asks for a URL or raw JSON/YAML in a single-line field and offers to select files', () => {
    renderPage();

    expect(textField()).toHaveAttribute('type', 'text');
    expect(textField()).toHaveAttribute('spellcheck', 'false');
    expect(textField()).toHaveAttribute('placeholder', 'Paste a URL or raw JSON/YAML');
    expect(screen.getByRole('textbox', { name: 'Paste a URL or raw JSON/YAML' })).toBe(textField());
    expect(screen.queryByRole('button', { name: 'Load' })).not.toBeInTheDocument();
    expect(screen.getByTestId('import-page-drop-zone')).toHaveTextContent('Drop anywhere to import');
    expect(screen.getByTestId('import-page-drop-zone')).toHaveTextContent('Postman · Insomnia · OpenAPI · WSDL · OpenCollection · Bruno');
    expect(screen.getByTestId('import-page-select-files')).toHaveTextContent('select files');
  });

  it.each([
    ['macOS', true, '⌘ O'],
    ['Windows', false, 'Ctrl+O']
  ])('shows the %s import shortcut next to select files', (_os, isMac, shortcut) => {
    isMacOS.mockReturnValue(isMac);
    renderPage();

    expect(screen.getByTestId('import-page-drop-zone-shortcut').textContent).toBe(shortcut);
  });

  it('shows no shortcut when keyboard shortcuts are turned off', () => {
    renderPage({ preferences: { keybindingsEnabled: false } });

    expect(screen.queryByTestId('import-page-drop-zone-shortcut')).not.toBeInTheDocument();
  });

  it('shows the Enter hint once there is text', () => {
    renderPage();
    expect(screen.queryByTestId('import-page-enter-hint')).not.toBeInTheDocument();

    type('openapi: 3.0.0');

    expect(screen.getByTestId('import-page-enter-hint')).toHaveTextContent('Enter to import');
    expect(screen.queryByTestId('import-page-zip-warning')).not.toBeInTheDocument();

    type('   ');

    expect(screen.queryByTestId('import-page-enter-hint')).not.toBeInTheDocument();
  });

  it('warns about a ZIP URL instead of offering Enter', () => {
    renderPage();

    type('https://example.com/orders.zip');

    expect(screen.getByTestId('import-page-zip-warning')).toHaveTextContent('Bruno collection (.zip) from a URL · not supported yet. Download it and drop it here.');
    expect(screen.queryByTestId('import-page-enter-hint')).not.toBeInTheDocument();
  });

  it('loads the typed text on Enter and hands what it loaded over', async () => {
    readImportText.mockResolvedValue(importData);
    const { importFrom } = renderPage();
    type('  https://example.com/openapi.yaml ');

    submit();

    await waitFor(() => expect(readImportText).toHaveBeenCalledWith('https://example.com/openapi.yaml'));
    await expect(importFrom.mock.results[0].value).resolves.toEqual(importData);
  });

  it('does not load on Enter without text, for a ZIP URL or while a load is running', () => {
    readImportText.mockReturnValue(new Promise(() => {}));
    renderPage();

    submit();
    type('   ');
    submit();
    type('https://example.com/orders.zip');
    submit();
    expect(readImportText).not.toHaveBeenCalled();

    type('https://example.com/openapi.yaml');
    submit();
    submit();
    expect(readImportText).toHaveBeenCalledTimes(1);
  });

  it('loads pasted text right away, replacing what was in the field', async () => {
    readImportText.mockResolvedValue(importData);
    const { importFrom } = renderPage();
    type('https://example.com/old.json');

    paste('\nopenapi: 3.0.0\ninfo:\n  title: Orders\n');

    expect(readImportText).toHaveBeenCalledWith('openapi: 3.0.0\ninfo:\n  title: Orders');
    expect(textField()).toHaveValue('openapi: 3.0.0info:  title: Orders');
    await expect(importFrom.mock.results[0].value).resolves.toEqual(importData);
  });

  it('keeps a pasted ZIP URL in the field without loading it', () => {
    renderPage();

    paste('https://example.com/orders.zip');

    expect(textField()).toHaveValue('https://example.com/orders.zip');
    expect(screen.getByTestId('import-page-zip-warning')).toBeInTheDocument();
    expect(readImportText).not.toHaveBeenCalled();
  });

  it('leaves an empty paste to the field and ignores a paste while a load is running', () => {
    readImportText.mockReturnValue(new Promise(() => {}));
    renderPage();

    paste('   ');
    expect(readImportText).not.toHaveBeenCalled();

    paste('https://example.com/openapi.yaml');
    paste('https://example.com/other.yaml');

    expect(readImportText).toHaveBeenCalledTimes(1);
    expect(textField()).toHaveValue('https://example.com/openapi.yaml');
  });

  it('holds the field and shows a spinner in it while it loads', () => {
    readImportText.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.queryByTestId('import-page-loading')).not.toBeInTheDocument();

    paste('https://example.com/openapi.yaml');

    expect(textField()).toHaveAttribute('readonly');
    expect(screen.getByRole('status', { name: 'Loading' })).toBe(screen.getByTestId('import-page-loading'));
    expect(screen.queryByTestId('import-page-enter-hint')).not.toBeInTheDocument();
  });

  it('shows why it could not load in a toast and keeps the text to try again', async () => {
    readImportText.mockRejectedValue(new Error('Could not parse the text as JSON or YAML'));
    renderPage();

    paste('just some words');

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not parse the text as JSON or YAML'));
    expect(textField()).toHaveValue('just some words');
    expect(textField()).not.toHaveAttribute('readonly');
    expect(screen.queryByTestId('import-page-loading')).not.toBeInTheDocument();
    expect(screen.getByTestId('import-page-enter-hint')).toBeInTheDocument();
  });

  it('highlights the drop zone only while files are over it', () => {
    renderPage();
    const zone = screen.getByTestId('import-page-drop-zone');

    fireEvent.dragEnter(zone, { dataTransfer: { types: ['text/plain'] } });
    expect(zone).not.toHaveClass('is-drag-over');

    fireEvent.dragEnter(zone, { dataTransfer: { types: ['Files'] } });
    expect(zone).toHaveClass('is-drag-over');

    fireEvent.dragLeave(zone, { dataTransfer: { types: ['Files'] } });
    expect(zone).not.toHaveClass('is-drag-over');
  });

  it('opens the file picker from the link', () => {
    renderPage();
    const click = jest.spyOn(screen.getByTestId('import-page-file-input'), 'click');

    fireEvent.click(screen.getByTestId('import-page-select-files'));

    expect(click).toHaveBeenCalled();
  });

  it('hands the picked files over', async () => {
    readImportFiles.mockResolvedValue(importData);
    const { importFrom } = renderPage();
    const picked = new File(['{}'], 'openapi.json');

    fireEvent.change(screen.getByTestId('import-page-file-input'), { target: { files: [picked] } });

    expect(readImportFiles).toHaveBeenCalledWith([picked]);
    await expect(importFrom.mock.results[0].value).resolves.toEqual(importData);
  });

  it.each([
    ['Migrating from Postman?', 'https://docs.usebruno.com/get-started/import-export-data/postman-migration'],
    ['Learn more about importing', 'https://docs.usebruno.com/get-started/import-export-data/import-collections']
  ])('opens "%s" in the browser', (label, url) => {
    window.ipcRenderer = { send: jest.fn(), openExternal: jest.fn() };
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: label }));

    expect(window.ipcRenderer.openExternal).toHaveBeenCalledWith(url);
  });
});
