import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ConfirmAppClose from './index';
import { cancelRequestByItemUid, sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import { completeQuitFlow } from 'providers/ReduxStore/slices/app';

let mockState;
let mockDispatch;
let mockRunRequest;
let mockQuitListener;

jest.mock('react-redux', () => ({
  useSelector: (selector) => selector(mockState),
  useDispatch: () => mockDispatch
}));
jest.mock('utils/common/platform', () => ({ isElectron: () => true }));
jest.mock('providers/ReduxStore/slices/app', () => ({
  completeQuitFlow: jest.fn(() => ({ type: 'TEST_COMPLETE_QUIT' }))
}));
jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  sendRequest: jest.fn((request, collectionUid, options) => ({
    type: 'TEST_SEND_REQUEST',
    payload: { request, collectionUid, options }
  })),
  cancelRequestByItemUid: jest.fn((itemUid, collectionUid) => ({
    type: 'TEST_CANCEL_REQUEST',
    payload: { itemUid, collectionUid }
  }))
}));
jest.mock('./SaveRequestsModal', () => ({ onComplete, onClose }) => (
  <div>
    <button onClick={onComplete}>Continue after drafts</button>
    <button onClick={onClose}>Cancel quit</button>
  </div>
));
jest.mock('components/Modal', () => ({ children }) => <div>{children}</div>);
jest.mock('ui/Button', () => ({ children, onClick }) => <button onClick={onClick}>{children}</button>);

const request = {
  uid: 'request-1',
  name: 'Disconnect session',
  type: 'http-request',
  pathname: '/collections/test-api/disconnect-session.bru',
  request: { method: 'DELETE', url: 'https://example.test/session' }
};

const createState = (showReminder) => ({
  collections: {
    collections: [{
      uid: 'collection-1',
      name: 'Test API',
      pathname: '/collections/test-api',
      items: [request],
      brunoConfig: {
        onExit: {
          enabled: true,
          showReminder,
          requestPaths: ['disconnect-session.bru']
        }
      }
    }]
  }
});

describe('ConfirmAppClose cleanup lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = createState(true);
    mockRunRequest = jest.fn(() => Promise.resolve());
    mockDispatch = jest.fn((action) => {
      if (action.type === 'TEST_SEND_REQUEST') return mockRunRequest(action.payload);
      return action;
    });
    mockQuitListener = null;
    window.ipcRenderer = {
      on: jest.fn((event, listener) => {
        mockQuitListener = listener;
        return jest.fn();
      })
    };
  });

  const startQuitFlow = async () => {
    render(<ConfirmAppClose />);
    act(() => mockQuitListener());
    fireEvent.click(await screen.findByRole('button', { name: 'Continue after drafts' }));
  };

  it('automatically runs configured requests and quits when reminders are disabled', async () => {
    mockState = createState(false);
    await startQuitFlow();

    await waitFor(() => expect(sendRequest).toHaveBeenCalledWith(
      request,
      'collection-1',
      { rejectOnError: true }
    ));
    await waitFor(() => expect(completeQuitFlow).toHaveBeenCalledTimes(1));
  });

  it('keeps Bruno open and offers retry when cleanup fails', async () => {
    mockRunRequest.mockRejectedValueOnce(new Error('cleanup network failed'));
    await startQuitFlow();

    fireEvent.click(await screen.findByRole('button', { name: 'Run cleanup and quit' }));

    expect(await screen.findByText('cleanup network failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry cleanup' })).toBeInTheDocument();
    expect(completeQuitFlow).not.toHaveBeenCalled();
  });

  it('cancels the active request and quits immediately when cleanup is stalled', async () => {
    mockRunRequest.mockReturnValue(new Promise(() => undefined));
    await startQuitFlow();

    fireEvent.click(await screen.findByRole('button', { name: 'Run cleanup and quit' }));
    await screen.findByText('Running cleanup requests…');
    fireEvent.click(screen.getByRole('button', { name: 'Quit without cleanup' }));

    expect(cancelRequestByItemUid).toHaveBeenCalledWith('request-1', 'collection-1');
    expect(completeQuitFlow).toHaveBeenCalledTimes(1);
  });

  it('cancels the active request and returns to Bruno without quitting', async () => {
    mockRunRequest.mockReturnValue(new Promise(() => undefined));
    await startQuitFlow();

    fireEvent.click(await screen.findByRole('button', { name: 'Run cleanup and quit' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel cleanup' }));

    expect(cancelRequestByItemUid).toHaveBeenCalledWith('request-1', 'collection-1');
    expect(completeQuitFlow).not.toHaveBeenCalled();
    expect(screen.queryByText('Running cleanup requests…')).not.toBeInTheDocument();
  });
});
