import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SaveRequestsModal from './SaveRequestsModal';
import { closeTabs, saveEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { saveGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';

let mockState = {
  collections: {
    collections: [{
      uid: 'collection-1',
      name: 'Test API',
      draft: { root: {} },
      items: []
    }]
  },
  tabs: { tabs: [{ uid: 'tab-1', collectionUid: 'collection-1' }] },
  globalEnvironments: { globalEnvironments: [], globalEnvironmentDraft: null }
};
const mockSaveMultipleCollections = jest.fn(() => Promise.resolve());
const mockSaveRequest = jest.fn(() => Promise.resolve());
const mockDispatch = jest.fn((action) => (
  typeof action === 'function' ? action(mockDispatch, () => mockState) : action
));

jest.mock('react-redux', () => ({
  useSelector: (selector) => selector(mockState),
  useDispatch: () => mockDispatch
}));
jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  saveRequest: jest.fn((...args) => () => mockSaveRequest(...args)),
  saveMultipleRequests: jest.fn(() => () => Promise.resolve()),
  saveMultipleCollections: jest.fn((drafts) => () => mockSaveMultipleCollections(drafts)),
  saveMultipleFolders: jest.fn(() => () => Promise.resolve()),
  saveEnvironment: jest.fn((...args) => () => Promise.resolve(args)),
  closeTabs: jest.fn((payload) => ({ type: 'TEST_CLOSE_TABS', payload }))
}));
jest.mock('providers/ReduxStore/slices/global-environments', () => ({
  saveGlobalEnvironment: jest.fn((...args) => () => Promise.resolve(args)),
  clearGlobalEnvironmentDraft: jest.fn(() => ({ type: 'TEST_CLEAR_GLOBAL_ENVIRONMENT_DRAFT' }))
}));
jest.mock('components/Modal', () => ({ children }) => <div>{children}</div>);
jest.mock('ui/Button', () => ({ children, onClick }) => <button onClick={onClick}>{children}</button>);

describe('SaveRequestsModal quit continuation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = {
      collections: {
        collections: [{
          uid: 'collection-1',
          name: 'Test API',
          draft: { root: {} },
          items: []
        }]
      },
      tabs: { tabs: [{ uid: 'tab-1', collectionUid: 'collection-1' }] },
      globalEnvironments: { globalEnvironments: [], globalEnvironmentDraft: null }
    };
  });

  it('continues to cleanup without cancelling the flow after discarding drafts', () => {
    const onComplete = jest.fn();
    const onClose = jest.fn();
    render(<SaveRequestsModal onClose={onClose} onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('button', { name: 'Don\'t Save' }));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('continues to cleanup without cancelling the flow after saving drafts', async () => {
    const onComplete = jest.fn();
    const onClose = jest.fn();
    render(<SaveRequestsModal onClose={onClose} onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(mockSaveMultipleCollections).toHaveBeenCalledWith([{
      type: 'collection',
      name: 'Test API',
      collectionUid: 'collection-1'
    }]);
    expect(mockSaveMultipleCollections.mock.invocationCallOrder[0])
      .toBeLessThan(onComplete.mock.invocationCallOrder[0]);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('continues environment saves and quit completion after opening transient request saves', async () => {
    mockState.collections.collections[0] = {
      uid: 'collection-1',
      name: 'Test API',
      environments: [{ uid: 'environment-1', name: 'Test environment' }],
      environmentsDraft: {
        environmentUid: 'environment-1',
        variables: [{ name: 'TOKEN', value: 'value', enabled: true }]
      },
      items: [{
        uid: 'transient-1',
        name: 'Untitled Request',
        type: 'http-request',
        isTransient: true,
        request: { method: 'GET', url: '' },
        draft: { uid: 'transient-1', type: 'http-request', request: { method: 'GET', url: 'https://example.test' } }
      }]
    };
    mockState.tabs.tabs = [{ uid: 'transient-1', collectionUid: 'collection-1' }];
    mockState.globalEnvironments = {
      globalEnvironments: [{ uid: 'global-environment-1', name: 'Global environment' }],
      globalEnvironmentDraft: {
        environmentUid: 'global-environment-1',
        variables: [{ name: 'GLOBAL_TOKEN', value: 'value', enabled: true }]
      }
    };
    const onComplete = jest.fn();
    const onClose = jest.fn();
    render(<SaveRequestsModal onClose={onClose} onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save All' }));

    await waitFor(() => expect(mockSaveRequest).toHaveBeenCalledWith('transient-1', 'collection-1', true));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(saveEnvironment).toHaveBeenCalledWith(
      [{ name: 'TOKEN', value: 'value', enabled: true }],
      'environment-1',
      'collection-1'
    );
    expect(saveGlobalEnvironment).toHaveBeenCalledWith({
      variables: [{ name: 'GLOBAL_TOKEN', value: 'value', enabled: true }],
      environmentUid: 'global-environment-1'
    });
    expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(onComplete.mock.invocationCallOrder[0]);
  });

  it('keeps force-close tab completion separate for transient requests', async () => {
    mockState.collections.collections[0] = {
      uid: 'collection-1',
      name: 'Test API',
      items: [{
        uid: 'transient-1',
        name: 'Untitled Request',
        type: 'http-request',
        isTransient: true,
        request: { method: 'GET', url: '' },
        draft: { uid: 'transient-1', type: 'http-request', request: { method: 'GET', url: 'https://example.test' } }
      }]
    };
    mockState.tabs.tabs = [{ uid: 'transient-1', collectionUid: 'collection-1' }];
    const onComplete = jest.fn();
    const onClose = jest.fn();
    render(
      <SaveRequestsModal
        onClose={onClose}
        onComplete={onComplete}
        forceCloseTabs={true}
        tabUidsToClose={['transient-1']}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(closeTabs).toHaveBeenCalledWith({ tabUids: ['transient-1'] }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
  });
});
