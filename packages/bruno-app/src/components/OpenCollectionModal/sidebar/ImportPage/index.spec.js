import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import toast from 'react-hot-toast';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'providers/Theme';
import openCollectionModalReducer from 'providers/ReduxStore/slices/open-collection-modal';
import { readImportFiles, readImportText } from 'providers/ReduxStore/slices/open-collection-modal/import-sources';
import { ImportHandoffContext } from '../../components/ImportHandoff/context';
import ImportPage from './index';

jest.mock('nanoid', () => {
  let count = 0;
  return { customAlphabet: () => () => `mock-id-${(count += 1)}` };
});
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn(), success: jest.fn() } }));
jest.mock('providers/ReduxStore/slices/open-collection-modal/import-sources', () => ({
  ...jest.requireActual('providers/ReduxStore/slices/open-collection-modal/import-sources'),
  readImportFiles: jest.fn(),
  readImportText: jest.fn()
}));

const importData = { rawData: { openapi: '3.0.0' }, type: 'openapi' };
const closedState = openCollectionModalReducer(undefined, { type: 'init' });

const renderPage = () => {
  const store = configureStore({
    reducer: { openCollectionModal: openCollectionModalReducer },
    preloadedState: { openCollectionModal: { ...closedState, isOpen: true, page: 'import' } }
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
const loadButton = () => screen.getByRole('button', { name: 'Load' });
const type = (value) => fireEvent.change(textField(), { target: { value } });

describe('ImportPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('asks for a URL and offers to select files', () => {
    renderPage();

    expect(textField()).toHaveAttribute('placeholder', 'Paste a file URL, e.g. https://example.com/openapi.yaml');
    expect(screen.getByTestId('import-page-drop-zone')).toHaveTextContent('Drop anywhere to import');
    expect(screen.getByTestId('import-page-drop-zone')).toHaveTextContent('OpenCollection · Bruno · Postman · Insomnia · OpenAPI · WSDL');
    expect(screen.getByTestId('import-page-select-files')).toHaveTextContent('select files');
  });

  it('enables Load once there is text and says what Bruno will do with it', () => {
    renderPage();
    expect(loadButton()).toBeDisabled();
    expect(screen.queryByTestId('import-page-hint')).not.toBeInTheDocument();

    type('https://example.com/openapi.json');

    expect(loadButton()).toBeEnabled();
    expect(screen.getByTestId('import-page-hint')).toHaveTextContent('JSON from a URL');
    expect(screen.getByTestId('import-page-hint')).toHaveClass('is-ok');
  });

  it('warns about a ZIP URL and keeps Load off', () => {
    renderPage();

    type('https://example.com/orders.zip');

    expect(screen.getByTestId('import-page-hint')).toHaveClass('is-warning');
    expect(loadButton()).toBeDisabled();
  });

  it('hands what it loaded over', async () => {
    readImportText.mockResolvedValue(importData);
    const { importFrom } = renderPage();
    type('  https://example.com/openapi.yaml ');

    fireEvent.click(loadButton());

    await waitFor(() => expect(readImportText).toHaveBeenCalledWith('https://example.com/openapi.yaml'));
    await expect(importFrom.mock.results[0].value).resolves.toEqual(importData);
  });

  it('holds the field while it loads', () => {
    readImportText.mockReturnValue(new Promise(() => {}));
    renderPage();
    type('https://example.com/openapi.yaml');

    fireEvent.click(loadButton());

    expect(textField()).toHaveAttribute('readonly');
  });

  it('keeps the line breaks of pasted YAML', async () => {
    readImportText.mockResolvedValue(importData);
    renderPage();
    const yaml = 'openapi: 3.0.0\ninfo:\n  title: Orders';

    fireEvent.paste(textField(), { clipboardData: { getData: () => yaml } });
    fireEvent.click(loadButton());

    await waitFor(() => expect(readImportText).toHaveBeenCalledWith(yaml));
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

  it('shows why it could not load in a toast and lets the text be changed', async () => {
    readImportText.mockRejectedValue(new Error('URL import failed. Please check the URL and try again.'));
    renderPage();
    type('https://example.com/openapi.yaml');

    fireEvent.click(loadButton());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('URL import failed. Please check the URL and try again.'));
    expect(textField()).not.toHaveAttribute('readonly');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
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
});
