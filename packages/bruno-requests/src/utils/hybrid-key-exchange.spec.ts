import net from 'node:net';
import { TLSSocket } from 'node:tls';
import {
  HYBRID_ECDH_CURVE,
  MAX_HYBRID_KEY_EXCHANGE_ENDPOINTS,
  connectWithKeyExchangeFallback,
  withHybridKeyExchangeFallback,
  clearHybridKeyExchangeEndpoints
} from './hybrid-key-exchange';
import { clearAgentCache } from './agent-cache';

const handshakeFailure = Object.assign(new Error('sslv3 alert handshake failure'), { code: 'ERR_SSL_SSLV3_ALERT_HANDSHAKE_FAILURE' });

const setElectronVersion = (version: string | undefined) => {
  Object.defineProperty(process.versions, 'electron', { value: version, configurable: true, enumerable: true });
};

const createdSockets: TLSSocket[] = [];

// A TLS socket whose handshake settles as given, on the next tick.
const fakeTlsSocket = (outcome: Error | 'secure'): TLSSocket => {
  const socket = new TLSSocket(new net.Socket());
  createdSockets.push(socket);
  process.nextTick(() => (outcome === 'secure' ? socket.emit('secureConnect') : socket.emit('error', outcome)));
  return socket;
};

const endpoint = { host: 'pq.example.com', port: 443 };

describe('connectWithKeyExchangeFallback', () => {
  beforeEach(() => {
    clearHybridKeyExchangeEndpoints();
  });

  afterEach(() => {
    createdSockets.splice(0).forEach((socket) => socket.destroy());
  });

  it('connects with the runtime default when the handshake succeeds', async () => {
    const connect = jest.fn(() => fakeTlsSocket('secure'));

    await connectWithKeyExchangeFallback(endpoint, connect);

    expect(connect.mock.calls).toEqual([[undefined]]);
  });

  it('retries a rejected handshake with the hybrid group, and offers it first from then on', async () => {
    const onRetry = jest.fn();
    const connect = jest.fn((ecdhCurve?: string) => fakeTlsSocket(ecdhCurve ? 'secure' : handshakeFailure));

    await connectWithKeyExchangeFallback(endpoint, connect, onRetry);
    await connectWithKeyExchangeFallback({ host: 'PQ.example.com', port: 443 }, connect);

    expect(connect.mock.calls).toEqual([[undefined], [HYBRID_ECDH_CURVE], [HYBRID_ECDH_CURVE]]);
    expect(onRetry).toHaveBeenCalledWith(true);
  });

  it('goes back to the runtime default when an endpoint stops accepting the hybrid group', async () => {
    let serverSupportsHybrid = true;
    const connect = jest.fn((ecdhCurve?: string) => fakeTlsSocket(Boolean(ecdhCurve) === serverSupportsHybrid ? 'secure' : handshakeFailure));
    await connectWithKeyExchangeFallback(endpoint, connect);
    serverSupportsHybrid = false;
    const onRetry = jest.fn();

    await connectWithKeyExchangeFallback(endpoint, connect, onRetry);
    await connectWithKeyExchangeFallback(endpoint, connect);

    expect(connect.mock.calls).toEqual([[undefined], [HYBRID_ECDH_CURVE], [HYBRID_ECDH_CURVE], [undefined], [undefined]]);
    expect(onRetry).toHaveBeenLastCalledWith(false);
  });

  it('falls back when a remembered hybrid ClientHello is rejected with ECONNRESET', async () => {
    const connect = jest.fn((ecdhCurve?: string) => fakeTlsSocket(ecdhCurve ? 'secure' : handshakeFailure));
    await connectWithKeyExchangeFallback(endpoint, connect);
    const reset = Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' });
    connect.mockImplementation((ecdhCurve?: string) => fakeTlsSocket(ecdhCurve === HYBRID_ECDH_CURVE ? reset : 'secure'));
    const onRetry = jest.fn();

    await connectWithKeyExchangeFallback(endpoint, connect, onRetry);
    connect.mockClear();
    await connectWithKeyExchangeFallback(endpoint, connect);

    expect(onRetry).toHaveBeenCalledWith(false);
    expect(connect.mock.calls).toEqual([[undefined]]);
  });

  it('recognizes a handshake failure reported on a write', async () => {
    const writeFailure = Object.assign(new Error('write EPROTO 0C1C0000:error:10000410:SSL routines:OPENSSL_internal:SSLV3_ALERT_HANDSHAKE_FAILURE:../../third_party/boringssl/src/ssl/tls_record.cc:486:SSL alert number 40'), { code: 'EPROTO' });
    const connect = jest.fn((ecdhCurve?: string) => fakeTlsSocket(ecdhCurve ? 'secure' : writeFailure));

    await connectWithKeyExchangeFallback(endpoint, connect);

    expect(connect).toHaveBeenCalledTimes(2);
  });

  it('does not retry other connection errors', async () => {
    const refused = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
    const connect = jest.fn(() => fakeTlsSocket(refused));

    await expect(connectWithKeyExchangeFallback(endpoint, connect)).rejects.toBe(refused);
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('retries only once, and remembers nothing when the retry fails too', async () => {
    const connect = jest.fn(() => fakeTlsSocket(handshakeFailure));

    await expect(connectWithKeyExchangeFallback(endpoint, connect)).rejects.toBe(handshakeFailure);
    connect.mockImplementation(() => fakeTlsSocket('secure'));
    await connectWithKeyExchangeFallback(endpoint, connect);

    expect(connect.mock.calls).toEqual([[undefined], [HYBRID_ECDH_CURVE], [undefined]]);
  });

  it('remembers the setting per port', async () => {
    const connect = jest.fn((ecdhCurve?: string) => fakeTlsSocket(ecdhCurve ? 'secure' : handshakeFailure));
    await connectWithKeyExchangeFallback(endpoint, connect);
    connect.mockClear();

    await connectWithKeyExchangeFallback({ ...endpoint, port: 8443 }, connect);

    expect(connect.mock.calls[0]).toEqual([undefined]);
  });

  it('forgets the least recently used endpoint once it remembers too many', async () => {
    const connect = jest.fn((ecdhCurve?: string) => fakeTlsSocket(ecdhCurve ? 'secure' : handshakeFailure));
    const hostAt = (index: number) => ({ host: `pq${index}.example.com`, port: 443 });
    for (let index = 0; index < MAX_HYBRID_KEY_EXCHANGE_ENDPOINTS; index++) {
      await connectWithKeyExchangeFallback(hostAt(index), connect);
    }
    // Using the oldest endpoint makes the second oldest the one to evict.
    await connectWithKeyExchangeFallback(hostAt(0), connect);
    await connectWithKeyExchangeFallback(hostAt(MAX_HYBRID_KEY_EXCHANGE_ENDPOINTS), connect);
    connect.mockClear();

    await connectWithKeyExchangeFallback(hostAt(0), connect);
    await connectWithKeyExchangeFallback(hostAt(1), connect);

    expect(connect.mock.calls).toEqual([[HYBRID_ECDH_CURVE], [undefined], [HYBRID_ECDH_CURVE]]);
  });

  it('forgets every endpoint when the agent cache is cleared', async () => {
    const connect = jest.fn((ecdhCurve?: string) => fakeTlsSocket(ecdhCurve ? 'secure' : handshakeFailure));
    await connectWithKeyExchangeFallback(endpoint, connect);
    connect.mockClear();

    clearAgentCache();
    await connectWithKeyExchangeFallback(endpoint, connect);

    expect(connect.mock.calls[0]).toEqual([undefined]);
  });

  it('passes through a socket that is not TLS', async () => {
    const socket = new net.Socket();

    await expect(connectWithKeyExchangeFallback(endpoint, () => socket as unknown as TLSSocket)).resolves.toBe(socket);
  });
});

describe('withHybridKeyExchangeFallback', () => {
  const originalElectronVersion = process.versions.electron;

  // An https.Agent stand-in whose handshakes are rejected unless the hybrid group is offered.
  class PqOnlyAgent {
    offeredCurves: (string | undefined)[] = [];

    createConnection(options: { ecdhCurve?: string }) {
      this.offeredCurves.push(options.ecdhCurve);
      return fakeTlsSocket(options.ecdhCurve ? 'secure' : handshakeFailure);
    }
  }

  const createConnection = (agent: any): Promise<TLSSocket> =>
    new Promise((resolve, reject) => {
      const socket = agent.createConnection({ host: 'pq.example.com', port: 443 }, (error: Error | null, socket?: TLSSocket) => (error ? reject(error) : resolve(socket!)));
      if (socket) {
        socket.once('secureConnect', () => resolve(socket));
        socket.once('error', reject);
      }
    });

  beforeEach(() => {
    clearHybridKeyExchangeEndpoints();
  });

  afterEach(() => {
    setElectronVersion(originalElectronVersion);
    createdSockets.splice(0).forEach((socket) => socket.destroy());
  });

  it('retries the handshake before handing the socket over, and logs the retry to the timeline', async () => {
    setElectronVersion('43.8.10');
    const Agent = withHybridKeyExchangeFallback(PqOnlyAgent) as any;
    const agent = new Agent();
    agent.timeline = [];

    await expect(createConnection(agent)).resolves.toBeInstanceOf(TLSSocket);

    expect(agent.offeredCurves).toEqual([undefined, HYBRID_ECDH_CURVE]);
    expect(agent.timeline.map((entry: any) => entry.message)).toEqual(['TLS handshake failed; retrying with post-quantum key exchange (X25519MLKEM768)']);
  });

  it('leaves OpenSSL runtimes to their own key exchange settings', async () => {
    setElectronVersion(undefined);
    const Agent = withHybridKeyExchangeFallback(PqOnlyAgent) as any;
    const agent = new Agent();

    await expect(createConnection(agent)).rejects.toBe(handshakeFailure);

    expect(agent.offeredCurves).toEqual([undefined]);
  });
});
