import { EventEmitter } from 'node:events';
import net from 'node:net';
import { TLSSocket } from 'node:tls';
import {
  HYBRID_ECDH_CURVE,
  MAX_HYBRID_KEY_EXCHANGE_ENDPOINTS,
  connectWithKeyExchangeFallback,
  withHybridKeyExchangeFallback,
  clearHybridKeyExchangeEndpoints,
  setHybridTlsCapabilityForTests
} from './hybrid-key-exchange';
import { clearAgentCache } from './agent-cache';

const fakeRequest = (timeout = 0) => {
  const request = new EventEmitter() as EventEmitter & { destroyed: boolean; destroy: () => void; timeout: number };
  request.destroyed = false;
  request.timeout = timeout;
  request.destroy = () => {
    if (request.destroyed) {
      return;
    }
    request.destroyed = true;
  };
  return request;
};

const handshakeFailure = Object.assign(new Error('sslv3 alert handshake failure'), { code: 'ERR_SSL_SSLV3_ALERT_HANDSHAKE_FAILURE' });

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

  it('retries with hybrid and offers it first on later connections', async () => {
    const onRetry = jest.fn();
    const connect = jest.fn((ecdhCurve?: string) => fakeTlsSocket(ecdhCurve ? 'secure' : handshakeFailure));

    await connectWithKeyExchangeFallback(endpoint, connect, { onRetry });
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

    await connectWithKeyExchangeFallback(endpoint, connect, { onRetry });
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

    await connectWithKeyExchangeFallback(endpoint, connect, { onRetry });
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

  it('evicts the oldest remembered endpoint once the set is full', async () => {
    const connect = jest.fn((ecdhCurve?: string) => fakeTlsSocket(ecdhCurve ? 'secure' : handshakeFailure));
    for (let index = 0; index < MAX_HYBRID_KEY_EXCHANGE_ENDPOINTS; index++) {
      await connectWithKeyExchangeFallback({ host: `pq${index}.example.com`, port: 443 }, connect);
    }
    await connectWithKeyExchangeFallback({ host: 'pq-overflow.example.com', port: 443 }, connect);
    connect.mockClear();

    await connectWithKeyExchangeFallback({ host: 'pq0.example.com', port: 443 }, connect);
    await connectWithKeyExchangeFallback({ host: 'pq-overflow.example.com', port: 443 }, connect);

    expect(connect.mock.calls).toEqual([[undefined], [HYBRID_ECDH_CURVE], [HYBRID_ECDH_CURVE]]);
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

  it('destroys the in-flight handshake when the request is cancelled', async () => {
    const request = fakeRequest();
    const connect = jest.fn(() => {
      const socket = new TLSSocket(new net.Socket());
      createdSockets.push(socket);
      return socket;
    });

    const pending = connectWithKeyExchangeFallback(endpoint, connect, { request });
    await Promise.resolve();
    request.destroy();

    await expect(pending).rejects.toMatchObject({ code: 'ECONNRESET' });
    expect(connect).toHaveBeenCalledTimes(1);
    expect(createdSockets[0].destroyed).toBe(true);
  });

  it('does not retry after a handshake failure when the request was already cancelled', async () => {
    const request = fakeRequest();
    const connect = jest.fn((ecdhCurve?: string) => fakeTlsSocket(ecdhCurve ? 'secure' : handshakeFailure));

    const pending = connectWithKeyExchangeFallback(endpoint, connect, { request });
    await Promise.resolve();
    request.destroy();
    await expect(pending).rejects.toMatchObject({ code: 'ECONNRESET' });

    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('stops when the request abort signal fires before the socket is attached', async () => {
    const abortController = new AbortController();
    const request = Object.assign(fakeRequest(), { signal: abortController.signal });
    const connect = jest.fn(() => {
      const socket = new TLSSocket(new net.Socket());
      createdSockets.push(socket);
      return socket;
    });

    const pending = connectWithKeyExchangeFallback(endpoint, connect, { request });
    await Promise.resolve();
    abortController.abort();

    await expect(pending).rejects.toMatchObject({ code: 'ECONNRESET' });
    expect(connect).toHaveBeenCalledTimes(1);
    expect(createdSockets[0].destroyed).toBe(true);
  });

  it('emits request timeout while the handshake is still pending', async () => {
    const request = fakeRequest(50);
    const connect = jest.fn(() => {
      const socket = new TLSSocket(new net.Socket());
      createdSockets.push(socket);
      return socket;
    });

    const pending = connectWithKeyExchangeFallback(endpoint, connect, { request });
    await expect(new Promise((resolve) => request.once('timeout', () => resolve('timeout')))).resolves.toBe('timeout');
    await expect(pending).rejects.toMatchObject({ code: 'ECONNRESET' });
    expect(createdSockets[0].destroyed).toBe(true);
  });
});

describe('withHybridKeyExchangeFallback', () => {
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
    setHybridTlsCapabilityForTests(null);
    createdSockets.splice(0).forEach((socket) => socket.destroy());
  });

  it('retries before handing the socket to the caller and logs to the timeline', async () => {
    setHybridTlsCapabilityForTests('retry');
    const Agent = withHybridKeyExchangeFallback(PqOnlyAgent) as any;
    const agent = new Agent();
    agent.timeline = [];

    await expect(createConnection(agent)).resolves.toBeInstanceOf(TLSSocket);

    expect(agent.offeredCurves).toEqual([undefined, HYBRID_ECDH_CURVE]);
    expect(agent.timeline.map((entry: any) => entry.message)).toEqual(['TLS handshake failed; retrying with post-quantum key exchange (X25519MLKEM768)']);
  });

  it('leaves advertise and unsupported runtimes unwrapped', async () => {
    for (const capability of ['advertise', 'none'] as const) {
      setHybridTlsCapabilityForTests(capability);
      const agent = new (withHybridKeyExchangeFallback(PqOnlyAgent) as any)();

      await expect(createConnection(agent)).rejects.toBe(handshakeFailure);
      expect(agent.offeredCurves).toEqual([undefined]);
    }
  });

  it('retries a SOCKS TLS failure without destroying the real request', async () => {
    setHybridTlsCapabilityForTests('retry');

    // Mirrors socks-proxy-agent 8.0.5: TLS errors destroy `req` before the hybrid wrapper sees them.
    class SocksLikeAgent {
      static protocols = ['socks', 'socks5'] as const;
      offeredCurves: (string | undefined)[] = [];
      receivedRequests: any[] = [];

      async connect(req: any, options: { ecdhCurve?: string; secureEndpoint?: boolean }) {
        this.offeredCurves.push(options.ecdhCurve);
        this.receivedRequests.push(req);
        const socket = fakeTlsSocket(options.ecdhCurve ? 'secure' : handshakeFailure);
        socket.once('error', () => req.destroy());
        return socket;
      }
    }

    const Agent = withHybridKeyExchangeFallback(SocksLikeAgent) as any;
    const agent = new Agent();
    const request = fakeRequest();

    await expect(agent.connect(request, { host: 'pq.example.com', port: 443, secureEndpoint: true })).resolves.toBeInstanceOf(TLSSocket);

    expect(request.destroyed).toBe(false);
    expect(agent.offeredCurves).toEqual([undefined, HYBRID_ECDH_CURVE]);
    expect(agent.receivedRequests.every((attemptReq: any) => attemptReq !== request)).toBe(true);
  });

  it('retries an HTTPS proxy TLS failure with the real request so CONNECT can resume', async () => {
    setHybridTlsCapabilityForTests('retry');

    // Mirrors https-proxy-agent: resume the tunneled socket when the request emits `socket`.
    class HttpsProxyLikeAgent {
      static protocols = ['http', 'https'] as const;
      offeredCurves: (string | undefined)[] = [];
      receivedRequests: any[] = [];
      resumedSockets: TLSSocket[] = [];

      async connect(req: any, options: { ecdhCurve?: string; secureEndpoint?: boolean }) {
        this.offeredCurves.push(options.ecdhCurve);
        this.receivedRequests.push(req);
        const socket = fakeTlsSocket(options.ecdhCurve ? 'secure' : handshakeFailure);
        req.once('socket', (attached: TLSSocket) => {
          this.resumedSockets.push(attached);
          attached.resume?.();
        });
        return socket;
      }
    }

    const Agent = withHybridKeyExchangeFallback(HttpsProxyLikeAgent) as any;
    const agent = new Agent();
    const request = fakeRequest();

    const socket = await agent.connect(request, { host: 'pq.example.com', port: 443, secureEndpoint: true });
    request.emit('socket', socket);

    expect(request.destroyed).toBe(false);
    expect(agent.offeredCurves).toEqual([undefined, HYBRID_ECDH_CURVE]);
    expect(agent.receivedRequests).toEqual([request, request]);
    expect(agent.resumedSockets.length).toBeGreaterThan(0);
    expect(agent.resumedSockets.every((resumed: TLSSocket) => resumed === socket)).toBe(true);
  });

  it('destroys a pending SOCKS handshake when the request is cancelled', async () => {
    setHybridTlsCapabilityForTests('retry');

    class HangingSocksAgent {
      lastSocket: TLSSocket | undefined;

      async connect() {
        const socket = new TLSSocket(new net.Socket());
        createdSockets.push(socket);
        this.lastSocket = socket;
        return socket;
      }
    }

    const Agent = withHybridKeyExchangeFallback(HangingSocksAgent) as any;
    const agent = new Agent();
    const request = fakeRequest();

    const pending = agent.connect(request, { host: 'pq.example.com', port: 443, secureEndpoint: true });
    await Promise.resolve();
    request.destroy();

    await expect(pending).rejects.toMatchObject({ code: 'ECONNRESET' });
    expect(agent.lastSocket?.destroyed).toBe(true);
  });
});
