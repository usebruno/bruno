import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'providers/Theme';
import { convertOpenapiToBruno } from 'utils/importers/openapi-collection';
import { postmanToBruno } from 'utils/importers/postman-collection';
import ImportCollectionLocation from './index';

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
  browseDirectory: jest.fn()
}));

jest.mock('utils/importers/openapi-collection', () => ({
  ...jest.requireActual('utils/importers/openapi-collection'),
  convertOpenapiToBruno: jest.fn((spec) => ({ uid: 'converted', name: spec.info.title, version: '1', items: [], environments: [] }))
}));

jest.mock('utils/importers/postman-collection', () => ({
  postmanToBruno: jest.fn(async (data) => ({ collection: { uid: 'converted', name: data.info.name, items: [], environments: [] }, issues: [] }))
}));

const openApiSpec = { openapi: '3.0.0', info: { title: 'Orders API' }, paths: {} };
const swagger2Spec = { swagger: '2.0', info: { title: 'Legacy API' }, paths: {} };
const AUTH_PLACEMENT_INFO = 'On import, the spec\'s security scheme is added to the collection. Operations with a different scheme keep their own auth.';

const renderImport = ({ rawData = openApiSpec, format = 'openapi', sourceUrl = 'https://example.com/openapi.json' } = {}) => {
  const store = configureStore({
    reducer: {
      workspaces: (state = {}) => state,
      app: (state = {}) => state
    },
    preloadedState: {
      workspaces: { workspaces: [], activeWorkspaceUid: null },
      app: { preferences: { general: { defaultLocation: '/collections' } } }
    }
  });
  const handleSubmit = jest.fn();

  render(
    <Provider store={store}>
      <ThemeProvider>
        <ImportCollectionLocation onClose={jest.fn()} handleSubmit={handleSubmit} rawData={rawData} format={format} sourceUrl={sourceUrl} />
      </ThemeProvider>
    </Provider>
  );
  return handleSubmit;
};

const advancedToggle = () => screen.queryByRole('button', { name: 'Advanced' });
const authPlacementCheckbox = () => screen.getByRole('checkbox', { name: /Set authentication at collection level/ });
const authPlacementInfoIcon = () => screen.getByText('Set authentication at collection level').querySelector('svg');

const submitImport = async (handleSubmit) => {
  fireEvent.click(screen.getByText('Import'));
  await waitFor(() => expect(handleSubmit).toHaveBeenCalledTimes(1));
  return handleSubmit.mock.calls[0];
};

describe('ImportCollectionLocation collection auth placement', () => {
  it.each([
    ['an OpenAPI 3.x spec', openApiSpec],
    ['a Swagger 2.0 spec', swagger2Spec]
  ])('is offered off by default under a collapsed Advanced section for %s', (_, rawData) => {
    renderImport({ rawData });
    expect(screen.getByText('Set authentication at collection level')).not.toBeVisible();

    fireEvent.click(advancedToggle());

    expect(authPlacementCheckbox()).not.toBeChecked();
    expect(screen.getByText('Requests and folders inherit it instead of getting their own copy.')).toBeInTheDocument();
  });

  it('is not offered for other formats', () => {
    renderImport({ rawData: { info: { name: 'Postman Collection' }, item: [] }, format: 'postman', sourceUrl: undefined });
    fireEvent.click(advancedToggle());

    expect(screen.queryByText('Set authentication at collection level')).not.toBeInTheDocument();
  });

  it('explains the setting in the info tooltip, and clicking the icon leaves the switch alone', () => {
    renderImport();
    fireEvent.click(advancedToggle());

    fireEvent.mouseEnter(authPlacementInfoIcon().parentElement);
    expect(screen.getByText(AUTH_PLACEMENT_INFO)).toBeInTheDocument();

    fireEvent.click(authPlacementInfoIcon());
    expect(authPlacementCheckbox()).not.toBeChecked();
  });

  it('toggles the switch from its label', () => {
    renderImport();
    fireEvent.click(advancedToggle());

    fireEvent.click(screen.getByText('Requests and folders inherit it instead of getting their own copy.'));

    expect(authPlacementCheckbox()).toBeChecked();
  });

  it('converts with the chosen setting and saves it in the sync config', async () => {
    const handleSubmit = renderImport();
    fireEvent.click(screen.getByTestId('check-for-spec-updates-toggle'));
    fireEvent.click(advancedToggle());
    fireEvent.click(authPlacementCheckbox());

    const [collection] = await submitImport(handleSubmit);

    expect(convertOpenapiToBruno).toHaveBeenCalledWith(openApiSpec, expect.objectContaining({ groupBy: 'tags', authPlacement: 'collection' }));
    expect(collection.brunoConfig.openapi).toEqual([
      { sourceUrl: 'https://example.com/openapi.json', groupBy: 'tags', authPlacement: 'collection', requestNameSource: 'summary', autoCheck: true, autoCheckInterval: 5 }
    ]);
  });

  it('saves request in the sync config when the switch is left off', async () => {
    const handleSubmit = renderImport();
    fireEvent.click(screen.getByTestId('check-for-spec-updates-toggle'));

    const [collection] = await submitImport(handleSubmit);

    expect(convertOpenapiToBruno).toHaveBeenCalledWith(openApiSpec, expect.objectContaining({ authPlacement: 'request' }));
    expect(collection.brunoConfig.openapi[0].authPlacement).toBe('request');
  });

  it('converts a Swagger 2.0 spec with the chosen setting', async () => {
    const handleSubmit = renderImport({ rawData: swagger2Spec });
    fireEvent.click(advancedToggle());
    fireEvent.click(authPlacementCheckbox());

    const [collection] = await submitImport(handleSubmit);

    expect(convertOpenapiToBruno).toHaveBeenCalledWith(swagger2Spec, expect.objectContaining({ authPlacement: 'collection' }));
    expect(collection.brunoConfig).toBeUndefined();
  });
});

describe('ImportCollectionLocation naming requests', () => {
  const NAMING_INFO = 'If an operation doesn\'t have the selected field, Bruno falls back to summary, operationId, description, then method and path.';
  const namingDropdown = () => screen.getByTestId('request-name-source-dropdown');
  const chooseNaming = async (value) => {
    fireEvent.click(namingDropdown());
    fireEvent.click(await screen.findByTestId(`request-name-source-option-${value.toLowerCase()}`));
  };

  it.each([
    ['an OpenAPI 3.x spec', openApiSpec],
    ['a Swagger 2.0 spec', swagger2Spec]
  ])('is offered with Summary selected under the collapsed Advanced section for %s', (_, rawData) => {
    renderImport({ rawData });
    expect(screen.getByText('Naming requests')).not.toBeVisible();

    fireEvent.click(advancedToggle());

    expect(screen.getByText('How requests in the generated collection are named.')).toBeInTheDocument();
    expect(namingDropdown()).toHaveTextContent('Summary');
  });

  it('offers Summary, operationId, Description and Path', async () => {
    renderImport();
    fireEvent.click(advancedToggle());
    fireEvent.click(namingDropdown());

    const options = await screen.findAllByRole('menuitem');
    expect(options.map((option) => option.querySelector('.dropdown-label').textContent)).toEqual(['Summary', 'operationId', 'Description', 'Path']);
  });

  it('explains the fallback order in the info tooltip', () => {
    renderImport();
    fireEvent.click(advancedToggle());

    fireEvent.mouseEnter(screen.getByText('Naming requests').querySelector('svg').parentElement);

    expect(screen.getByText(NAMING_INFO)).toBeInTheDocument();
  });

  it('converts with the chosen naming and saves it in the sync config', async () => {
    const handleSubmit = renderImport();
    fireEvent.click(screen.getByTestId('check-for-spec-updates-toggle'));
    fireEvent.click(advancedToggle());
    await chooseNaming('operationId');
    expect(namingDropdown()).toHaveTextContent('operationId');

    const [collection] = await submitImport(handleSubmit);

    expect(convertOpenapiToBruno).toHaveBeenCalledWith(openApiSpec, expect.objectContaining({ requestNameSource: 'operationId' }));
    expect(collection.brunoConfig.openapi).toEqual([
      { sourceUrl: 'https://example.com/openapi.json', groupBy: 'tags', authPlacement: 'request', requestNameSource: 'operationId', autoCheck: true, autoCheckInterval: 5 }
    ]);
  });

  it('saves Summary in the sync config when the setting is left alone', async () => {
    const handleSubmit = renderImport();
    fireEvent.click(screen.getByTestId('check-for-spec-updates-toggle'));

    const [collection] = await submitImport(handleSubmit);

    expect(convertOpenapiToBruno).toHaveBeenCalledWith(openApiSpec, expect.objectContaining({ requestNameSource: 'summary' }));
    expect(collection.brunoConfig.openapi[0].requestNameSource).toBe('summary');
  });

  it('keeps the choice when the Advanced section is closed and reopened', async () => {
    renderImport();
    fireEvent.click(advancedToggle());
    await chooseNaming('path');

    fireEvent.click(advancedToggle());
    fireEvent.click(advancedToggle());

    expect(namingDropdown()).toHaveTextContent('Path');
  });

  it('converts a Swagger 2.0 spec with the chosen naming and writes no sync config', async () => {
    const handleSubmit = renderImport({ rawData: swagger2Spec });
    fireEvent.click(advancedToggle());
    await chooseNaming('description');

    const [collection] = await submitImport(handleSubmit);

    expect(convertOpenapiToBruno).toHaveBeenCalledWith(swagger2Spec, expect.objectContaining({ requestNameSource: 'description' }));
    expect(collection.brunoConfig).toBeUndefined();
  });
});

describe('ImportCollectionLocation settings layout', () => {
  const postmanCollection = { info: { name: 'Postman Collection' }, item: [] };
  const optionsButton = () => screen.queryByRole('button', { name: 'Options' });
  const formatSelect = () => screen.queryByRole('combobox', { name: 'File Format' });
  const openOptionsMenu = () => {
    fireEvent.click(optionsButton());
    return screen.findByTestId('show-advanced-options-toggle');
  };

  it('shows File Format only after Show file format is picked from the Options menu', async () => {
    renderImport();
    expect(formatSelect()).not.toBeInTheDocument();

    const showFileFormat = await openOptionsMenu();
    expect(showFileFormat).toHaveTextContent('Show file format');
    fireEvent.click(showFileFormat);

    expect(formatSelect()).toHaveValue('yml');
  });

  it('hides File Format again from the Options menu', async () => {
    renderImport();
    fireEvent.click(await openOptionsMenu());

    const hideFileFormat = await openOptionsMenu();
    expect(hideFileFormat).toHaveTextContent('Hide file format');
    fireEvent.click(hideFileFormat);

    expect(formatSelect()).not.toBeInTheDocument();
  });

  it('imports in the chosen file format', async () => {
    const handleSubmit = renderImport();
    fireEvent.click(await openOptionsMenu());
    fireEvent.change(formatSelect(), { target: { value: 'bru' } });

    const [, , options] = await submitImport(handleSubmit);

    expect(options.format).toBe('bru');
  });

  it('converts with the chosen folder arrangement and saves it in the sync config', async () => {
    const handleSubmit = renderImport();
    fireEvent.click(screen.getByTestId('check-for-spec-updates-toggle'));
    fireEvent.click(screen.getByTestId('grouping-dropdown'));
    fireEvent.click(await screen.findByTestId('grouping-option-path'));
    expect(screen.getByTestId('grouping-dropdown')).toHaveTextContent('Paths');

    const [collection] = await submitImport(handleSubmit);

    expect(convertOpenapiToBruno).toHaveBeenCalledWith(openApiSpec, expect.objectContaining({ groupBy: 'path' }));
    expect(collection.brunoConfig.openapi[0].groupBy).toBe('path');
  });

  it('shows neither the Options menu nor Advanced for a Bruno zip import', () => {
    renderImport({ rawData: { collectionName: 'Archive' }, format: 'bruno-zip', sourceUrl: undefined });

    expect(optionsButton()).not.toBeInTheDocument();
    expect(advancedToggle()).not.toBeInTheDocument();
  });

  it('shows the Options menu without an Advanced section for a format that has no advanced setting', () => {
    renderImport({ rawData: { name: 'Insomnia Collection', resources: [] }, format: 'insomnia', sourceUrl: undefined });

    expect(optionsButton()).toBeInTheDocument();
    expect(advancedToggle()).not.toBeInTheDocument();
  });

  it('offers Preserve scripts as a switch in the Advanced section for Postman and converts with it', async () => {
    const handleSubmit = renderImport({ rawData: postmanCollection, format: 'postman', sourceUrl: undefined });
    expect(screen.getByText('Preserve scripts')).not.toBeVisible();

    fireEvent.click(advancedToggle());
    const preserveScripts = screen.getByRole('checkbox', { name: /Preserve scripts/ });
    expect(preserveScripts).not.toBeChecked();
    fireEvent.click(preserveScripts);
    expect(preserveScripts).toBeChecked();

    await submitImport(handleSubmit);

    expect(postmanToBruno).toHaveBeenCalledWith(postmanCollection, { preserveScripts: true });
  });

  it('shows Check for Spec Updates as a switch that stays off and disabled for Swagger 2.0, with the note', () => {
    renderImport({ rawData: swagger2Spec });

    const specUpdates = screen.getByRole('checkbox', { name: /Check for Spec Updates/ });
    expect(specUpdates).toBeDisabled();
    expect(specUpdates).not.toBeChecked();
    expect(screen.getByText('OpenAPI Sync is not supported for Swagger 2.0 specs.')).toBeInTheDocument();
  });
});
