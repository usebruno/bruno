import { EventEmitter } from 'node:events';

type FakeSession = EventEmitter & {
  request: jest.Mock; close: jest.Mock; ref: jest.Mock; unref: jest.Mock;
  destroyed: boolean; closed: boolean;
};
type FakeStream = EventEmitter;

const makeFakeSession = (): FakeSession =>
  Object.assign(new EventEmitter(), {
    request: jest.fn(() => new EventEmitter() as FakeStream),
    close: jest.fn(), ref: jest.fn(), unref: jest.fn(),
    destroyed: false, closed: false
  }) as FakeSession;

const mockConnect = jest.fn();
jest.mock('node:http2', () => ({ __esModule: true, default: { connect: (...a: unknown[]) => mockConnect(...a) } }));

import { acquireSession, getSessionKey, closeAllSessions, getSessionCount, hasLiveSession } from '../session-pool';

let queued: FakeSession[] = [];
beforeEach(() => {
  closeAllSessions();
  queued = [];
  mockConnect.mockReset().mockImplementation(() => queued.shift() || makeFakeSession());
});

const HTTPS = 'https://api.test:8443';

describe('getSessionKey', () => {
  it('is stable for identical inputs and separates different client certs', () => {
    expect(getSessionKey({ origin: HTTPS, tlsOptions: { cert: 'A', key: 'A' } }))
      .toBe(getSessionKey({ origin: HTTPS, tlsOptions: { cert: 'A', key: 'A' } }));
    expect(getSessionKey({ origin: HTTPS, tlsOptions: { cert: 'A' } }))
      .not.toBe(getSessionKey({ origin: HTTPS, tlsOptions: { cert: 'B' } }));
  });

  it('separates by scheme and port', () => {
    expect(getSessionKey({ origin: 'https://h:8443' })).not.toBe(getSessionKey({ origin: 'https://h:9443' }));
    expect(getSessionKey({ origin: 'https://h:443' })).not.toBe(getSessionKey({ origin: 'http://h:443' }));
  });

  it('separates by proxy route', () => {
    expect(getSessionKey({ origin: HTTPS })).not.toBe(getSessionKey({ origin: HTTPS, proxyUri: 'http://proxy:3128' }));
  });

  it('separates two prebuilt secureContext identities, but is stable for the same object', () => {
    const ctxA = {}; const ctxB = {};
    const a = getSessionKey({ origin: HTTPS, tlsOptions: { secureContext: ctxA } as any });
    expect(a).not.toBe(getSessionKey({ origin: HTTPS, tlsOptions: { secureContext: ctxB } as any }));
    expect(getSessionKey({ origin: HTTPS, tlsOptions: { secureContext: ctxA } as any })).toBe(a);
  });

  it('normalises the default port (host and host:443 share a key)', () => {
    expect(getSessionKey({ origin: 'https://h' })).toBe(getSessionKey({ origin: 'https://h:443' }));
  });

  it('rejects a bare host origin', () => {
    expect(() => getSessionKey({ origin: 'api.test:8443' })).toThrow();
  });
});

describe('acquireSession', () => {
  it('does not reuse a session whose Node session has died, and evicts it (opens a fresh one)', () => {
    const s1 = makeFakeSession(); const s2 = makeFakeSession(); queued = [s1, s2];
    const first = acquireSession({ origin: HTTPS });
    s1.emit('connect'); // ACTIVE
    s1.destroyed = true; // died before our close/goaway handler flipped the state
    expect(hasLiveSession({ origin: HTTPS })).toBe(false);
    const second = acquireSession({ origin: HTTPS });
    expect(second.reused).toBe(false);
    expect(second.pooled).not.toBe(first.pooled);
    expect(mockConnect).toHaveBeenCalledTimes(2);
  });

  it('accepts an IPv6 literal origin without throwing (bracketed authority)', () => {
    expect(() => acquireSession({ origin: 'https://[::1]:8443' })).not.toThrow();
    expect(hasLiveSession({ origin: 'https://[::1]:8443' })).toBe(true);
    // a bracketed and bare form parse to the same host, so they share one session key
    expect(getSessionKey({ origin: 'https://[::1]:8443' })).toContain('::1');
  });

  it('creates on a miss and reuses on a hit (one connect)', () => {
    const first = acquireSession({ origin: HTTPS, tlsOptions: { cert: 'A' } });
    expect(first.reused).toBe(false);
    const second = acquireSession({ origin: HTTPS, tlsOptions: { cert: 'A' } });
    expect(second.reused).toBe(true);
    expect(second.pooled).toBe(first.pooled);
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('passes TLS options for https and empty options for h2c', () => {
    acquireSession({ origin: HTTPS });
    expect(mockConnect.mock.calls[0][1]).toEqual(expect.objectContaining({ ALPNProtocols: ['h2'], servername: 'api.test' }));
    closeAllSessions();
    mockConnect.mockClear();
    acquireSession({ origin: 'http://api.test:8080' });
    const h2cOpts = mockConnect.mock.calls[0][1];
    expect(h2cOpts.ALPNProtocols).toBeUndefined(); // no TLS/ALPN for cleartext h2c
    expect(h2cOpts.maxHeaderListPairs).toBeGreaterThan(128); // raised above Node's default
  });

  it('forwards a handed-off socket as createConnection on a miss', () => {
    const createConnection = jest.fn();
    acquireSession({ origin: HTTPS, createConnection });
    expect(mockConnect.mock.calls[0][1].createConnection).toBe(createConnection);
  });

  it('refuses to direct-dial a proxied origin when no tunnel socket was handed off (TOCTOU guard)', () => {
    expect(() =>
      acquireSession({ origin: HTTPS, proxyUri: 'http://proxy:3128' })
    ).toThrow(/refusing to bypass the proxy/);
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('allows a proxied origin when a tunnel socket is handed off via createConnection', () => {
    const createConnection = jest.fn();
    acquireSession({ origin: HTTPS, proxyUri: 'http://proxy:3128', createConnection });
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockConnect.mock.calls[0][1].createConnection).toBe(createConnection);
  });

  it('still reuses a live proxied session without a handed-off socket (fast path)', () => {
    const s = makeFakeSession(); queued = [s];
    const createConnection = jest.fn();
    const first = acquireSession({ origin: HTTPS, proxyUri: 'http://proxy:3128', createConnection });
    s.emit('connect');
    // Fast path: live session, caller hands off nothing — must reuse, not throw.
    const second = acquireSession({ origin: HTTPS, proxyUri: 'http://proxy:3128' });
    expect(second.reused).toBe(true);
    expect(second.pooled).toBe(first.pooled);
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('writes open then reuse lines onto the timeline', () => {
    const timeline: any[] = [];
    acquireSession({ origin: HTTPS, timeline });
    acquireSession({ origin: HTTPS, timeline });
    expect(timeline.map((t) => t.message)).toEqual([
      expect.stringContaining('Opening HTTP/2 session'),
      expect.stringContaining('Reusing HTTP/2 session')
    ]);
  });
});

describe('session lifecycle', () => {
  it('\'connect\' moves CONNECTING → ACTIVE and unrefs an idle session', () => {
    const s = makeFakeSession(); queued = [s];
    const { pooled } = acquireSession({ origin: HTTPS });
    expect(pooled.state).toBe('CONNECTING');
    s.emit('connect');
    expect(pooled.state).toBe('ACTIVE');
    expect(s.unref).toHaveBeenCalled();
  });

  it('GOAWAY removes the session (DRAINING); a new acquire creates a fresh one', () => {
    const s1 = makeFakeSession(); const s2 = makeFakeSession(); queued = [s1, s2];
    const first = acquireSession({ origin: HTTPS });
    s1.emit('connect');
    s1.emit('goaway', 0, 7);
    expect(first.pooled.state).toBe('DRAINING');
    expect(first.pooled.goawayLastStreamId).toBe(7);
    const second = acquireSession({ origin: HTTPS });
    expect(second.reused).toBe(false);
    expect(second.pooled).not.toBe(first.pooled);
  });

  it('a session \'error\' removes it (CLOSED) and records lastError', () => {
    const s = makeFakeSession(); queued = [s];
    const { pooled } = acquireSession({ origin: HTTPS });
    const err = new Error('boom');
    s.emit('error', err);
    expect(pooled.state).toBe('CLOSED');
    expect(pooled.lastError).toBe(err);
    expect(getSessionCount()).toBe(0);
  });

  it('request() throws ERR_H2_SESSION_UNAVAILABLE once draining', () => {
    const s = makeFakeSession(); queued = [s];
    const { pooled } = acquireSession({ origin: HTTPS });
    s.emit('connect');
    s.emit('goaway', 0, 1);
    expect(() => pooled.request({ ':path': '/' })).toThrow(/ERR_H2_SESSION_UNAVAILABLE|is draining/);
  });

  it('request() refs on the first stream, counts streams, releases on close', () => {
    const s = makeFakeSession(); const stream = new EventEmitter() as FakeStream;
    s.request.mockReturnValue(stream); queued = [s];
    const { pooled } = acquireSession({ origin: HTTPS });
    s.emit('connect');
    pooled.request({ ':path': '/' });
    expect(s.ref).toHaveBeenCalled();
    expect(pooled.activeStreams).toBe(1);
    expect(pooled.totalStreams).toBe(1);
    stream.emit('close');
    expect(pooled.activeStreams).toBe(0);
  });
});

describe('hasLiveSession', () => {
  it('false with no session, true while CONNECTING/ACTIVE, false once removed', () => {
    const s = makeFakeSession();
    queued = [s];
    expect(hasLiveSession({ origin: HTTPS })).toBe(false);
    acquireSession({ origin: HTTPS });
    expect(hasLiveSession({ origin: HTTPS })).toBe(true); // CONNECTING
    s.emit('connect');
    expect(hasLiveSession({ origin: HTTPS })).toBe(true); // ACTIVE
    s.emit('close');
    expect(hasLiveSession({ origin: HTTPS })).toBe(false); // removed
  });

  it('keys by TLS identity', () => {
    queued = [makeFakeSession()];
    acquireSession({ origin: HTTPS, tlsOptions: { cert: 'A' } });
    expect(hasLiveSession({ origin: HTTPS, tlsOptions: { cert: 'A' } })).toBe(true);
    expect(hasLiveSession({ origin: HTTPS, tlsOptions: { cert: 'B' } })).toBe(false);
  });
});

describe('idle close', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('closes the session idleMs after the last stream ends', () => {
    const s = makeFakeSession(); const stream = new EventEmitter() as FakeStream;
    s.request.mockReturnValue(stream); queued = [s];
    const { pooled } = acquireSession({ origin: HTTPS, idleMs: 1000 });
    s.emit('connect');
    pooled.request({ ':path': '/' });
    stream.emit('close');
    expect(s.close).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1000);
    expect(s.close).toHaveBeenCalled();
  });
});
