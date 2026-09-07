import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useDispatch, useSelector } from 'react-redux';
import CreateMockServerModal from './index';

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

const storeState = {
  collections: { collections: [collection] },
  apiSpec: { apiSpecs: [] },
  workspaces: {
    activeWorkspaceUid: 'ws-1',
    workspaces: [{
      uid: 'ws-1',
      collections: [{ path: '/tmp/shop' }],
      apiSpecs: []
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
});
