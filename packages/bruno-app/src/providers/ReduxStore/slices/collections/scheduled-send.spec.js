import { startScheduledSend, stopScheduledSend, getScheduledSend } from './scheduled-send';
import { sendRequest } from './actions';

jest.mock('./actions', () => ({
  sendRequest: jest.fn(() => ({ type: 'test/sendRequest' }))
}));

const buildState = ({ requestState = null, tabOpen = true, itemExists = true } = {}) => ({
  collections: {
    collections: [
      {
        uid: 'c1',
        items: itemExists ? [{ uid: 'r1', type: 'http-request', requestState }] : []
      }
    ]
  },
  tabs: { tabs: tabOpen ? [{ uid: 'r1' }] : [] }
});

describe('scheduled send', () => {
  let state;
  const dispatch = jest.fn((action) => (typeof action === 'function' ? action(dispatch, () => state) : Promise.resolve()));

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    state = buildState();
  });

  afterEach(() => {
    stopScheduledSend('r1');
    jest.useRealTimers();
  });

  it('sends immediately, then repeats on the interval until stopped', () => {
    dispatch(startScheduledSend('r1', 'c1', 1000));
    expect(sendRequest).toHaveBeenCalledTimes(1);
    expect(getScheduledSend('r1')).toMatchObject({ intervalMs: 1000 });

    jest.advanceTimersByTime(3000);
    expect(sendRequest).toHaveBeenCalledTimes(4);

    stopScheduledSend('r1');
    expect(getScheduledSend('r1')).toBeNull();
    jest.advanceTimersByTime(3000);
    expect(sendRequest).toHaveBeenCalledTimes(4);
  });

  it('skips a tick while the previous request is still in flight', () => {
    state = buildState({ requestState: 'sending' });
    dispatch(startScheduledSend('r1', 'c1', 1000));

    jest.advanceTimersByTime(1000);
    expect(sendRequest).not.toHaveBeenCalled();
    expect(getScheduledSend('r1')).not.toBeNull();
  });

  it('stops when the tab is closed', () => {
    dispatch(startScheduledSend('r1', 'c1', 1000));
    state = buildState({ tabOpen: false });

    jest.advanceTimersByTime(1000);
    expect(sendRequest).toHaveBeenCalledTimes(1);
    expect(getScheduledSend('r1')).toBeNull();
  });

  it('stops when the request no longer exists', () => {
    dispatch(startScheduledSend('r1', 'c1', 1000));
    state = buildState({ itemExists: false });

    jest.advanceTimersByTime(1000);
    expect(sendRequest).toHaveBeenCalledTimes(1);
    expect(getScheduledSend('r1')).toBeNull();
  });
});
