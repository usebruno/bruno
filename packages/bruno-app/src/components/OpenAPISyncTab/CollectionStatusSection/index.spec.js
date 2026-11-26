import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import themes from 'themes/index';
import openapiSyncReducer from 'providers/ReduxStore/slices/openapi-sync';
import CollectionStatusSection from './index';

jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

const collection = { uid: 'pets', pathname: '/collections/pets' };
const createPet = { id: 'POST:/pets', method: 'POST', path: '/pets', name: 'Create pet', changes: '+1 headers', pathname: '/collections/pets/Create pet.bru' };
const copy = { ...createPet, pathname: '/collections/pets/Create pet copy.bru' };

const renderSection = (modified = [createPet], expandedPathnames = modified.map(({ pathname }) => pathname)) => {
  const initialState = openapiSyncReducer(undefined, { type: 'init' });
  const expandedRows = Object.fromEntries(expandedPathnames.map((pathname) => [pathname, true]));
  const store = configureStore({
    reducer: { openapiSync: openapiSyncReducer },
    preloadedState: {
      openapiSync: {
        ...initialState,
        tabUiState: { [collection.uid]: { expandedSections: { 'drift-modified': true }, expandedRows } }
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
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    renderSection([createPet, copy]);

    await waitFor(() => expect(window.ipcRenderer.invoke).toHaveBeenCalledTimes(2));
    expect(window.ipcRenderer.invoke.mock.calls.map(([, args]) => args.pathname).sort()).toEqual([copy.pathname, createPet.pathname]);
    expect(consoleError.mock.calls.some(([message]) => String(message).includes('same key'))).toBe(false);
  });

  it('opens and closes each copy of a duplicated request on its own', async () => {
    renderSection([createPet, copy], [createPet.pathname]);
    const [original, duplicate] = screen.getAllByRole('button', { name: /\/pets/ });
    expect(original).toHaveAttribute('aria-expanded', 'true');
    expect(duplicate).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(duplicate);

    expect(original).toHaveAttribute('aria-expanded', 'true');
    expect(duplicate).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(window.ipcRenderer.invoke).toHaveBeenCalledTimes(2));
  });
});
