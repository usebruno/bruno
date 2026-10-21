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

  it('reuses one session for the same connection identity', async () => {
    const a = await acquireSession({ url: 'https://api.test/x' });
    const b = await acquireSession({ url: 'https://api.test/y' });
    expect(a.session).toBe(b.session);
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('opens distinct sessions for different origins', async () => {
    await acquireSession({ url: 'https://a.test/' });
    await acquireSession({ url: 'https://b.test/' });
    expect(mockConnect).toHaveBeenCalledTimes(2);
  });

  it('opens distinct sessions for different TLS identity', async () => {
    await acquireSession({ url: 'https://a.test/', tlsOptions: { rejectUnauthorized: true } });
    await acquireSession({ url: 'https://a.test/', tlsOptions: { rejectUnauthorized: false } });
    expect(mockConnect).toHaveBeenCalledTimes(2);
  });

  it('does not reuse a destroyed session', async () => {
    const a = await acquireSession({ url: 'https://a.test/' });
    (a.session as unknown as { destroyed: boolean }).destroyed = true;
    const b = await acquireSession({ url: 'https://a.test/' });
    expect(b.session).not.toBe(a.session);
    expect(mockConnect).toHaveBeenCalledTimes(2);
  });

  it('is a no-op on double release and stays pooled', async () => {
    const acquired = await acquireSession({ url: 'https://a.test/' });
    acquired.releaseStream();
    acquired.releaseStream();
    expect(__poolSize()).toBe(1);
  });

  it('closes the session after it is idle', async () => {
    jest.useFakeTimers();
    const acquired = await acquireSession({ url: 'https://a.test/' });
    acquired.releaseStream();
    jest.advanceTimersByTime(60 * 1000);
    expect((acquired.session as unknown as { close: jest.Mock }).close).toHaveBeenCalled();
    expect(__poolSize()).toBe(0);
  });

  it('cancels the idle timer when a new request arrives', async () => {
    jest.useFakeTimers();
    const first = await acquireSession({ url: 'https://a.test/' });
    first.releaseStream();
    jest.advanceTimersByTime(30 * 1000);
    const second = await acquireSession({ url: 'https://a.test/' });
    jest.advanceTimersByTime(40 * 1000);
    expect(second.session).toBe(first.session);
    expect((second.session as unknown as { close: jest.Mock }).close).not.toHaveBeenCalled();
  });

  it('evicts a session on GOAWAY and connects fresh for the next request', async () => {
    const a = await acquireSession({ url: 'https://a.test/' });
    a.session.emit('goaway');
    const b = await acquireSession({ url: 'https://a.test/' });
    expect(b.session).not.toBe(a.session);
    expect(mockConnect).toHaveBeenCalledTimes(2);
  });

  it('closes a draining session once its in-flight stream finishes', async () => {
    const a = await acquireSession({ url: 'https://a.test/' });
    a.session.emit('goaway');
    expect((a.session as unknown as { close: jest.Mock }).close).not.toHaveBeenCalled();
    a.releaseStream();
    expect((a.session as unknown as { close: jest.Mock }).close).toHaveBeenCalled();
  });

  it('closes a draining session immediately when it is already idle', async () => {
    const a = await acquireSession({ url: 'https://a.test/' });
    a.releaseStream();
    a.session.emit('goaway');
    expect((a.session as unknown as { close: jest.Mock }).close).toHaveBeenCalled();
  });

  it('resolves ready when the session receives remoteSettings', async () => {
    const a = await acquireSession({ url: 'https://a.test/' });
    let readyResolved = false;
    a.serverSettingsReceived.then(() => {
      readyResolved = true;
    });
    await Promise.resolve();
    expect(readyResolved).toBe(false);
    a.session.emit('remoteSettings');
    await a.serverSettingsReceived;
    expect(readyResolved).toBe(true);
  });

  it('ready is already resolved for a reused warm session', async () => {
    const a = await acquireSession({ url: 'https://a.test/' });
    a.session.emit('remoteSettings');
    await a.serverSettingsReceived;
    const b = await acquireSession({ url: 'https://a.test/' });
    expect(b.session).toBe(a.session);
    await expect(b.serverSettingsReceived).resolves.toBeUndefined();
  });

  it('ready resolves (does not hang) if the session errors before settings', async () => {
    const a = await acquireSession({ url: 'https://a.test/' });
    a.session.emit('error', new Error('connect failed'));
    await expect(a.serverSettingsReceived).resolves.toBeUndefined();
  });

  it('raises maxHeaderListPairs so large response header lists are accepted', async () => {
    await acquireSession({ url: 'https://a.test/' });
    expect(mockConnect.mock.calls[0][1].maxHeaderListPairs).toBeGreaterThanOrEqual(256);
  });

  it('closeAllSessions closes everything and empties the pool', async () => {
    const a = await acquireSession({ url: 'https://a.test/' });
    const b = await acquireSession({ url: 'https://b.test/' });
    closeAllSessions();
    expect((a.session as unknown as { close: jest.Mock }).close).toHaveBeenCalled();
    expect((b.session as unknown as { close: jest.Mock }).close).toHaveBeenCalled();
    expect(__poolSize()).toBe(0);
  });
});
