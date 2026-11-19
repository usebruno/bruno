import toast from 'react-hot-toast';
import { startScheduledSend, stopScheduledSend, getScheduledSend } from './scheduled-send';
import { sendRequest } from './actions';

jest.mock('react-hot-toast', () => ({ error: jest.fn() }));
jest.mock('./actions', () => ({ sendRequest: jest.fn() }));

const buildState = ({ tabOpen = true, itemExists = true, streamRunning = false } = {}) => ({
  collections: {
    collections: [
      {
        uid: 'c1',
        items: itemExists
          ? [{ uid: 'r1', type: 'http-request', response: streamRunning ? { stream: { running: true } } : null }]
          : []
      }
    ]
  },
  tabs: { tabs: tabOpen ? [{ uid: 'r1' }] : [] }
});

describe('scheduled send', () => {
  let state;
  const dispatch = jest.fn((action) => action(dispatch, () => state));

  // sendRequest is a thunk: resolve it immediately unless a test overrides it
  const mockSend = (result = () => Promise.resolve()) => sendRequest.mockImplementation(() => result);

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    state = buildState();
    mockSend();
  });

  afterEach(() => {
    stopScheduledSend('r1');
    jest.useRealTimers();
  });

  it('sends immediately, then repeats on the interval until stopped', async () => {
    dispatch(startScheduledSend('r1', 'c1', 1000));
    expect(sendRequest).toHaveBeenCalledTimes(1);
    expect(getScheduledSend('r1')).toMatchObject({ intervalMs: 1000 });

    await jest.advanceTimersByTimeAsync(3000);
    expect(sendRequest).toHaveBeenCalledTimes(4);

    stopScheduledSend('r1');
    expect(getScheduledSend('r1')).toBeNull();
    await jest.advanceTimersByTimeAsync(3000);
    expect(sendRequest).toHaveBeenCalledTimes(4);
  });

  it('waits for the previous send to settle before scheduling the next one', async () => {
    let settle;
    mockSend(() => new Promise((resolve) => (settle = resolve)));

    dispatch(startScheduledSend('r1', 'c1', 1000));
    await jest.advanceTimersByTimeAsync(5000);
    expect(sendRequest).toHaveBeenCalledTimes(1);

    settle();
    await jest.advanceTimersByTimeAsync(1000);
    expect(sendRequest).toHaveBeenCalledTimes(2);
  });

  it('does not reschedule when stopped while a send is in flight', async () => {
    let settle;
    mockSend(() => new Promise((resolve) => (settle = resolve)));

    dispatch(startScheduledSend('r1', 'c1', 1000));
    stopScheduledSend('r1');
    settle();
    await jest.advanceTimersByTimeAsync(3000);

    expect(sendRequest).toHaveBeenCalledTimes(1);
    expect(getScheduledSend('r1')).toBeNull();
  });

  it('stops and shows an error when a send fails', async () => {
    mockSend(() => Promise.reject(new Error('Collection not found')));

    dispatch(startScheduledSend('r1', 'c1', 1000));
    await jest.advanceTimersByTimeAsync(3000);

    expect(sendRequest).toHaveBeenCalledTimes(1);
    expect(getScheduledSend('r1')).toBeNull();
    expect(toast.error).toHaveBeenCalledWith('Repeat on Interval stopped: Collection not found');
  });

  it('skips the tick while a streaming response is open', async () => {
    state = buildState({ streamRunning: true });
    dispatch(startScheduledSend('r1', 'c1', 1000));
    await jest.advanceTimersByTimeAsync(2000);
    expect(sendRequest).not.toHaveBeenCalled();
    expect(getScheduledSend('r1')).not.toBeNull();

    state = buildState();
    await jest.advanceTimersByTimeAsync(1000);
    expect(sendRequest).toHaveBeenCalledTimes(1);
  });

  it('stops when the tab is closed', async () => {
    dispatch(startScheduledSend('r1', 'c1', 1000));
    state = buildState({ tabOpen: false });

    await jest.advanceTimersByTimeAsync(1000);
    expect(sendRequest).toHaveBeenCalledTimes(1);
    expect(getScheduledSend('r1')).toBeNull();
  });

  it('stops when the request no longer exists', async () => {
    dispatch(startScheduledSend('r1', 'c1', 1000));
    state = buildState({ itemExists: false });

    await jest.advanceTimersByTimeAsync(1000);
    expect(sendRequest).toHaveBeenCalledTimes(1);
    expect(getScheduledSend('r1')).toBeNull();
  });
});
