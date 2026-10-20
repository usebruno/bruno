import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useDispatch, useSelector } from 'react-redux';
import CreateMockServerModal from './index';
import { loadMockResponsesFromSpec } from 'providers/ReduxStore/slices/mock-server/index';
import { createMockServerInstance, saveMockServerInstance } from 'utils/mock-server/mock-server-instances';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
  shallowEqual: (a, b) => a === b
}));

jest.mock('react-hot-toast', () => ({
  error: jest.fn(),
  success: jest.fn()
}));

jest.mock('components/Portal', () => ({ children }) => <div>{children}</div>);

jest.mock('components/Modal', () => ({ children, handleConfirm, handleCancel, confirmText }) => (
  <div>
    {children}
    <button type="button" data-testid="modal-submit-btn" onClick={handleConfirm}>
      {confirmText || 'Create'}
    </button>
    <button type="button" onClick={handleCancel}>Cancel</button>
  </div>
));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  mountCollection: jest.fn(() => Promise.resolve())
}));

jest.mock('providers/ReduxStore/slices/mock-server/index', () => ({
  generateMockResponsesFromSpec: jest.fn(),
  loadMockResponses: jest.fn(),
  loadMockResponsesFromSpec: jest.fn(),
  syncMockResponsesFromExamples: jest.fn()
}));

jest.mock('utils/mock-server/mock-server-instances', () => {
  const actual = jest.requireActual('utils/mock-server/mock-server-instances');
  return {
    ...actual,
    suggestAvailableMockServerPort: jest.fn().mockResolvedValue(4000),
    checkMockServerPortAvailable: jest.fn().mockResolvedValue({ available: true }),
    createMockServerInstance: jest.fn(),
    saveMockServerInstance: jest.fn(),
    openMockServerDashboard: jest.fn(),
    updateMockServerTabName: jest.fn()
  };
});

const collection = {
  uid: 'col-1',
  name: 'Shop API',
  pathname: '/tmp/shop',
  mountStatus: 'mounted'
};

const apiSpec = {
  uid: 'spec-1',
  name: 'Petstore',
  pathname: '/tmp/pet.yaml',
  filename: 'pet.yaml'
};

const storeState = {
  collections: { collections: [collection] },
  apiSpec: { apiSpecs: [apiSpec] },
  workspaces: {
    activeWorkspaceUid: 'ws-1',
    workspaces: [{
      uid: 'ws-1',
      collections: [{ path: '/tmp/shop' }],
      apiSpecs: [{ path: '/tmp/pet.yaml' }]
    }]
  },
  mockServer: { instancesByWorkspace: { 'ws-1': [] } }
};

const renderModal = () => {
  useSelector.mockImplementation((selector) => selector(storeState));
  return render(<CreateMockServerModal onClose={jest.fn()} />);
};

describe('CreateMockServerModal validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useDispatch.mockReturnValue(jest.fn(() => Promise.resolve()));
  });

  it('does not show a name error while typing, then clears it after Create once the name is filled', async () => {
    renderModal();

    fireEvent.click(screen.getByTestId('mock-server-source-manual'));
    fireEvent.change(screen.getByTestId('mock-server-name-input'), { target: { value: 'x' } });
    fireEvent.change(screen.getByTestId('mock-server-name-input'), { target: { value: '' } });
    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('modal-submit-btn'));
    expect(await screen.findByText('Name is required')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('mock-server-name-input'), {
      target: { value: 'Standalone Server' }
    });
    await waitFor(() => {
      expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
    });
  });

  it('clears the collection error when a collection is selected after Create', async () => {
    renderModal();

    fireEvent.change(screen.getByTestId('mock-server-name-input'), {
      target: { value: 'Collection Server' }
    });
    fireEvent.click(screen.getByTestId('modal-submit-btn'));
    expect(await screen.findByText('Collection is required')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('mock-server-collection-select'), {
      target: { value: 'col-1' }
    });
    await waitFor(() => {
      expect(screen.queryByText('Collection is required')).not.toBeInTheDocument();
    });
  });

  it('updates required-field errors after an invalid Create when switching to an API spec', async () => {
    renderModal();

    fireEvent.change(screen.getByTestId('mock-server-name-input'), {
      target: { value: 'Spec Server' }
    });
    fireEvent.click(screen.getByTestId('modal-submit-btn'));
    expect(await screen.findByText('Collection is required')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('mock-server-source-spec'));
    await waitFor(() => {
      expect(screen.queryByText('Collection is required')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('modal-submit-btn'));
    expect(await screen.findByText('API spec is required')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('mock-server-spec-select'), {
      target: { value: 'spec-1' }
    });
    await waitFor(() => {
      expect(screen.queryByText('API spec is required')).not.toBeInTheDocument();
    });
  });
});

describe('CreateMockServerModal API spec validation', () => {
  const submitSpecServer = () => {
    renderModal();
    fireEvent.change(screen.getByTestId('mock-server-name-input'), { target: { value: 'Spec Server' } });
    fireEvent.click(screen.getByTestId('mock-server-source-spec'));
    fireEvent.change(screen.getByTestId('mock-server-spec-select'), { target: { value: 'spec-1' } });
    fireEvent.click(screen.getByTestId('modal-submit-btn'));
  };

  const mockSpecValidation = (unwrap) => {
    loadMockResponsesFromSpec.mockReturnValue({ type: 'validate-spec' });
    useDispatch.mockReturnValue(jest.fn((action) => (
      action?.type === 'validate-spec' ? { unwrap } : Promise.resolve(action)
    )));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    createMockServerInstance.mockImplementation((values) => ({ uid: 'ms-1', ...values }));
  });

  it('does not create the mock server when the API spec is invalid', async () => {
    mockSpecValidation(() => Promise.reject(new Error('API spec does not define any paths.')));

    submitSpecServer();

    expect(await screen.findByText('API spec does not define any paths.')).toBeInTheDocument();
    expect(saveMockServerInstance).not.toHaveBeenCalled();
  });

  it('creates the mock server when the API spec is valid', async () => {
    mockSpecValidation(() => Promise.resolve({ responses: [] }));

    submitSpecServer();

    await waitFor(() => expect(saveMockServerInstance).toHaveBeenCalled());
    expect(loadMockResponsesFromSpec).toHaveBeenCalledWith(expect.objectContaining({ specPath: '/tmp/pet.yaml' }));
  });
});
