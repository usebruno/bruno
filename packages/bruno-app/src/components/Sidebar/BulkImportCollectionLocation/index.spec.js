import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import { importCollection } from 'providers/ReduxStore/slices/collections/actions';
import { convertOpenapiToBruno } from 'utils/importers/openapi-collection';
import { DEFAULT_COLLECTION_FORMAT } from 'utils/common/constants';
import BulkImportCollectionLocation, { normalizeName, generateUniqueName } from './index';

jest.mock('components/Modal', () => ({
  __esModule: true,
  default: ({ children, confirmText, handleConfirm, footerLeft }) => (
    <div>
      {children}
      {footerLeft}
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
  convertOpenapiToBruno: jest.fn((spec) => ({ uid: 'converted', name: spec.info.title, version: '1', items: [], environments: [] }))
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

const syncEntry = (sourceUrl, settings = {}) => [{ sourceUrl, groupBy: 'tags', authPlacement: 'request', requestNameSource: 'summary', ...settings, autoCheck: true, autoCheckInterval: 5 }];

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

const specUpdatesCheckbox = () => screen.getByRole('checkbox', { name: /Check for Spec Updates/ });
const configurationToggle = () => screen.queryByRole('button', { name: 'OpenAPI configuration' });
const openConfiguration = () => fireEvent.click(configurationToggle());
const authPlacementCheckbox = () => screen.getByRole('checkbox', { name: /Set authentication at collection level/ });
const groupingDropdown = () => screen.getByTestId('grouping-dropdown');
const namingDropdown = () => screen.getByTestId('request-name-source-dropdown');
const chooseGrouping = async (value) => {
  fireEvent.click(groupingDropdown());
  fireEvent.click(await screen.findByTestId(`grouping-option-${value}`));
};
const chooseNaming = async (value) => {
  fireEvent.click(namingDropdown());
  fireEvent.click(await screen.findByTestId(`request-name-source-option-${value.toLowerCase()}`));
};
const specUpdatesDescription = () => screen.getByTestId('bulk-import-check-for-spec-updates-description');
const swagger2Note = () => screen.queryByTestId('bulk-import-swagger2-sync-note');
const toggleFileSelection = (rowName) => fireEvent.click(screen.getByRole('checkbox', { name: rowName }));
const toggleAllFiles = () => fireEvent.click(within(screen.getByTestId('selection-section-collections')).getByRole('checkbox', { name: 'Select all' }));

const submitImport = async () => {
  fireEvent.click(screen.getByText('Import'));
  await waitFor(() => expect(importCollection).toHaveBeenCalledTimes(1));
  return importCollection.mock.calls[0];
};

describe('BulkImportCollectionLocation check for spec updates', () => {
  it('is not offered when no file is an OpenAPI spec', () => {
    renderBulkImport([postmanFile]);

    expect(configurationToggle()).not.toBeInTheDocument();
    expect(screen.queryByTestId('bulk-import-check-for-spec-updates')).not.toBeInTheDocument();
  });

  it('is offered and off by default when a file is an OpenAPI spec', () => {
    renderBulkImport([ordersSpec, postmanFile]);
    openConfiguration();

    expect(specUpdatesCheckbox()).toBeEnabled();
    expect(specUpdatesCheckbox()).not.toBeChecked();
    expect(specUpdatesDescription()).toHaveTextContent('Stay notified of spec changes and sync your collection with the spec.');
  });

  it('is disabled when every OpenAPI spec is Swagger 2.0', () => {
    renderBulkImport([swagger2Spec, postmanFile]);
    openConfiguration();

    expect(specUpdatesCheckbox()).toBeDisabled();
    expect(specUpdatesDescription()).toHaveTextContent('OpenAPI Sync is not supported for Swagger 2.0 specs.');
  });

  it('is disabled while no selected OpenAPI spec can sync', () => {
    renderBulkImport([ordersSpec, swagger2Spec]);
    openConfiguration();

    toggleFileSelection('Orders API orders.yaml');
    expect(specUpdatesCheckbox()).toBeDisabled();
    expect(specUpdatesDescription()).toHaveTextContent('OpenAPI Sync is not supported for Swagger 2.0 specs.');

    toggleFileSelection('Orders API orders.yaml');
    expect(specUpdatesCheckbox()).toBeEnabled();
  });

  it('stays on screen, disabled and unticked, while only other files are selected', () => {
    renderBulkImport([ordersSpec, postmanFile]);
    openConfiguration();
    fireEvent.click(specUpdatesCheckbox());

    toggleFileSelection('Orders API orders.yaml');

    expect(specUpdatesCheckbox()).toBeDisabled();
    expect(specUpdatesCheckbox()).not.toBeChecked();
    expect(specUpdatesDescription()).toHaveTextContent('Stay notified of spec changes and sync your collection with the spec.');
  });

  it.each([
    ['no file is selected', toggleAllFiles],
    ['only other files are selected', () => toggleFileSelection('Legacy API legacy.json')]
  ])('keeps the Swagger 2.0 reason while %s in a batch where no spec can sync', (_, deselectSpecs) => {
    renderBulkImport([swagger2Spec, postmanFile]);
    openConfiguration();

    deselectSpecs();

    expect(specUpdatesCheckbox()).toBeDisabled();
    expect(specUpdatesDescription()).toHaveTextContent('OpenAPI Sync is not supported for Swagger 2.0 specs.');
  });

  it('unticks when every file is deselected and stays unticked when a spec is selected again', async () => {
    renderBulkImport([ordersSpec, swagger2Spec, postmanFile]);
    openConfiguration();
    fireEvent.click(specUpdatesCheckbox());
    expect(specUpdatesCheckbox()).toBeChecked();

    toggleAllFiles();
    expect(specUpdatesCheckbox()).toBeDisabled();
    expect(specUpdatesCheckbox()).not.toBeChecked();
    expect(swagger2Note()).not.toBeInTheDocument();

    toggleFileSelection('Orders API orders.yaml');
    expect(specUpdatesCheckbox()).toBeEnabled();
    expect(specUpdatesCheckbox()).not.toBeChecked();

    const [collections, , options] = await submitImport();
    expect(collections[0].brunoConfig).toBeUndefined();
    expect(options.rawOpenAPISpecs).toEqual({});
  });

  it('unticks when only Swagger 2.0 specs stay selected', () => {
    renderBulkImport([ordersSpec, swagger2Spec]);
    openConfiguration();
    fireEvent.click(specUpdatesCheckbox());
    expect(swagger2Note()).toBeInTheDocument();

    toggleFileSelection('Orders API orders.yaml');

    expect(specUpdatesCheckbox()).toBeDisabled();
    expect(specUpdatesCheckbox()).not.toBeChecked();
    expect(specUpdatesDescription()).toHaveTextContent('OpenAPI Sync is not supported for Swagger 2.0 specs.');
    expect(swagger2Note()).not.toBeInTheDocument();
  });

  it('names the selected Swagger 2.0 specs that will be imported without sync', () => {
    renderBulkImport([ordersSpec, swagger2Spec]);
    openConfiguration();
    expect(swagger2Note()).not.toBeInTheDocument();

    fireEvent.click(specUpdatesCheckbox());
    expect(swagger2Note()).toHaveTextContent('Swagger 2.0 specs are imported without sync: legacy.json');
    expect(screen.getByRole('status')).toContainElement(swagger2Note());

    toggleFileSelection('Legacy API legacy.json');
    expect(swagger2Note()).not.toBeInTheDocument();
  });

  it('syncs each selected OpenAPI 3.x spec with its own file', async () => {
    renderBulkImport([ordersSpec, usersSpec, swagger2Spec, postmanFile]);
    openConfiguration();
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
    openConfiguration();
    await chooseGrouping('path');
    fireEvent.click(specUpdatesCheckbox());

    const [collections] = await submitImport();

    expect(collections[0].brunoConfig.openapi).toEqual(syncEntry('/specs/orders.yaml', { groupBy: 'path' }));
  });

  it('leaves out specs that were deselected', async () => {
    renderBulkImport([ordersSpec, usersSpec]);
    openConfiguration();
    fireEvent.click(specUpdatesCheckbox());
    toggleFileSelection('Users API users.yaml');

    const [collections, , options] = await submitImport();

    expect(collections.map((collection) => collection.name)).toEqual(['Orders API']);
    expect(options.rawOpenAPISpecs).toEqual({ 'file-0': specText('Orders API') });
  });

  it('keeps each spec with its own collection when the first file is deselected', async () => {
    renderBulkImport([ordersSpec, usersSpec]);
    openConfiguration();
    fireEvent.click(specUpdatesCheckbox());
    toggleFileSelection('Orders API orders.yaml');

    const [collections, , options] = await submitImport();

    expect(collections.map((collection) => collection.name)).toEqual(['Users API']);
    expect(collections[0].brunoConfig.openapi).toEqual(syncEntry('/specs/users.yaml'));
    expect(options.rawOpenAPISpecs).toEqual({ [collections[0].uid]: specText('Users API') });
  });

  it('does not sync a spec that has no file path', async () => {
    renderBulkImport([ordersSpec, { ...usersSpec, filePath: '' }]);
    openConfiguration();
    fireEvent.click(specUpdatesCheckbox());

    const [collections, , options] = await submitImport();

    expect(collections.find((collection) => collection.name === 'Users API').brunoConfig).toBeUndefined();
    expect(options.rawOpenAPISpecs).toEqual({ 'file-0': specText('Orders API') });
  });

  it('keeps the usual description when the only OpenAPI spec has no file path', () => {
    renderBulkImport([{ ...ordersSpec, filePath: '' }, postmanFile]);
    openConfiguration();

    expect(specUpdatesCheckbox()).toBeDisabled();
    expect(specUpdatesDescription()).toHaveTextContent('Stay notified of spec changes and sync your collection with the spec.');
  });

  it('imports OpenAPI specs without sync when left off', async () => {
    renderBulkImport([ordersSpec]);

    const [collections, , options] = await submitImport();

    expect(collections[0].brunoConfig).toBeUndefined();
    expect(options).toEqual({ format: DEFAULT_COLLECTION_FORMAT, rawOpenAPISpecs: {} });
  });

  it('names the sync config after the renamed duplicate', async () => {
    renderBulkImport([ordersSpec], { collections: [{ uid: 'existing', name: 'Orders API' }] });
    openConfiguration();
    fireEvent.click(specUpdatesCheckbox());

    const [collections] = await submitImport();

    expect(collections[0].name).toBe('Orders API 1');
    expect(collections[0].brunoConfig.name).toBe('Orders API 1');
  });
});

describe('BulkImportCollectionLocation collection auth placement', () => {
  it.each([
    ['an OpenAPI 3.x spec', ordersSpec],
    ['a Swagger 2.0 spec', swagger2Spec]
  ])('is offered off by default under the collapsed OpenAPI configuration when the selection includes %s', (_, spec) => {
    renderBulkImport([spec, postmanFile]);
    expect(screen.getByText('Set authentication at collection level')).not.toBeVisible();

    openConfiguration();

    expect(authPlacementCheckbox()).not.toBeChecked();
    expect(screen.getByText('Requests and folders inherit it instead of getting their own copy.')).toBeInTheDocument();
  });

  it('applies the choice to every OpenAPI spec in the batch, Swagger 2.0 included', async () => {
    renderBulkImport([ordersSpec, swagger2Spec, postmanFile]);
    openConfiguration();
    fireEvent.click(authPlacementCheckbox());

    await submitImport();

    expect(convertOpenapiToBruno.mock.calls).toEqual([
      [ordersSpec.data, { groupBy: 'tags', authPlacement: 'collection', requestNameSource: 'summary' }],
      [swagger2Spec.data, { groupBy: 'tags', authPlacement: 'collection', requestNameSource: 'summary' }]
    ]);
  });

  it('converts with the setting off when it is left alone', async () => {
    renderBulkImport([ordersSpec]);

    await submitImport();

    expect(convertOpenapiToBruno).toHaveBeenCalledWith(ordersSpec.data, { groupBy: 'tags', authPlacement: 'request', requestNameSource: 'summary' });
  });

  it('saves the choice in the sync config of each synced spec', async () => {
    renderBulkImport([ordersSpec, usersSpec]);
    openConfiguration();
    fireEvent.click(specUpdatesCheckbox());
    fireEvent.click(authPlacementCheckbox());

    const [collections] = await submitImport();

    expect(collections.map((collection) => collection.brunoConfig.openapi)).toEqual([
      syncEntry('/specs/orders.yaml', { authPlacement: 'collection' }),
      syncEntry('/specs/users.yaml', { authPlacement: 'collection' })
    ]);
  });
});

describe('BulkImportCollectionLocation naming requests', () => {
  it.each([
    ['an OpenAPI 3.x spec', ordersSpec],
    ['a Swagger 2.0 spec', swagger2Spec]
  ])('is offered with Summary selected when the selection includes %s', (_, spec) => {
    renderBulkImport([spec, postmanFile]);
    expect(screen.getByText('Naming requests')).not.toBeVisible();

    openConfiguration();

    expect(screen.getByText('How requests in the generated collection are named.')).toBeInTheDocument();
    expect(namingDropdown()).toHaveTextContent('Summary');
  });

  it('applies one choice to every OpenAPI spec in the batch, Swagger 2.0 included', async () => {
    renderBulkImport([ordersSpec, swagger2Spec, postmanFile]);
    openConfiguration();
    await chooseNaming('description');

    await submitImport();

    expect(convertOpenapiToBruno.mock.calls).toEqual([
      [ordersSpec.data, { groupBy: 'tags', authPlacement: 'request', requestNameSource: 'description' }],
      [swagger2Spec.data, { groupBy: 'tags', authPlacement: 'request', requestNameSource: 'description' }]
    ]);
  });

  it('saves the choice in the sync config of each synced spec', async () => {
    renderBulkImport([ordersSpec, usersSpec]);
    openConfiguration();
    fireEvent.click(specUpdatesCheckbox());
    await chooseNaming('path');

    const [collections] = await submitImport();

    expect(collections.map((collection) => collection.brunoConfig.openapi)).toEqual([
      syncEntry('/specs/orders.yaml', { requestNameSource: 'path' }),
      syncEntry('/specs/users.yaml', { requestNameSource: 'path' })
    ]);
  });
});

describe('BulkImportCollectionLocation settings layout', () => {
  const formatSelect = () => screen.queryByTestId('bulk-import-collection-format-selector');
  const openOptionsMenu = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    return screen.findByTestId('show-advanced-options-toggle');
  };

  it('shows File Format only after Show file format is picked from the Options menu', async () => {
    renderBulkImport([ordersSpec, postmanFile]);
    expect(formatSelect()).not.toBeInTheDocument();

    const showFileFormat = await openOptionsMenu();
    expect(showFileFormat).toHaveTextContent('Show file format');
    fireEvent.click(showFileFormat);
    expect(formatSelect()).toHaveValue('yml');

    const hideFileFormat = await openOptionsMenu();
    expect(hideFileFormat).toHaveTextContent('Hide file format');
    fireEvent.click(hideFileFormat);
    expect(formatSelect()).not.toBeInTheDocument();
  });

  it('imports every collection in the chosen file format', async () => {
    renderBulkImport([ordersSpec, postmanFile]);
    fireEvent.click(await openOptionsMenu());

    fireEvent.change(formatSelect(), { target: { value: 'bru' } });
    const [, , options] = await submitImport();

    expect(options.format).toBe('bru');
  });
});

describe('BulkImportCollectionLocation OpenAPI configuration', () => {
  const changeEverySetting = async () => {
    await chooseGrouping('path');
    fireEvent.click(specUpdatesCheckbox());
    await chooseNaming('description');
    fireEvent.click(authPlacementCheckbox());
  };

  const expectSettingsAtDefaults = ({ disabled }) => {
    const state = disabled ? 'toBeDisabled' : 'toBeEnabled';
    expect(groupingDropdown())[state]();
    expect(groupingDropdown()).toHaveTextContent('Tags');
    expect(specUpdatesCheckbox())[state]();
    expect(specUpdatesCheckbox()).not.toBeChecked();
    expect(namingDropdown())[state]();
    expect(namingDropdown()).toHaveTextContent('Summary');
    expect(authPlacementCheckbox())[state]();
    expect(authPlacementCheckbox()).not.toBeChecked();
  };

  it('is collapsed by default and holds the four settings in order', () => {
    renderBulkImport([ordersSpec, postmanFile]);
    expect(configurationToggle()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Folder arrangement')).not.toBeVisible();

    openConfiguration();

    const rows = ['Folder arrangement', 'Check for Spec Updates', 'Naming requests', 'Set authentication at collection level'].map((label) => screen.getByText(label));
    rows.slice(1).forEach((row, index) => {
      expect(rows[index].compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
    expect(screen.queryByRole('button', { name: 'Advanced' })).not.toBeInTheDocument();
  });

  it.each([
    ['only other files are selected', () => toggleFileSelection('Orders API orders.yaml')],
    ['no file is selected', toggleAllFiles]
  ])('stays visible with every setting disabled and back at its default while %s', async (_, deselectSpecs) => {
    renderBulkImport([ordersSpec, postmanFile]);
    openConfiguration();
    await changeEverySetting();

    deselectSpecs();

    expect(configurationToggle()).toBeInTheDocument();
    expectSettingsAtDefaults({ disabled: true });
  });

  it('enables the settings at their defaults when an OpenAPI spec is selected again, and imports with them', async () => {
    renderBulkImport([ordersSpec, postmanFile]);
    openConfiguration();
    await changeEverySetting();
    toggleFileSelection('Orders API orders.yaml');

    toggleFileSelection('Orders API orders.yaml');
    expectSettingsAtDefaults({ disabled: false });

    const [collections] = await submitImport();
    expect(convertOpenapiToBruno).toHaveBeenCalledWith(ordersSpec.data, { groupBy: 'tags', authPlacement: 'request', requestNameSource: 'summary' });
    expect(collections.every((collection) => collection.brunoConfig === undefined)).toBe(true);
  });

  it('applies the settings only to OpenAPI specs', async () => {
    renderBulkImport([ordersSpec, postmanFile]);
    openConfiguration();
    await changeEverySetting();

    const [collections] = await submitImport();

    expect(convertOpenapiToBruno.mock.calls).toEqual([
      [ordersSpec.data, { groupBy: 'path', authPlacement: 'collection', requestNameSource: 'description' }]
    ]);
    expect(collections.map((collection) => [collection.name, collection.brunoConfig?.openapi])).toEqual([
      ['Orders API', syncEntry('/specs/orders.yaml', { groupBy: 'path', authPlacement: 'collection', requestNameSource: 'description' })],
      ['Postman Collection', undefined]
    ]);
  });
});
