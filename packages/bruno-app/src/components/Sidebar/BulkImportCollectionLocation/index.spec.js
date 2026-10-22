import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import { importCollection } from 'providers/ReduxStore/slices/collections/actions';
import { DEFAULT_COLLECTION_FORMAT } from 'utils/common/constants';
import BulkImportCollectionLocation, { normalizeName, generateUniqueName } from './index';

jest.mock('components/Modal', () => ({
  __esModule: true,
  default: ({ children, confirmText, handleConfirm }) => (
    <div>
      {children}
      <button onClick={handleConfirm}>{confirmText}</button>
    </div>
  )
}));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  browseDirectory: jest.fn(),
  importCollection: jest.fn(() => () => Promise.resolve([]))
}));

jest.mock('utils/importers/openapi-collection', () => ({
  ...jest.requireActual('utils/importers/openapi-collection'),
  convertOpenapiToBruno: (spec) => ({ uid: 'converted', name: spec.info.title, version: '1', items: [], environments: [] })
}));

jest.mock('utils/importers/postman-collection', () => ({
  postmanToBruno: async (data) => ({
    collection: { uid: 'converted', name: data.info.name, items: [], environments: [] },
    issues: []
  })
}));

describe('BulkImportCollectionLocation helpers', () => {
  describe('normalizeName', () => {
    it('should trim and lowercase names', () => {
      expect(normalizeName('  Beta  ')).toBe('beta');
      expect(normalizeName('TEST')).toBe('test');
      expect(normalizeName(null)).toBe('');
    });
  });

  describe('generateUniqueName', () => {
    it('should return original name if no conflict', () => {
      const checkExists = () => false;
      expect(generateUniqueName('Beta', checkExists)).toBe('Beta');
    });

    it('should add "copy" suffix on first conflict', () => {
      const existing = new Set(['beta']);
      const checkExists = (name) => existing.has(name);
      expect(generateUniqueName('Beta', checkExists)).toBe('Beta copy');
    });

    it('should increment copy number on multiple conflicts', () => {
      const existing = new Set(['beta', 'beta copy']);
      const checkExists = (name) => existing.has(name);
      expect(generateUniqueName('Beta', checkExists)).toBe('Beta copy 2');
    });
  });
});

const specText = (title) => `openapi: 3.0.0\ninfo:\n  title: ${title}\n`;

const openApiFile = (fileName, title) => ({
  file: { name: fileName },
  type: 'openapi',
  data: { openapi: '3.0.0', info: { title } },
  filePath: `/specs/${fileName}`,
  rawContent: specText(title)
});

const ordersSpec = openApiFile('orders.yaml', 'Orders API');
const usersSpec = openApiFile('users.yaml', 'Users API');
const swagger2Spec = {
  file: { name: 'legacy.json' },
  type: 'openapi',
  data: { swagger: '2.0', info: { title: 'Legacy API' } },
  filePath: '/specs/legacy.json'
};
const postmanFile = { file: { name: 'postman.json' }, type: 'postman', data: { info: { name: 'Postman Collection' } } };

const syncEntry = (sourceUrl, groupBy = 'tags') => [{ sourceUrl, groupBy, autoCheck: true, autoCheckInterval: 5 }];

const renderBulkImport = (filesData, { collections = [] } = {}) => {
  const store = configureStore({
    reducer: {
      workspaces: (state = {}) => state,
      app: (state = {}) => state,
      globalEnvironments: (state = {}) => state,
      collections: (state = {}) => state
    },
    preloadedState: {
      workspaces: { workspaces: [], activeWorkspaceUid: null },
      app: { preferences: { general: { defaultLocation: '/collections' } } },
      globalEnvironments: { globalEnvironments: [] },
      collections: { collections }
    }
  });

  render(
    <Provider store={store}>
      <ThemeProvider theme={themes.light}>
        <BulkImportCollectionLocation onClose={jest.fn()} handleSubmit={jest.fn()} importData={{ type: 'multiple', filesData }} />
      </ThemeProvider>
    </Provider>
  );
};

const specUpdatesCheckbox = () => screen.getByTestId('bulk-import-check-for-spec-updates');
const specUpdatesDescription = () => screen.getByTestId('bulk-import-check-for-spec-updates-description');
const swagger2Note = () => screen.queryByTestId('bulk-import-swagger2-sync-note');
const toggleFileSelection = (rowName) => fireEvent.click(screen.getByRole('checkbox', { name: rowName }));

const submitImport = async () => {
  fireEvent.click(screen.getByText('Import'));
  await waitFor(() => expect(importCollection).toHaveBeenCalledTimes(1));
  return importCollection.mock.calls[0];
};

describe('BulkImportCollectionLocation check for spec updates', () => {
  it('is not offered when no file is an OpenAPI spec', () => {
    renderBulkImport([postmanFile]);

    expect(screen.queryByTestId('bulk-import-check-for-spec-updates')).not.toBeInTheDocument();
  });

  it('is offered and off by default when a file is an OpenAPI spec', () => {
    renderBulkImport([ordersSpec, postmanFile]);

    expect(specUpdatesCheckbox()).toBeEnabled();
    expect(specUpdatesCheckbox()).not.toBeChecked();
    expect(specUpdatesDescription()).toHaveTextContent('Stay notified of spec changes and sync your collection with the spec.');
  });

  it('is disabled when every OpenAPI spec is Swagger 2.0', () => {
    renderBulkImport([swagger2Spec, postmanFile]);

    expect(specUpdatesCheckbox()).toBeDisabled();
    expect(specUpdatesDescription()).toHaveTextContent('OpenAPI Sync is not supported for Swagger 2.0 specs.');
  });

  it('names the selected Swagger 2.0 specs that will be imported without sync', () => {
    renderBulkImport([ordersSpec, swagger2Spec]);
    expect(swagger2Note()).not.toBeInTheDocument();

    fireEvent.click(specUpdatesCheckbox());
    expect(swagger2Note()).toHaveTextContent('Swagger 2.0 specs are imported without sync: legacy.json');
    expect(screen.getByRole('status')).toContainElement(swagger2Note());

    toggleFileSelection('Legacy API legacy.json');
    expect(swagger2Note()).not.toBeInTheDocument();
  });

  it('syncs each selected OpenAPI 3.x spec with its own file', async () => {
    renderBulkImport([ordersSpec, usersSpec, swagger2Spec, postmanFile]);
    fireEvent.click(specUpdatesCheckbox());

    const [collections, collectionLocation, options] = await submitImport();

    expect(collectionLocation).toBe('/collections');
    expect(collections.map((collection) => collection.brunoConfig?.openapi)).toEqual([
      syncEntry('/specs/orders.yaml'),
      syncEntry('/specs/users.yaml'),
      undefined,
      undefined
    ]);
    expect(collections[0].brunoConfig).toEqual({
      version: '1',
      name: 'Orders API',
      type: 'collection',
      ignore: ['node_modules', '.git'],
      openapi: syncEntry('/specs/orders.yaml')
    });
    expect(options).toEqual({
      format: DEFAULT_COLLECTION_FORMAT,
      rawOpenAPISpecs: { 'file-0': specText('Orders API'), 'file-1': specText('Users API') }
    });
  });

  it('syncs with the chosen folder arrangement', async () => {
    renderBulkImport([ordersSpec]);
    fireEvent.click(screen.getByTestId('grouping-dropdown'));
    fireEvent.click(await screen.findByTestId('grouping-option-path'));
    fireEvent.click(specUpdatesCheckbox());

    const [collections] = await submitImport();

    expect(collections[0].brunoConfig.openapi).toEqual(syncEntry('/specs/orders.yaml', 'path'));
  });

  it('leaves out specs that were deselected', async () => {
    renderBulkImport([ordersSpec, usersSpec]);
    fireEvent.click(specUpdatesCheckbox());
    toggleFileSelection('Users API users.yaml');

    const [collections, , options] = await submitImport();

    expect(collections.map((collection) => collection.name)).toEqual(['Orders API']);
    expect(options.rawOpenAPISpecs).toEqual({ 'file-0': specText('Orders API') });
  });

  it('keeps each spec with its own collection when the first file is deselected', async () => {
    renderBulkImport([ordersSpec, usersSpec]);
    fireEvent.click(specUpdatesCheckbox());
    toggleFileSelection('Orders API orders.yaml');

    const [collections, , options] = await submitImport();

    expect(collections.map((collection) => collection.name)).toEqual(['Users API']);
    expect(collections[0].brunoConfig.openapi).toEqual(syncEntry('/specs/users.yaml'));
    expect(options.rawOpenAPISpecs).toEqual({ [collections[0].uid]: specText('Users API') });
  });

  it('does not sync a spec that has no file path', async () => {
    renderBulkImport([ordersSpec, { ...usersSpec, filePath: '' }]);
    fireEvent.click(specUpdatesCheckbox());

    const [collections, , options] = await submitImport();

    expect(collections.find((collection) => collection.name === 'Users API').brunoConfig).toBeUndefined();
    expect(options.rawOpenAPISpecs).toEqual({ 'file-0': specText('Orders API') });
  });

  it('imports OpenAPI specs without sync when left off', async () => {
    renderBulkImport([ordersSpec]);

    const [collections, , options] = await submitImport();

    expect(collections[0].brunoConfig).toBeUndefined();
    expect(options).toEqual({ format: DEFAULT_COLLECTION_FORMAT, rawOpenAPISpecs: {} });
  });

  it('names the sync config after the renamed duplicate', async () => {
    renderBulkImport([ordersSpec], { collections: [{ uid: 'existing', name: 'Orders API' }] });
    fireEvent.click(specUpdatesCheckbox());

    const [collections] = await submitImport();

    expect(collections[0].name).toBe('Orders API 1');
    expect(collections[0].brunoConfig.name).toBe('Orders API 1');
  });
});
