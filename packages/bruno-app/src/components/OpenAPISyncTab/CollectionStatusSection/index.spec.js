import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import { render, waitFor } from '@testing-library/react';
import themes from 'themes/index';
import openapiSyncReducer from 'providers/ReduxStore/slices/openapi-sync';
import CollectionStatusSection from './index';

jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

const collection = { uid: 'pets', pathname: '/collections/pets' };
const createPet = { id: 'POST:/pets', method: 'POST', path: '/pets', name: 'Create pet', changes: '+1 headers', pathname: '/collections/pets/Create pet.bru' };
const storedSpec = { openapi: '3.0.0', info: { title: 'Pets', version: '1' }, paths: {} };

const renderSection = (modified = [createPet]) => {
  const initialState = openapiSyncReducer(undefined, { type: 'init' });
  const store = configureStore({
    reducer: { openapiSync: openapiSyncReducer },
    preloadedState: {
      openapiSync: {
        ...initialState,
        tabUiState: { [collection.uid]: { expandedSections: { 'drift-modified': true }, expandedRows: { [createPet.id]: true } } }
      }
    }
  });
  return render(
    <Provider store={store}>
      <ThemeProvider theme={themes.light}>
        <CollectionStatusSection
          collection={collection}
          collectionDrift={{ modified, missing: [], localOnly: [] }}
          reloadDrift={jest.fn()}
          storedSpec={storedSpec}
          onOpenEndpoint={jest.fn()}
          onTabSelect={jest.fn()}
        />
      </ThemeProvider>
    </Provider>
  );
};

describe('CollectionStatusSection', () => {
  beforeEach(() => {
    window.ipcRenderer = { invoke: jest.fn().mockResolvedValue({ error: null, oldData: null, newData: null }) };
  });

  afterEach(() => {
    delete window.ipcRenderer;
    jest.restoreAllMocks();
  });

  it('previews a modified endpoint from its own file, as Reset will write it', async () => {
    renderSection();

    await waitFor(() => expect(window.ipcRenderer.invoke).toHaveBeenCalledWith(
      'renderer:get-endpoint-diff-data',
      expect.objectContaining({ collectionPath: '/collections/pets', endpointId: 'POST:/pets', pathname: createPet.pathname, resetToSpec: true })
    ));
    expect(window.ipcRenderer.invoke.mock.calls[0][1].newSpec).toBeUndefined();
  });

  it('previews each copy of a duplicated request from its own file', async () => {
    const copy = { ...createPet, pathname: '/collections/pets/Create pet copy.bru' };
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    renderSection([createPet, copy]);

    await waitFor(() => expect(window.ipcRenderer.invoke).toHaveBeenCalledTimes(2));
    expect(window.ipcRenderer.invoke.mock.calls.map(([, args]) => args.pathname).sort()).toEqual([copy.pathname, createPet.pathname]);
    expect(consoleError.mock.calls.some(([message]) => String(message).includes('same key'))).toBe(false);
  });
});
