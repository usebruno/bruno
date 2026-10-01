import React from 'react';
import { act, render, screen, waitFor, fireEvent } from '@testing-library/react';
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

let mockUseRealModal = false;
jest.mock('components/Modal', () => {
  const ActualModal = jest.requireActual('components/Modal').default;
  return (props) => (mockUseRealModal ? <ActualModal {...props} /> : (
    <div>
      <h1>{props.title}</h1>
      {props.children}
      <button type="button" disabled={props.confirmDisabled} onClick={props.handleConfirm}>{props.confirmText}</button>
    </div>
  ));
});

jest.mock('ui/MenuDropdown', () => ({ items, children, 'data-testid': testId = 'menu-dropdown' }) => (
  <div>
    {children}
    {items.map((item) => (
      <button
        key={item.id}
        type="button"
        data-testid={`${testId}-${String(item.id).toLowerCase()}`}
        onClick={item.onClick}
      >
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
  await user.click(screen.getByLabelText('From Bruno Collection'));
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

  it('disables the workspace tab when there are no collections, falling through to the file system', async () => {
    const user = userEvent.setup();
    renderModal({ workspaceCollections: [SCRATCH, OTHER_WORKSPACE_COLLECTION] });
    await chooseCollectionSource(user);

    // The tab is disabled, and the file system field is live without a click.
    expect(screen.getByRole('radio', { name: 'From workspace' })).toBeDisabled();
    expect(screen.queryByTestId('api-spec-collection-trigger')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Choose file...')).toBeInTheDocument();
  });

  it('prefills the name from the collection, sanitized, or from a browsed folder, and loads environments', async () => {
    const user = userEvent.setup();
    browseDirectory.mockReturnValue(Promise.resolve('/home/dev/elsewhere/outside-collection'));
    renderModal();
    await chooseCollectionSource(user);

    await user.click(screen.getByTestId(`api-spec-collection-dropdown-${PETSTORE.uid}`));

    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Petstore'));
    expect(screen.getByTestId('api-spec-environment-trigger')).toHaveTextContent('local');

    await user.click(screen.getByTestId(`api-spec-collection-dropdown-${BILLING.uid}`));
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Billing- v2'));

    await chooseFileSystemSource(user);
    await user.click(screen.getByPlaceholderText('Choose file...'));
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('outside-collection'));
  });

  it('never overwrites a name the user already typed', async () => {
    const user = userEvent.setup();
    renderModal();
    await chooseCollectionSource(user);

    await user.type(screen.getByLabelText('Name'), 'my-own-name');
    await user.click(screen.getByTestId(`api-spec-collection-dropdown-${PETSTORE.uid}`));

    await waitFor(() => expect(window.ipcRenderer.invoke).toHaveBeenCalledWith(
      'renderer:get-collection-json',
      PETSTORE.pathname
    ));
    expect(screen.getByLabelText('Name')).toHaveValue('my-own-name');
  });

  it('resumes prefilling the name once the user clears it, for collections and URLs', async () => {
    const user = userEvent.setup();
    fetchAndValidateApiSpecFromUrl.mockImplementation(({ url }) => Promise.resolve({
      data: { openapi: '3.0.0', info: { title: url.includes('hotels') ? 'Hotels API' : 'Flights API' } },
      specType: 'openapi',
      rawContent: 'openapi: 3.0.0\n'
    }));
    renderModal();
    await chooseCollectionSource(user);

    await user.click(screen.getByTestId(`api-spec-collection-dropdown-${PETSTORE.uid}`));
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Petstore'));

    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'my-own-name');
    await user.clear(screen.getByLabelText('Name'));
    await user.click(screen.getByTestId(`api-spec-collection-dropdown-${BILLING.uid}`));
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Billing- v2'));

    await user.click(screen.getByLabelText('From Spec URL'));
    await user.type(screen.getByTestId('api-spec-url'), 'https://example.com/hotels.yaml');
    await user.tab();
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Hotels API'));

    await user.type(screen.getByLabelText('Name'), '-mine');
    await user.clear(screen.getByLabelText('Name'));
    await user.clear(screen.getByTestId('api-spec-url'));
    await user.type(screen.getByTestId('api-spec-url'), 'https://example.com/flights.yaml');
    await user.tab();
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Flights API'));
  });

  it('remembers each source\'s name and location, and each collection tab\'s pick, on return', async () => {
    const user = userEvent.setup();
    browseDirectory
      .mockReturnValueOnce(Promise.resolve('/home/dev/elsewhere/outside-collection'))
      .mockReturnValueOnce(Promise.resolve('/home/dev/Documents/specs'));
    renderModal();
    await chooseCollectionSource(user);

    await user.click(screen.getByTestId(`api-spec-collection-dropdown-${PETSTORE.uid}`));
    expect(screen.queryByPlaceholderText('Choose file...')).not.toBeInTheDocument();

    await chooseFileSystemSource(user);
    expect(screen.queryByTestId('api-spec-collection-trigger')).not.toBeInTheDocument();
    await user.click(screen.getByPlaceholderText('Choose file...'));
    await waitFor(() => expect(
      screen.getByPlaceholderText('Choose file...')
    ).toHaveValue('/home/dev/elsewhere/outside-collection'));

    await user.click(screen.getByRole('radio', { name: 'From workspace' }));
    expect(screen.getByTestId('api-spec-collection-trigger')).toHaveTextContent('Petstore');
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Petstore'));

    await user.click(screen.getByLabelText('Location'));
    await waitFor(() => expect(screen.getByLabelText('Location')).toHaveValue('/home/dev/Documents/specs'));

    await user.click(screen.getByLabelText('Blank Spec'));
    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.getByLabelText('Location')).toHaveValue('/home/dev/workspaces/team/apispec');

    await user.click(screen.getByLabelText('From Bruno Collection'));
    expect(screen.getByLabelText('Name')).toHaveValue('Petstore');
    expect(screen.getByLabelText('Location')).toHaveValue('/home/dev/Documents/specs');
  });

  it('rejects a name already taken, whether the clash is known to the app or found on disk', async () => {
    const user = userEvent.setup();
    renderModal({
      apiSpecs: [{ uid: 's1', name: 'petstore', pathname: '/home/dev/workspaces/team/apispec/petstore.yaml' }]
    });

    await user.type(screen.getByLabelText('Name'), 'petstore');
    await user.click(screen.getByText('Create'));

    await waitFor(() => expect(
      screen.getByText('A spec with this name already exists in this location')
    ).toBeInTheDocument());
    expect(createApiSpecFile).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Name'), '-v2');
    await waitFor(() => expect(
      screen.queryByText('A spec with this name already exists in this location')
    ).not.toBeInTheDocument());

    createApiSpecFile.mockImplementation(
      () => Promise.reject(new Error('path: /home/dev/workspaces/team/apispec/petstore-v2.yaml already exists'))
    );
    await user.click(screen.getByLabelText('Blank Spec'));
    await user.type(screen.getByLabelText('Name'), 'petstore-v2');
    await user.click(screen.getByText('Create'));

    await waitFor(() => expect(
      screen.getByText('A spec with this name already exists in this location')
    ).toBeInTheDocument());
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('shows a failed collection load under the field, and does not export the previous collection', async () => {
    const user = userEvent.setup();
    renderModal();
    await chooseCollectionSource(user);

    await user.click(screen.getByTestId(`api-spec-collection-dropdown-${PETSTORE.uid}`));
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Petstore'));

    window.ipcRenderer.invoke = jest.fn(() => Promise.reject(new Error(
      `Error invoking remote method 'renderer:get-collection-json': Error: No bruno.json or opencollection.yml found in ${BILLING.pathname}`
    )));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await user.click(screen.getByTestId(`api-spec-collection-dropdown-${BILLING.uid}`));
    await waitFor(() => expect(
      screen.getByText(`No bruno.json or opencollection.yml found in ${BILLING.pathname}`)
    ).toBeInTheDocument());
    expect(toast.error).not.toHaveBeenCalled();

    await user.click(screen.getByText('Create'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      'Could not load that collection. Pick a folder that contains a bruno.json or opencollection.yml.'
    ));
    expect(exportApiSpec).not.toHaveBeenCalled();
    expect(createApiSpecFile).not.toHaveBeenCalled();
    console.error.mockRestore();
  });

  it('does not export the previous collection while the next one is still loading', async () => {
    const user = userEvent.setup();
    let finishLoadingBilling;
    const defaultInvoke = window.ipcRenderer.invoke;
    window.ipcRenderer.invoke = jest.fn((channel, pathname) => {
      if (channel === 'renderer:get-collection-json' && pathname === BILLING.pathname) {
        return new Promise((resolve) => {
          finishLoadingBilling = () => resolve(COLLECTION_JSON[pathname]);
        });
      }
      return defaultInvoke(channel, pathname);
    });
    renderModal();
    await chooseCollectionSource(user);

    await user.click(screen.getByTestId(`api-spec-collection-dropdown-${PETSTORE.uid}`));
    await waitFor(() => expect(screen.getByText('Create')).toBeEnabled());
    await user.click(screen.getByTestId(`api-spec-collection-dropdown-${BILLING.uid}`));

    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Billing- v2'));
    expect(screen.getByText('Create')).toBeDisabled();

    finishLoadingBilling();
    await waitFor(() => expect(screen.getByText('Create')).toBeEnabled());
    await user.click(screen.getByText('Create'));

    await waitFor(() => expect(exportApiSpec).toHaveBeenCalledTimes(1));
    expect(exportApiSpec).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Billing- v2',
      items: [{ name: 'list invoices' }]
    }));
  });

  it('does not carry a failed submit\'s errors onto a source or tab just opened', async () => {
    const user = userEvent.setup();
    renderModal();
    await chooseCollectionSource(user);

    await user.click(screen.getByText('Create'));
    await waitFor(() => expect(screen.getByText('Collection is required')).toBeInTheDocument());

    await chooseFileSystemSource(user);
    expect(screen.queryByText('Collection location is required')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('From Spec URL'));
    expect(screen.queryByText('Spec URL is required')).not.toBeInTheDocument();
    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
  });

  it('always shows the prefilled Location, and its error when it blocks submit', async () => {
    const user = userEvent.setup();
    const firstRender = renderModal();

    expect(screen.getByLabelText('Location')).toHaveValue('/home/dev/workspaces/team/apispec');

    firstRender.unmount();
    useDefaultApiSpecLocation.mockReturnValue('');
    renderModal();
    await user.type(screen.getByLabelText('Name'), 'my-spec');
    await user.click(screen.getByText('Create'));

    await waitFor(() => expect(screen.getByText('location is required')).toBeInTheDocument());
    expect(createApiSpecFile).not.toHaveBeenCalled();
  });
});

describe('CreateApiSpec — URL source', () => {
  const SPEC_URL = 'https://example.com/specs/hotel-booking.yaml';
  const YAML_SPEC = 'openapi: 3.0.0\ninfo:\n  title: Hotel Booking API\n';
  const JSON_SPEC = '{"openapi":"3.1.0","info":{"title":"Hotel Booking API"}}';

  const openUrlSource = async (user) => {
    await user.click(screen.getByLabelText('From Spec URL'));
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

  it('fetches through the shared helper, fills the name from the spec title, and clears it when the URL is emptied', async () => {
    const user = userEvent.setup();
    renderModal();
    await openUrlSource(user);
    await typeUrlAndBlur(user);

    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Hotel Booking API'));
    expect(fetchAndValidateApiSpecFromUrl).toHaveBeenCalledWith({ url: SPEC_URL });

    await user.clear(screen.getByTestId('api-spec-url'));
    expect(screen.getByLabelText('Name')).toHaveValue('');
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

    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('hotel-booking'));
  });

  it('only lets the newest fetch update the form, keeping Create disabled until it finishes', async () => {
    const user = userEvent.setup();
    const HOTELS_URL = 'https://slow.example.com/hotels.yaml';
    const FLIGHTS_URL = 'https://fast.example.com/flights.json';
    const pendingFetches = {};
    fetchAndValidateApiSpecFromUrl.mockImplementation(({ url }) => new Promise((resolve) => {
      pendingFetches[url] = () => resolve(url === HOTELS_URL
        ? { data: { openapi: '3.0.0', info: { title: 'Hotels API' } }, specType: 'openapi', rawContent: 'openapi: 3.0.0\n' }
        : { data: { openapi: '3.0.0', info: { title: 'Flights API' } }, specType: 'openapi', rawContent: '{"openapi":"3.0.0"}' });
    }));
    renderModal();
    await openUrlSource(user);

    await typeUrlAndBlur(user, HOTELS_URL);
    await user.clear(screen.getByTestId('api-spec-url'));
    await typeUrlAndBlur(user, FLIGHTS_URL);

    await act(async () => pendingFetches[HOTELS_URL]());
    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.getByTestId('api-spec-url-loading')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeDisabled();

    await act(async () => pendingFetches[FLIGHTS_URL]());
    expect(screen.getByLabelText('Name')).toHaveValue('Flights API');
    expect(screen.getByText('.json')).toBeInTheDocument();
    expect(screen.queryByTestId('api-spec-url-loading')).not.toBeInTheDocument();
    expect(screen.getByText('Create')).toBeEnabled();
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
    expect(screen.getByLabelText('Name')).toHaveValue('');
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

  it('explains a failed fetch instead of showing the raw error', async () => {
    const user = userEvent.setup();
    // What Electron actually throws, wrappers and all.
    fetchAndValidateApiSpecFromUrl.mockImplementation(() => Promise.reject(new Error(
      'Failed to fetch API specification: Error invoking remote method \'renderer:fetch-api-spec\': Error: connect ECONNREFUSED 127.0.0.1:8000'
    )));
    renderModal();
    await openUrlSource(user);
    await typeUrlAndBlur(user);

    await waitFor(() => expect(screen.getByTestId('api-spec-url-error')).toHaveTextContent(
      'Nothing is listening at example.com. Check the URL, or start the server.'
    ));
    expect(screen.getByTestId('api-spec-url-error')).not.toHaveTextContent('ECONNREFUSED');
  });

  it('writes the spec exactly as served, with the matching extension, fetching only once', async () => {
    const user = userEvent.setup();
    const firstRender = renderModal();
    await openUrlSource(user);
    await typeUrlAndBlur(user);
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Hotel Booking API'));
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
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Hotel Booking API'));
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

    await user.click(screen.getByLabelText('Blank Spec'));
    expect(screen.getByText('.yaml')).toBeInTheDocument();
    expect(screen.queryByText('.json')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('From Spec URL'));
    expect(screen.getByText('.json')).toBeInTheDocument();
  });

  it('fetches on Enter without also submitting the form', async () => {
    const user = userEvent.setup();
    mockUseRealModal = true;
    try {
      renderModal();
      await openUrlSource(user);
      await user.type(screen.getByLabelText('Name'), 'hotel');
      await user.type(screen.getByTestId('api-spec-url'), SPEC_URL);
      // The real Modal listens for keyCode 13, which user-event leaves at 0.
      fireEvent.keyDown(screen.getByTestId('api-spec-url'), { key: 'Enter', code: 'Enter', keyCode: 13 });

      await waitFor(() => expect(fetchAndValidateApiSpecFromUrl).toHaveBeenCalledTimes(1));
      await act(async () => {});
      expect(createApiSpecFile).not.toHaveBeenCalled();
    } finally {
      mockUseRealModal = false;
    }
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

  it('fetches on Create when the URL field was never blurred, once a name is typed', async () => {
    renderModal();

    fireEvent.click(screen.getByLabelText('From Spec URL'));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'hotel' } });
    fireEvent.change(screen.getByTestId('api-spec-url'), { target: { value: SPEC_URL } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => expect(createApiSpecFile).toHaveBeenCalledWith(
      'hotel.yaml',
      '/home/dev/workspaces/team/apispec',
      YAML_SPEC
    ));
  });
});

describe('CreateApiSpec — each source keeps its own data', () => {
  const SPEC_URL = 'https://example.com/specs/hotel-booking.json';
  const JSON_SPEC = '{"openapi":"3.1.0","info":{"title":"Hotel Booking API"}}';
  const DEFAULT_LOCATION = '/home/dev/workspaces/team/apispec';

  const chooseSource = (user, label) => user.click(screen.getByLabelText(label));
  const chooseTab = (user, name) => user.click(screen.getByRole('radio', { name }));
  const typeName = async (user, name) => {
    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), name);
  };
  const fetchSpecUrl = async (user) => {
    await user.type(screen.getByTestId('api-spec-url'), SPEC_URL);
    await user.tab();
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Hotel Booking API'));
  };
  const pickPetstore = async (user) => {
    await user.click(screen.getByTestId(`api-spec-collection-dropdown-${PETSTORE.uid}`));
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Petstore'));
  };

  beforeEach(() => {
    useDispatch.mockReturnValue(jest.fn((action) => action));
    useDefaultApiSpecLocation.mockReturnValue(DEFAULT_LOCATION);
    createApiSpecFile.mockImplementation(() => Promise.resolve());
    window.ipcRenderer = {
      invoke: jest.fn((channel, pathname) => Promise.resolve(
        channel === 'renderer:get-collection-json' ? COLLECTION_JSON[pathname] : undefined
      ))
    };
    fetchAndValidateApiSpecFromUrl.mockImplementation(() => Promise.resolve({
      data: { openapi: '3.1.0', info: { title: 'Hotel Booking API' } },
      specType: 'openapi',
      rawContent: JSON_SPEC
    }));
  });

  it('keeps a name typed in one source or collection tab out of every other', async () => {
    const user = userEvent.setup();
    browseDirectory.mockReturnValue(Promise.resolve('/home/dev/elsewhere/outside-collection'));
    renderModal();

    await typeName(user, 'blank-name');

    await chooseSource(user, 'From Spec URL');
    expect(screen.getByLabelText('Name')).toHaveValue('');
    await fetchSpecUrl(user);
    await typeName(user, 'url-name');

    await chooseSource(user, 'From Bruno Collection');
    expect(screen.getByLabelText('Name')).toHaveValue('');
    await pickPetstore(user);
    await typeName(user, 'workspace-name');

    await chooseTab(user, 'From file system');
    expect(screen.getByLabelText('Name')).toHaveValue('');
    await user.click(screen.getByPlaceholderText('Choose file...'));
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('outside-collection'));
    await typeName(user, 'filesystem-name');

    await chooseTab(user, 'From workspace');
    expect(screen.getByLabelText('Name')).toHaveValue('workspace-name');
    await chooseSource(user, 'From Spec URL');
    expect(screen.getByLabelText('Name')).toHaveValue('url-name');
    await chooseSource(user, 'Blank Spec');
    expect(screen.getByLabelText('Name')).toHaveValue('blank-name');
    await chooseSource(user, 'From Bruno Collection');
    expect(screen.getByLabelText('Name')).toHaveValue('workspace-name');
    await chooseTab(user, 'From file system');
    expect(screen.getByLabelText('Name')).toHaveValue('filesystem-name');
  });

  it('keeps a location picked in one source or collection tab out of every other', async () => {
    const user = userEvent.setup();
    browseDirectory
      .mockReturnValueOnce(Promise.resolve('/home/dev/specs/blank'))
      .mockReturnValueOnce(Promise.resolve('/home/dev/specs/url'))
      .mockReturnValueOnce(Promise.resolve('/home/dev/specs/workspace'));
    renderModal();

    await user.click(screen.getByLabelText('Location'));
    await waitFor(() => expect(screen.getByLabelText('Location')).toHaveValue('/home/dev/specs/blank'));

    await chooseSource(user, 'From Spec URL');
    expect(screen.getByLabelText('Location')).toHaveValue(DEFAULT_LOCATION);
    await user.click(screen.getByLabelText('Location'));
    await waitFor(() => expect(screen.getByLabelText('Location')).toHaveValue('/home/dev/specs/url'));

    await chooseSource(user, 'From Bruno Collection');
    expect(screen.getByLabelText('Location')).toHaveValue(DEFAULT_LOCATION);
    await user.click(screen.getByLabelText('Location'));
    await waitFor(() => expect(screen.getByLabelText('Location')).toHaveValue('/home/dev/specs/workspace'));

    await chooseTab(user, 'From file system');
    expect(screen.getByLabelText('Location')).toHaveValue(DEFAULT_LOCATION);

    await chooseTab(user, 'From workspace');
    expect(screen.getByLabelText('Location')).toHaveValue('/home/dev/specs/workspace');
    await chooseSource(user, 'From Spec URL');
    expect(screen.getByLabelText('Location')).toHaveValue('/home/dev/specs/url');
    await chooseSource(user, 'Blank Spec');
    expect(screen.getByLabelText('Location')).toHaveValue('/home/dev/specs/blank');
  });

  it('creates a blank spec without content from the URL or collection visited before', async () => {
    const user = userEvent.setup();
    renderModal();

    await chooseSource(user, 'From Spec URL');
    await fetchSpecUrl(user);
    await chooseSource(user, 'From Bruno Collection');
    await pickPetstore(user);

    await chooseSource(user, 'Blank Spec');
    await typeName(user, 'blank-name');
    await user.click(screen.getByText('Create'));

    await waitFor(() => expect(createApiSpecFile).toHaveBeenCalledWith('blank-name.yaml', DEFAULT_LOCATION, ''));
    expect(exportApiSpec).not.toHaveBeenCalled();
    expect(fetchAndValidateApiSpecFromUrl).toHaveBeenCalledTimes(1);
  });

  it('creates a URL spec from the URL only, ignoring a collection picked earlier', async () => {
    const user = userEvent.setup();
    renderModal();

    await chooseSource(user, 'From Bruno Collection');
    await pickPetstore(user);

    await chooseSource(user, 'From Spec URL');
    await fetchSpecUrl(user);
    await user.click(screen.getByText('Create'));

    await waitFor(() => expect(createApiSpecFile).toHaveBeenCalledWith('Hotel Booking API.json', DEFAULT_LOCATION, JSON_SPEC));
    expect(exportApiSpec).not.toHaveBeenCalled();
  });

  it('creates a collection spec from the collection only, ignoring a URL fetched earlier', async () => {
    const user = userEvent.setup();
    renderModal();

    await chooseSource(user, 'From Spec URL');
    await fetchSpecUrl(user);

    await chooseSource(user, 'From Bruno Collection');
    await pickPetstore(user);
    await user.click(screen.getByText('Create'));

    await waitFor(() => expect(createApiSpecFile).toHaveBeenCalledWith('Petstore.yaml', DEFAULT_LOCATION, 'openapi: 3.0.0'));
    expect(exportApiSpec).toHaveBeenCalledWith(expect.objectContaining({ items: [{ name: 'get pet' }] }));
  });

  it('creates from the browsed folder on the file system tab, not the workspace pick', async () => {
    const user = userEvent.setup();
    browseDirectory.mockReturnValue(Promise.resolve('/home/dev/elsewhere/outside-collection'));
    renderModal();

    await chooseSource(user, 'From Bruno Collection');
    await pickPetstore(user);

    await chooseTab(user, 'From file system');
    await user.click(screen.getByPlaceholderText('Choose file...'));
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('outside-collection'));
    await user.click(screen.getByText('Create'));

    await waitFor(() => expect(createApiSpecFile).toHaveBeenCalledWith('outside-collection.yaml', DEFAULT_LOCATION, 'openapi: 3.0.0'));
    expect(exportApiSpec).toHaveBeenCalledWith(expect.objectContaining({ items: [{ name: 'ping' }] }));
  });
});
