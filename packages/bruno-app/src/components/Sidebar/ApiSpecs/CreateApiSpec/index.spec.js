import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSelector, useDispatch } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';
import { createApiSpecFile } from 'providers/ReduxStore/slices/apiSpec';
import { exportApiSpec } from 'utils/exporters/openapi-spec';
import { fetchAndValidateApiSpecFromUrl } from 'utils/importers/common';
import useDefaultApiSpecLocation from 'hooks/useDefaultApiSpecLocation';
import toast from 'react-hot-toast';
import CreateApiSpec from './index';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn()
}));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  browseDirectory: jest.fn()
}));

jest.mock('providers/ReduxStore/slices/apiSpec', () => ({
  createApiSpecFile: jest.fn()
}));

jest.mock('providers/ReduxStore/slices/app', () => ({
  showApiSpecPage: jest.fn(() => ({ type: 'showApiSpecPage' }))
}));

jest.mock('utils/importers/common', () => ({
  fetchAndValidateApiSpecFromUrl: jest.fn()
}));

jest.mock('utils/exporters/openapi-spec', () => ({
  exportApiSpec: jest.fn(() => ({ content: 'openapi: 3.0.0' }))
}));

jest.mock('hooks/useDefaultApiSpecLocation', () => jest.fn(() => '/home/dev/workspaces/team/apispec'));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() }
}));

jest.mock('components/Modal', () => ({ title, confirmText, confirmDisabled, handleConfirm, children }) => (
  <div>
    <h1>{title}</h1>
    {children}
    <button type="button" disabled={confirmDisabled} onClick={handleConfirm}>{confirmText}</button>
  </div>
));

jest.mock('ui/MenuDropdown', () => ({ items, children }) => (
  <div>
    {children}
    {items.map((item) => (
      <button key={item.id} type="button" data-testid={item.testId} onClick={item.onClick}>
        {item.label}
      </button>
    ))}
  </div>
));

const PETSTORE = { uid: 'c-petstore', name: 'Petstore', pathname: '/home/dev/collections/petstore' };
const BILLING = { uid: 'c-billing', name: 'Billing: v2', pathname: '/home/dev/collections/billing' };
const OTHER_WORKSPACE_COLLECTION = { uid: 'c-other', name: 'Elsewhere', pathname: '/home/dev/other/elsewhere' };
const SCRATCH = { uid: 'c-scratch', name: 'Scratch', pathname: '/home/dev/scratch' };

const ACTIVE_WORKSPACE = {
  uid: 'w1',
  type: 'named',
  pathname: '/home/dev/workspaces/team',
  scratchCollectionUid: SCRATCH.uid,
  collections: [
    { path: PETSTORE.pathname },
    { path: BILLING.pathname },
    { path: SCRATCH.pathname }
  ]
};

const COLLECTION_JSON = {
  '/home/dev/collections/petstore': {
    configFile: 'bruno.json',
    requests: [{ name: 'get pet' }],
    envVariables: { local: [{ name: 'host', value: 'localhost', enabled: true }] },
    processEnvVariables: {},
    collectionVariables: {},
    skipped: []
  },
  '/home/dev/collections/billing': {
    configFile: 'bruno.json',
    requests: [{ name: 'list invoices' }],
    envVariables: {},
    processEnvVariables: {},
    collectionVariables: {},
    skipped: []
  },
  '/home/dev/elsewhere/outside-collection': {
    configFile: 'bruno.json',
    requests: [{ name: 'ping' }],
    envVariables: {},
    processEnvVariables: {},
    collectionVariables: {},
    skipped: []
  }
};

const mockStore = ({ workspaceCollections = [PETSTORE, BILLING, SCRATCH, OTHER_WORKSPACE_COLLECTION], apiSpecs = [] } = {}) => {
  const state = {
    collections: { collections: workspaceCollections },
    apiSpec: { apiSpecs },
    workspaces: { workspaces: [ACTIVE_WORKSPACE], activeWorkspaceUid: ACTIVE_WORKSPACE.uid }
  };
  useSelector.mockImplementation((selector) => selector(state));
};

const withTheme = (ui) => <ThemeProvider theme={themes.light}>{ui}</ThemeProvider>;

const renderModal = (options) => {
  mockStore(options);
  return render(withTheme(<CreateApiSpec onClose={jest.fn()} />));
};

const chooseCollectionSource = async (user) => {
  await user.click(screen.getByLabelText('Collection'));
};

const chooseFileSystemSource = async (user) => {
  await user.click(screen.getByRole('radio', { name: 'From file system' }));
};

describe('CreateApiSpec — collection source', () => {
  beforeEach(() => {
    useDispatch.mockReturnValue(jest.fn((action) => action));
    useDefaultApiSpecLocation.mockReturnValue('/home/dev/workspaces/team/apispec');
    createApiSpecFile.mockImplementation(() => Promise.resolve());
    window.ipcRenderer = {
      invoke: jest.fn((channel, pathname) => {
        if (channel === 'renderer:get-collection-json') {
          return Promise.resolve(COLLECTION_JSON[pathname]);
        }
        return Promise.resolve();
      })
    };
  });

  it('lists the active workspace collections in workspace order, excluding scratch and other workspaces', async () => {
    const user = userEvent.setup();

    renderModal();
    await chooseCollectionSource(user);

    const listed = screen.getAllByTestId(/^api-spec-collection-option-/).map((option) => option.textContent);

    expect(listed).toEqual(['Petstore', 'Billing: v2']);
  });

  it('opens on the Collection source with nothing pre-selected', async () => {
    renderModal();

    expect(screen.getByLabelText('Collection')).toBeChecked();
    expect(screen.getByTestId('api-spec-collection-trigger')).toHaveTextContent('Select a collection');
    expect(screen.getByLabelText('Spec Name')).toHaveValue('');
  });

  it('tells the user when the workspace has no collections, and keeps the file system tab usable', async () => {
    const user = userEvent.setup();
    renderModal({ workspaceCollections: [SCRATCH, OTHER_WORKSPACE_COLLECTION] });
    await chooseCollectionSource(user);

    expect(screen.getByTestId('api-spec-no-collections')).toBeInTheDocument();
    expect(screen.queryByTestId('api-spec-collection-trigger')).not.toBeInTheDocument();

    await chooseFileSystemSource(user);
    expect(screen.getByPlaceholderText('Choose file...')).toBeInTheDocument();
  });

  it('prefills the name from the collection, sanitized, and loads its environments', async () => {
    const user = userEvent.setup();
    renderModal();
    await chooseCollectionSource(user);

    await user.click(screen.getByTestId(`api-spec-collection-option-${PETSTORE.uid}`));

    await waitFor(() => expect(screen.getByLabelText('Spec Name')).toHaveValue('Petstore'));
    expect(screen.getByTestId('api-spec-environment-trigger')).toHaveTextContent('local');

    await user.click(screen.getByTestId(`api-spec-collection-option-${BILLING.uid}`));
    await waitFor(() => expect(screen.getByLabelText('Spec Name')).toHaveValue('Billing- v2'));
  });

  it('fills the name for a collection with no bruno.json to read it from', async () => {
    const user = userEvent.setup();

    window.ipcRenderer.invoke = jest.fn(() => Promise.resolve({
      configFile: 'opencollection.yml', requests: [], envVariables: {}, processEnvVariables: {}, collectionVariables: {}, skipped: []
    }));
    browseDirectory.mockReturnValue(Promise.resolve('/home/dev/elsewhere/outside-collection'));
    renderModal();
    await chooseCollectionSource(user);

    await user.click(screen.getByTestId(`api-spec-collection-option-${PETSTORE.uid}`));
    await waitFor(() => expect(screen.getByLabelText('Spec Name')).toHaveValue('Petstore'));

    await chooseFileSystemSource(user);
    await user.click(screen.getByPlaceholderText('Choose file...'));
    await waitFor(() => expect(screen.getByLabelText('Spec Name')).toHaveValue('outside-collection'));
  });

  it('never overwrites a name the user already typed', async () => {
    const user = userEvent.setup();
    renderModal();
    await chooseCollectionSource(user);

    await user.type(screen.getByLabelText('Spec Name'), 'my-own-name');
    await user.click(screen.getByTestId(`api-spec-collection-option-${PETSTORE.uid}`));

    await waitFor(() => expect(window.ipcRenderer.invoke).toHaveBeenCalledWith(
      'renderer:get-collection-json',
      PETSTORE.pathname
    ));
    expect(screen.getByLabelText('Spec Name')).toHaveValue('my-own-name');
  });

  it('gives each source its own name and location, and restores them on return', async () => {
    const user = userEvent.setup();
    browseDirectory.mockReturnValue(Promise.resolve('/home/dev/Documents/specs'));
    renderModal();
    await chooseCollectionSource(user);

    await user.click(screen.getByTestId(`api-spec-collection-option-${PETSTORE.uid}`));
    await waitFor(() => expect(screen.getByLabelText('Spec Name')).toHaveValue('Petstore'));
    await user.click(screen.getByTestId('api-spec-advanced-settings-toggle'));
    await user.click(screen.getByLabelText('Spec Location'));
    await waitFor(() => expect(screen.getByLabelText('Spec Location')).toHaveValue('/home/dev/Documents/specs'));

    await user.click(screen.getByLabelText('API Spec'));
    expect(screen.getByLabelText('Spec Name')).toHaveValue('');
    expect(screen.getByLabelText('Spec Location')).toHaveValue('/home/dev/workspaces/team/apispec');

    await user.click(screen.getByLabelText('Collection'));
    expect(screen.getByLabelText('Spec Name')).toHaveValue('Petstore');
    expect(screen.getByLabelText('Spec Location')).toHaveValue('/home/dev/Documents/specs');
  });

  it('shows one collection tab at a time and remembers what each had picked', async () => {
    const user = userEvent.setup();
    browseDirectory.mockReturnValue(Promise.resolve('/home/dev/elsewhere/outside-collection'));
    renderModal();
    await chooseCollectionSource(user);

    await user.click(screen.getByTestId(`api-spec-collection-option-${PETSTORE.uid}`));
    expect(screen.queryByPlaceholderText('Choose file...')).not.toBeInTheDocument();

    await chooseFileSystemSource(user);
    expect(screen.queryByTestId('api-spec-collection-trigger')).not.toBeInTheDocument();
    await user.click(screen.getByPlaceholderText('Choose file...'));
    await waitFor(() => expect(
      screen.getByPlaceholderText('Choose file...')
    ).toHaveValue('/home/dev/elsewhere/outside-collection'));

    await user.click(screen.getByRole('radio', { name: 'Select from existing' }));
    expect(screen.getByTestId('api-spec-collection-trigger')).toHaveTextContent('Petstore');
  });

  it('only offers Browse once the file system field holds a path', async () => {
    const user = userEvent.setup();
    browseDirectory.mockReturnValue(Promise.resolve('/home/dev/elsewhere/outside-collection'));
    renderModal();
    await chooseCollectionSource(user);
    await chooseFileSystemSource(user);

    expect(screen.queryByText('Browse')).not.toBeInTheDocument();

    await user.click(screen.getByPlaceholderText('Choose file...'));

    await waitFor(() => expect(screen.getByText('Browse')).toBeInTheDocument());
  });

  it('rejects a name already taken, whether the clash is known to the app or found on disk', async () => {
    const user = userEvent.setup();
    renderModal({
      apiSpecs: [{ uid: 's1', name: 'petstore', pathname: '/home/dev/workspaces/team/apispec/petstore.yaml' }]
    });

    await user.type(screen.getByLabelText('Spec Name'), 'petstore');
    await user.click(screen.getByText('Create'));

    await waitFor(() => expect(
      screen.getByText('A spec with this name already exists in this location')
    ).toBeInTheDocument());
    expect(createApiSpecFile).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Spec Name'), '-v2');
    await waitFor(() => expect(
      screen.queryByText('A spec with this name already exists in this location')
    ).not.toBeInTheDocument());

    createApiSpecFile.mockImplementation(
      () => Promise.reject(new Error('path: /home/dev/workspaces/team/apispec/petstore-v2.yaml already exists'))
    );
    await user.click(screen.getByLabelText('API Spec'));
    await user.type(screen.getByLabelText('Spec Name'), 'petstore-v2');
    await user.click(screen.getByText('Create'));

    await waitFor(() => expect(
      screen.getByText('A spec with this name already exists in this location')
    ).toBeInTheDocument());
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('does not export the previous collection when a later one fails to load', async () => {
    const user = userEvent.setup();
    renderModal();
    await chooseCollectionSource(user);

    await user.click(screen.getByTestId(`api-spec-collection-option-${PETSTORE.uid}`));
    await waitFor(() => expect(screen.getByLabelText('Spec Name')).toHaveValue('Petstore'));

    window.ipcRenderer.invoke = jest.fn(() => Promise.reject(new Error('EACCES')));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await user.click(screen.getByTestId(`api-spec-collection-option-${BILLING.uid}`));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('EACCES'));

    await user.click(screen.getByText('Create'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      'Could not load that collection. Pick a folder that contains a bruno.json or opencollection.yml.'
    ));
    expect(exportApiSpec).not.toHaveBeenCalled();
    expect(createApiSpecFile).not.toHaveBeenCalled();
    console.error.mockRestore();
  });

  it('treats a name as taken whatever extension the existing spec has', async () => {
    const user = userEvent.setup();

    renderModal({
      apiSpecs: [{ uid: 's1', name: 'petstore', pathname: '/home/dev/workspaces/team/apispec/petstore.yaml' }]
    });
    await user.click(screen.getByLabelText('API Spec'));

    await user.type(screen.getByLabelText('Spec Name'), 'petstore');
    await user.click(screen.getByText('Create'));

    await waitFor(() => expect(
      screen.getByText('A spec with this name already exists in this location')
    ).toBeInTheDocument());
    expect(createApiSpecFile).not.toHaveBeenCalled();
  });

  it('does not carry a failed submit\'s errors onto a source or tab just opened', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByText('Create'));
    await waitFor(() => expect(screen.getByText('Collection is required')).toBeInTheDocument());

    await chooseFileSystemSource(user);
    expect(screen.queryByText('Collection location is required')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('From URL'));
    expect(screen.queryByText('Spec URL is required')).not.toBeInTheDocument();
    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
  });

  it('keeps the prefilled Spec Location behind Advanced settings, opening it if it blocks submit', async () => {
    const user = userEvent.setup();
    const firstRender = renderModal();

    expect(screen.queryByLabelText('Spec Location')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('api-spec-advanced-settings-toggle'));
    expect(screen.getByLabelText('Spec Location')).toHaveValue('/home/dev/workspaces/team/apispec');
    await user.click(screen.getByTestId('api-spec-advanced-settings-toggle'));
    expect(screen.queryByLabelText('Spec Location')).not.toBeInTheDocument();

    firstRender.unmount();
    useDefaultApiSpecLocation.mockReturnValue('');
    renderModal();
    await user.type(screen.getByLabelText('Spec Name'), 'my-spec');
    await user.click(screen.getByText('Create'));

    await waitFor(() => expect(screen.getByLabelText('Spec Location')).toBeInTheDocument());
    expect(screen.getByText('location is required')).toBeInTheDocument();
  });

  it('generates the same spec whether the collection came from the dropdown or from a path', async () => {
    const user = userEvent.setup();

    const firstRender = renderModal();
    await chooseCollectionSource(user);
    await user.click(screen.getByTestId(`api-spec-collection-option-${PETSTORE.uid}`));
    await waitFor(() => expect(screen.getByLabelText('Spec Name')).toHaveValue('Petstore'));
    await user.clear(screen.getByLabelText('Spec Name'));
    await user.type(screen.getByLabelText('Spec Name'), 'petstore-spec');
    await user.click(screen.getByText('Create'));
    await waitFor(() => expect(exportApiSpec).toHaveBeenCalled());
    const fromDropdown = exportApiSpec.mock.calls[0][0];
    const fileFromDropdown = createApiSpecFile.mock.calls[0];

    exportApiSpec.mockClear();
    createApiSpecFile.mockClear();
    firstRender.unmount();

    browseDirectory.mockReturnValue(Promise.resolve(PETSTORE.pathname));
    const { getByPlaceholderText, getByLabelText, getByText, getByRole } = render(withTheme(<CreateApiSpec onClose={jest.fn()} />));
    await user.click(getByLabelText('Collection'));
    await user.click(getByRole('radio', { name: 'From file system' }));
    await user.click(getByPlaceholderText('Choose file...'));
    await waitFor(() => expect(getByLabelText('Spec Name')).toHaveValue('petstore'));
    await user.clear(getByLabelText('Spec Name'));
    await user.type(getByLabelText('Spec Name'), 'petstore-spec');
    await user.click(getByText('Create'));
    await waitFor(() => expect(exportApiSpec).toHaveBeenCalled());

    expect(exportApiSpec.mock.calls[0][0]).toEqual(fromDropdown);
    expect(createApiSpecFile.mock.calls[0]).toEqual(fileFromDropdown);
  });
});

describe('CreateApiSpec — URL source', () => {
  const SPEC_URL = 'https://example.com/specs/hotel-booking.yaml';
  const YAML_SPEC = 'openapi: 3.0.0\ninfo:\n  title: Hotel Booking API\n';
  const JSON_SPEC = '{"openapi":"3.1.0","info":{"title":"Hotel Booking API"}}';

  const openUrlSource = async (user) => {
    await user.click(screen.getByLabelText('From URL'));
  };

  const typeUrlAndBlur = async (user, url = SPEC_URL) => {
    await user.type(screen.getByTestId('api-spec-url'), url);
    await user.tab();
  };

  beforeEach(() => {
    useDispatch.mockReturnValue(jest.fn((action) => action));
    useDefaultApiSpecLocation.mockReturnValue('/home/dev/workspaces/team/apispec');
    createApiSpecFile.mockImplementation(() => Promise.resolve());
    window.ipcRenderer = { invoke: jest.fn(() => Promise.resolve({})) };
    fetchAndValidateApiSpecFromUrl.mockImplementation(() => Promise.resolve({
      data: { openapi: '3.0.0', info: { title: 'Hotel Booking API' } },
      specType: 'openapi',
      rawContent: YAML_SPEC
    }));
  });

  it('swaps the collection inputs for a URL field', async () => {
    const user = userEvent.setup();
    renderModal();
    await openUrlSource(user);

    expect(screen.getByTestId('api-spec-url')).toBeInTheDocument();
    expect(screen.queryByTestId('api-spec-collection-source')).not.toBeInTheDocument();
    expect(screen.queryByTestId('api-spec-environment-trigger')).not.toBeInTheDocument();
  });

  it('fetches through the shared helper and fills the name from the spec title', async () => {
    const user = userEvent.setup();
    renderModal();
    await openUrlSource(user);
    await typeUrlAndBlur(user);

    await waitFor(() => expect(screen.getByLabelText('Spec Name')).toHaveValue('Hotel Booking API'));
    expect(fetchAndValidateApiSpecFromUrl).toHaveBeenCalledWith({ url: SPEC_URL });
  });

  it('falls back to the file name in the URL when the spec has no usable title', async () => {
    const user = userEvent.setup();
    fetchAndValidateApiSpecFromUrl.mockImplementation(() => Promise.resolve({
      data: { openapi: '3.0.0', info: {} },
      specType: 'openapi',
      rawContent: YAML_SPEC
    }));
    renderModal();
    await openUrlSource(user);
    await typeUrlAndBlur(user);

    await waitFor(() => expect(screen.getByLabelText('Spec Name')).toHaveValue('hotel-booking'));
  });

  it('rejects anything that is not an OpenAPI 3.x spec, with the reason shown', async () => {
    const user = userEvent.setup();

    fetchAndValidateApiSpecFromUrl.mockImplementation(() => Promise.resolve({
      data: { swagger: '2.0', info: { title: 'Legacy API' } },
      specType: 'openapi',
      rawContent: 'swagger: "2.0"'
    }));
    const firstRender = renderModal();
    await openUrlSource(user);
    await typeUrlAndBlur(user);

    await waitFor(() => expect(screen.getByTestId('api-spec-url-error')).toHaveTextContent(
      'Swagger 2.0 is not supported. Provide an OpenAPI 3.x specification.'
    ));
    expect(screen.getByLabelText('Spec Name')).toHaveValue('');
    firstRender.unmount();

    fetchAndValidateApiSpecFromUrl.mockImplementation(() => Promise.resolve({
      data: { info: { _postman_id: 'abc' } },
      specType: 'postman',
      rawContent: '{}'
    }));
    renderModal();
    await openUrlSource(user);
    await typeUrlAndBlur(user);

    await waitFor(() => expect(screen.getByTestId('api-spec-url-error')).toHaveTextContent(
      'That URL does not return an OpenAPI specification.'
    ));
  });

  it('surfaces a failed fetch in the modal', async () => {
    const user = userEvent.setup();
    fetchAndValidateApiSpecFromUrl.mockImplementation(
      () => Promise.reject(new Error('Failed to fetch API specification: getaddrinfo ENOTFOUND'))
    );
    renderModal();
    await openUrlSource(user);
    await typeUrlAndBlur(user);

    await waitFor(() => expect(screen.getByTestId('api-spec-url-error')).toHaveTextContent('ENOTFOUND'));
  });

  it('shows progress and disables Create while fetching', async () => {
    const user = userEvent.setup();
    let releaseFetch;
    fetchAndValidateApiSpecFromUrl.mockImplementation(() => new Promise((resolve) => {
      releaseFetch = () => resolve({
        data: { openapi: '3.0.0', info: { title: 'Hotel Booking API' } },
        specType: 'openapi',
        rawContent: YAML_SPEC
      });
    }));
    renderModal();
    await openUrlSource(user);
    await typeUrlAndBlur(user);

    await waitFor(() => expect(screen.getByTestId('api-spec-url-loading')).toBeInTheDocument());
    expect(screen.getByText('Create')).toBeDisabled();

    releaseFetch();

    await waitFor(() => expect(screen.queryByTestId('api-spec-url-loading')).not.toBeInTheDocument());
    expect(screen.getByText('Create')).toBeEnabled();
  });

  it('writes the spec exactly as served, with the matching extension, fetching only once', async () => {
    const user = userEvent.setup();
    const firstRender = renderModal();
    await openUrlSource(user);
    await typeUrlAndBlur(user);
    await waitFor(() => expect(screen.getByLabelText('Spec Name')).toHaveValue('Hotel Booking API'));
    await user.click(screen.getByText('Create'));

    await waitFor(() => expect(createApiSpecFile).toHaveBeenCalledWith(
      'Hotel Booking API.yaml',
      '/home/dev/workspaces/team/apispec',
      YAML_SPEC
    ));
    expect(exportApiSpec).not.toHaveBeenCalled();

    expect(fetchAndValidateApiSpecFromUrl).toHaveBeenCalledTimes(1);
    firstRender.unmount();
    createApiSpecFile.mockClear();

    fetchAndValidateApiSpecFromUrl.mockImplementation(() => Promise.resolve({
      data: { openapi: '3.1.0', info: { title: 'Hotel Booking API' } },
      specType: 'openapi',
      rawContent: JSON_SPEC
    }));
    renderModal();
    await openUrlSource(user);
    await typeUrlAndBlur(user);
    await waitFor(() => expect(screen.getByLabelText('Spec Name')).toHaveValue('Hotel Booking API'));
    await user.click(screen.getByText('Create'));

    await waitFor(() => expect(createApiSpecFile).toHaveBeenCalledWith(
      'Hotel Booking API.json',
      '/home/dev/workspaces/team/apispec',
      JSON_SPEC
    ));
  });

  it('does not let a fetched JSON spec decide the extension for another source', async () => {
    const user = userEvent.setup();
    fetchAndValidateApiSpecFromUrl.mockImplementation(() => Promise.resolve({
      data: { openapi: '3.1.0', info: { title: 'Hotel Booking API' } },
      specType: 'openapi',
      rawContent: JSON_SPEC
    }));
    renderModal();
    await openUrlSource(user);
    await typeUrlAndBlur(user);
    await waitFor(() => expect(screen.getByText('.json')).toBeInTheDocument());

    await user.click(screen.getByLabelText('API Spec'));
    expect(screen.getByText('.yaml')).toBeInTheDocument();
    expect(screen.queryByText('.json')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('From URL'));
    expect(screen.getByText('.json')).toBeInTheDocument();
  });

  it('fetches on Enter without also submitting the form', async () => {
    const user = userEvent.setup();
    renderModal();
    await openUrlSource(user);

    await user.type(screen.getByTestId('api-spec-url'), SPEC_URL);
    await user.keyboard('{Enter}');

    await waitFor(() => expect(fetchAndValidateApiSpecFromUrl).toHaveBeenCalledTimes(1));

    expect(createApiSpecFile).not.toHaveBeenCalled();
  });

  it('rejects a URL whose scheme is not http(s)', async () => {
    const user = userEvent.setup();
    renderModal();
    await openUrlSource(user);

    await typeUrlAndBlur(user, 'file:///etc/passwd');

    await waitFor(() => expect(screen.getByTestId('api-spec-url-error')).toHaveTextContent(
      'Enter a valid http(s) URL'
    ));
    expect(fetchAndValidateApiSpecFromUrl).not.toHaveBeenCalled();
  });

  it('fetches on Create when the URL field was never blurred', async () => {
    renderModal();

    fireEvent.click(screen.getByLabelText('From URL'));
    fireEvent.change(screen.getByLabelText('Spec Name'), { target: { value: 'hotel' } });
    fireEvent.change(screen.getByTestId('api-spec-url'), { target: { value: SPEC_URL } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => expect(createApiSpecFile).toHaveBeenCalledWith(
      'hotel.yaml',
      '/home/dev/workspaces/team/apispec',
      YAML_SPEC
    ));
  });
});
