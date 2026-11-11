import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';
import { importCollection, importCollectionFromZip } from 'providers/ReduxStore/slices/collections/actions';
import openCollectionModalReducer from 'providers/ReduxStore/slices/open-collection-modal';
import { useImportHandoff } from './context';
import ImportHandoff from './index';

jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn(), success: jest.fn() } }));
jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  browseDirectories: jest.fn(),
  mountCollection: jest.fn(),
  openMultipleCollections: jest.fn(),
  importCollection: jest.fn(),
  importCollectionFromZip: jest.fn()
}));
jest.mock('components/Sidebar/ImportCollectionLocation', () => ({
  __esModule: true,
  default: ({ rawData, format, sourceUrl, filePath, rawContent, onClose, handleSubmit }) => (
    <div data-testid="location-modal">
      <input id="collection-location" aria-label="Location" />
      <span data-testid="location-props">{JSON.stringify({ rawData, format, sourceUrl, filePath, rawContent })}</span>
      <button onClick={() => handleSubmit({ name: 'Orders', packageReport: { hasAny: true } }, '/work', { format: 'yml' })}>Import</button>
      <button onClick={() => handleSubmit({ zipFilePath: '/work/a.zip' }, '/work', { isZipImport: true })}>Import zip</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  )
}));
jest.mock('components/Sidebar/BulkImportCollectionLocation', () => ({
  __esModule: true,
  default: ({ importData }) => <div data-testid="bulk-modal">{importData.filesData.length}</div>
}));
jest.mock('components/Sidebar/PostmanPackageReport', () => ({
  __esModule: true,
  default: ({ collectionPath }) => <div data-testid="postman-prompt">{collectionPath}</div>
}));

const closedState = openCollectionModalReducer(undefined, { type: 'init' });

const Starter = ({ loaded }) => {
  const importFrom = useImportHandoff();
  return <button onClick={() => importFrom(() => Promise.resolve(loaded))}>Start</button>;
};

const renderHandoff = (loaded) => {
  const store = configureStore({
    reducer: { openCollectionModal: openCollectionModalReducer },
    preloadedState: { openCollectionModal: { ...closedState, isOpen: true, page: 'import' } }
  });
  render(
    <Provider store={store}>
      <ImportHandoff>
        <Starter loaded={loaded} />
      </ImportHandoff>
    </Provider>
  );
  return store;
};

const click = (name) => act(async () => {
  fireEvent.click(screen.getByRole('button', { name }));
});

const isModalOpen = (store) => store.getState().openCollectionModal.isOpen;
const single = { rawData: { openapi: '3.0.0' }, type: 'openapi', filePath: '/work/a.yaml', rawContent: 'raw' };

describe('ImportHandoff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    importCollection.mockReturnValue(() => Promise.resolve({ path: '/work/Orders' }));
    importCollectionFromZip.mockReturnValue(() => Promise.resolve({ path: '/work/a' }));
  });

  it('closes the Open collection modal and asks where to import a single collection', async () => {
    const store = renderHandoff(single);

    await click('Start');

    expect(isModalOpen(store)).toBe(false);
    expect(screen.getByLabelText('Location')).toHaveFocus();
    expect(JSON.parse(screen.getByTestId('location-props').textContent)).toEqual({
      rawData: single.rawData,
      format: 'openapi',
      filePath: '/work/a.yaml',
      rawContent: 'raw'
    });
  });

  it('uses the bulk modal for several files', async () => {
    renderHandoff({ type: 'multiple', filesData: [{}, {}] });

    await click('Start');

    expect(screen.getByTestId('bulk-modal')).toHaveTextContent('2');
    expect(screen.queryByTestId('location-modal')).not.toBeInTheDocument();
  });

  it('stays out of the way when nothing was loaded', async () => {
    const store = renderHandoff(null);

    await click('Start');

    expect(isModalOpen(store)).toBe(true);
    expect(screen.queryByTestId('location-modal')).not.toBeInTheDocument();
  });

  it('imports to the chosen location, then closes and offers the package prompt', async () => {
    renderHandoff(single);
    await click('Start');

    await click('Import');

    expect(importCollection).toHaveBeenCalledWith(expect.objectContaining({ name: 'Orders' }), '/work', { format: 'yml' });
    expect(screen.queryByTestId('location-modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('postman-prompt')).toHaveTextContent('/work/Orders');
  });

  it('imports a ZIP through the ZIP import', async () => {
    renderHandoff({ rawData: { zipFilePath: '/work/a.zip', collectionName: 'a' }, type: 'bruno-zip' });
    await click('Start');

    await click('Import zip');

    expect(importCollectionFromZip).toHaveBeenCalledWith('/work/a.zip', '/work');
    expect(importCollection).not.toHaveBeenCalled();
  });

  it('shows why an import failed and keeps the location modal open', async () => {
    importCollection.mockReturnValue(() => Promise.reject(new Error('Error invoking remote method \'renderer:import-collection\': Error: Folder exists')));
    renderHandoff(single);
    await click('Start');

    await click('Import');

    expect(toast.error).toHaveBeenCalledWith('Folder exists');
    expect(screen.getByTestId('location-modal')).toBeInTheDocument();
  });

  it('just closes when the location modal is cancelled', async () => {
    const store = renderHandoff(single);
    await click('Start');

    await click('Cancel');

    expect(screen.queryByTestId('location-modal')).not.toBeInTheDocument();
    expect(isModalOpen(store)).toBe(false);
    expect(importCollection).not.toHaveBeenCalled();
  });
});
