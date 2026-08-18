import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ConfirmAppClose from './index';
import { cancelRequestByItemUid, sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import { completeQuitFlow } from 'providers/ReduxStore/slices/app';

let mockState;
let mockDispatch;
let mockRunRequest;
let mockCancelRequest;
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
  afterEach(() => jest.useRealTimers());

  beforeEach(() => {
    jest.clearAllMocks();
    mockState = createState(true);
    mockRunRequest = jest.fn(() => Promise.resolve());
    mockCancelRequest = jest.fn(() => Promise.resolve());
    mockDispatch = jest.fn((action) => {
      if (action.type === 'TEST_SEND_REQUEST') return mockRunRequest(action.payload);
      if (action.type === 'TEST_CANCEL_REQUEST') return mockCancelRequest(action.payload);
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

  it('does not enable retry until timeout cancellation finishes', async () => {
    jest.useFakeTimers();
    let finishCancellation;
    mockRunRequest.mockReturnValue(new Promise(() => undefined));
    mockCancelRequest.mockReturnValue(new Promise((resolve) => {
      finishCancellation = resolve;
    }));
    await startQuitFlow();

    fireEvent.click(screen.getByRole('button', { name: 'Run cleanup and quit' }));
    await act(async () => jest.advanceTimersByTimeAsync(30000));

    expect(mockRunRequest).toHaveBeenCalledTimes(1);
    expect(mockCancelRequest).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Retry cleanup' })).not.toBeInTheDocument();

    mockRunRequest.mockReturnValue(new Promise(() => undefined));
    await act(async () => finishCancellation());
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Retry cleanup' }));
      await Promise.resolve();
    });

    expect(mockRunRequest).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel cleanup' }));
  });

  it('surfaces cancellation failures before enabling retry', async () => {
    jest.useFakeTimers();
    mockRunRequest.mockReturnValue(new Promise(() => undefined));
    mockCancelRequest.mockRejectedValue(new Error('unable to cancel request'));
    await startQuitFlow();

    fireEvent.click(screen.getByRole('button', { name: 'Run cleanup and quit' }));
    await act(async () => jest.advanceTimersByTimeAsync(30000));

    expect(screen.getByText('unable to cancel request')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry cleanup' })).toBeInTheDocument();
    expect(mockRunRequest).toHaveBeenCalledTimes(1);
  });
});
