jest.mock('../tls-connect-options', () => ({
  buildTlsConnectOptions: jest.fn(() => ({}))
}));

const mockConnect = jest.fn();
jest.mock('node:http2', () => ({
  __esModule: true,
  default: { connect: (...args: unknown[]) => mockConnect(...args) }
}));

import { EventEmitter } from 'node:events';
import { acquireSession, closeAllSessions, __poolSize } from '../session-pool';

const makeFakeSession = () => {
  const s = new EventEmitter() as EventEmitter & {
    closed: boolean;
    destroyed: boolean;
    close: jest.Mock;
    destroy: jest.Mock;
  };
  s.closed = false;
  s.destroyed = false;
  s.close = jest.fn(() => {
    s.closed = true;
    s.emit('close');
  });
  s.destroy = jest.fn(() => {
    s.destroyed = true;
  });
  return s;
};

describe('session-pool', () => {
  beforeEach(() => {
    jest.useRealTimers();
    closeAllSessions();
    mockConnect.mockReset();
    mockConnect.mockImplementation(() => makeFakeSession());
  });

  it('reuses one session for the same connection identity', () => {
    const a = acquireSession({ url: 'https://api.test/x' });
    const b = acquireSession({ url: 'https://api.test/y' });
    expect(a.session).toBe(b.session);
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('opens distinct sessions for different origins', () => {
    acquireSession({ url: 'https://a.test/' });
    acquireSession({ url: 'https://b.test/' });
    expect(mockConnect).toHaveBeenCalledTimes(2);
  });

  it('opens distinct sessions for different TLS identity', () => {
    acquireSession({ url: 'https://a.test/', tlsOptions: { rejectUnauthorized: true } });
    acquireSession({ url: 'https://a.test/', tlsOptions: { rejectUnauthorized: false } });
    expect(mockConnect).toHaveBeenCalledTimes(2);
  });

  it('does not reuse a destroyed session', () => {
    const a = acquireSession({ url: 'https://a.test/' });
    (a.session as unknown as { destroyed: boolean }).destroyed = true;
    const b = acquireSession({ url: 'https://a.test/' });
    expect(b.session).not.toBe(a.session);
    expect(mockConnect).toHaveBeenCalledTimes(2);
  });

  it('is a no-op on double release and stays pooled', () => {
    const acquired = acquireSession({ url: 'https://a.test/' });
    acquired.releaseStream();
    acquired.releaseStream();
    expect(__poolSize()).toBe(1);
  });

  it('closes the session after it is idle', () => {
    jest.useFakeTimers();
    const acquired = acquireSession({ url: 'https://a.test/' });
    acquired.releaseStream();
    jest.advanceTimersByTime(60 * 1000);
    expect((acquired.session as unknown as { close: jest.Mock }).close).toHaveBeenCalled();
    expect(__poolSize()).toBe(0);
  });

  it('cancels the idle timer when a new request arrives', () => {
    jest.useFakeTimers();
    const first = acquireSession({ url: 'https://a.test/' });
    first.releaseStream();
    jest.advanceTimersByTime(30 * 1000);
    const second = acquireSession({ url: 'https://a.test/' });
    jest.advanceTimersByTime(40 * 1000);
    expect(second.session).toBe(first.session);
    expect((second.session as unknown as { close: jest.Mock }).close).not.toHaveBeenCalled();
  });

  it('closeAllSessions closes everything and empties the pool', () => {
    const a = acquireSession({ url: 'https://a.test/' });
    const b = acquireSession({ url: 'https://b.test/' });
    closeAllSessions();
    expect((a.session as unknown as { close: jest.Mock }).close).toHaveBeenCalled();
    expect((b.session as unknown as { close: jest.Mock }).close).toHaveBeenCalled();
    expect(__poolSize()).toBe(0);
  });
});
