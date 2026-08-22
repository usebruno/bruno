import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import OnExit from './index';
import { updateCollectionOnExit } from 'providers/ReduxStore/slices/collections';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch
}));
jest.mock('utils/collections', () => ({
  flattenItems: (items = []) => items.flatMap((item) => [item, ...(item.items || [])])
}));
jest.mock('providers/ReduxStore/slices/collections', () => ({
  updateCollectionOnExit: jest.fn((payload) => ({ type: 'TEST_UPDATE_ON_EXIT', payload }))
}));
jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  saveCollectionSettings: jest.fn((collectionUid) => ({ type: 'TEST_SAVE_COLLECTION_SETTINGS', collectionUid }))
}));
jest.mock('./StyledWrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('ui/Button', () => ({ children, onClick, ...props }) => (
  <button onClick={onClick} {...props}>{children}</button>
));

const requests = [
  {
    uid: 'http-1',
    name: 'Delete session',
    type: 'http-request',
    pathname: '/repo/test-api/cleanup/delete-session.bru',
    request: { method: 'DELETE', url: 'https://example.test/session' }
  },
  {
    uid: 'graphql-1',
    name: 'Disconnect account',
    type: 'graphql-request',
    pathname: '/repo/test-api/cleanup/disconnect-account.bru',
    request: { url: 'https://example.test/graphql' }
  },
  {
    uid: 'grpc-1',
    name: 'Unsupported stream',
    type: 'grpc-request',
    pathname: '/repo/test-api/cleanup/stream.bru',
    request: {}
  },
  {
    uid: 'transient-1',
    name: 'Transient cleanup',
    type: 'http-request',
    pathname: '/repo/test-api/cleanup/transient.bru',
    isTransient: true,
    request: { method: 'DELETE' }
  }
];

const createCollection = (onExit, draftOnExit) => ({
  uid: 'collection-1',
  pathname: '/repo/test-api',
  items: requests,
  brunoConfig: { onExit },
  ...(draftOnExit ? { draft: { brunoConfig: { onExit: draftOnExit } } } : {})
});

describe('CollectionSettings OnExit', () => {
  beforeEach(() => jest.clearAllMocks());

  it('disables dependent controls until cleanup is enabled and excludes unsupported requests', () => {
    render(<OnExit collection={createCollection({ enabled: false })} />);

    expect(screen.getByRole('checkbox', { name: 'Show a reminder before running cleanup' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /Delete session/ })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /Disconnect account/ })).toBeDisabled();
    expect(screen.queryByText('Unsupported stream')).not.toBeInTheDocument();
    expect(screen.queryByText('Transient cleanup')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Enable cleanup when quitting Bruno' }));
    expect(updateCollectionOnExit).toHaveBeenCalledWith({
      collectionUid: 'collection-1',
      onExit: {
        enabled: true,
        showReminder: true,
        reminderMessage: 'Run this collection’s cleanup requests before quitting Bruno.',
        requestPaths: []
      }
    });
  });

  it('edits the reminder, stores collection-relative request paths, and saves settings', () => {
    const config = {
      enabled: true,
      showReminder: true,
      reminderMessage: 'Clean up first.',
      requestPaths: []
    };
    render(<OnExit collection={createCollection(config)} />);

    fireEvent.change(screen.getByLabelText('Exit reminder message'), {
      target: { value: 'Disconnect the shared account.' }
    });
    expect(updateCollectionOnExit).toHaveBeenLastCalledWith({
      collectionUid: 'collection-1',
      onExit: { ...config, reminderMessage: 'Disconnect the shared account.' }
    });

    fireEvent.click(screen.getByRole('checkbox', { name: /Delete session/ }));
    expect(updateCollectionOnExit).toHaveBeenLastCalledWith({
      collectionUid: 'collection-1',
      onExit: { ...config, requestPaths: ['cleanup/delete-session.bru'] }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(saveCollectionSettings).toHaveBeenCalledWith('collection-1');
    expect(mockDispatch).toHaveBeenLastCalledWith({
      type: 'TEST_SAVE_COLLECTION_SETTINGS',
      collectionUid: 'collection-1'
    });
  });

  it('renders the collection draft configuration when one exists', () => {
    const collection = createCollection(
      { enabled: false },
      {
        enabled: true,
        showReminder: false,
        reminderMessage: 'Draft reminder',
        requestPaths: ['cleanup/disconnect-account.bru']
      }
    );
    render(<OnExit collection={collection} />);

    expect(screen.getByRole('checkbox', { name: 'Enable cleanup when quitting Bruno' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Show a reminder before running cleanup' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Disconnect account/ })).toBeChecked();
  });
});
