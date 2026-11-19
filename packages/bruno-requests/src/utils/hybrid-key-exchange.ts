// Hybrid key exchange (X25519MLKEM768). OpenSSL can advertise the group without a key share
// (`?X25519MLKEM768`); BoringSSL cannot, so we start classical and retry once with hybrid.
// Strategy is selected by createSecureContext probes, not by product/runtime identity.
import { once } from 'node:events';
import tls, { TLSSocket, type SecureContext } from 'node:tls';

const HYBRID_ECDH_CURVE = 'X25519:X25519MLKEM768:P-256:P-384';
const ADVERTISE_HYBRID_WITHOUT_SHARE = 'DEFAULT:-X25519MLKEM768:?X25519MLKEM768';
const CLASSICAL_ECDH_CURVE
  = 'X25519:P-256:X448:P-521:P-384:ffdhe2048:ffdhe3072:ffdhe4096:ffdhe6144:ffdhe8192';

// advertise = OpenSSL 3.5+; retry = BoringSSL+PQ; none = OpenSSL < 3.5 (do not arm hybrid retry).
type HybridTlsCapability = 'advertise' | 'retry' | 'none';

const probeEcdhCurve = (ecdhCurve: string): boolean => {
  try {
    tls.createSecureContext({ ecdhCurve });
    return true;
  } catch {
    return false;
  }
};

const probeHybridTlsCapability = (): HybridTlsCapability => {
  if (probeEcdhCurve(ADVERTISE_HYBRID_WITHOUT_SHARE)) {
    return 'advertise';
  }
  if (probeEcdhCurve(HYBRID_ECDH_CURVE)) {
    return 'retry';
  }
  return 'none';
};

let hybridTlsCapability = probeHybridTlsCapability();

function configureHybridTlsDefaults(): void {
  if (hybridTlsCapability === 'advertise') {
    tls.DEFAULT_ECDH_CURVE = ADVERTISE_HYBRID_WITHOUT_SHARE;
  } else if (hybridTlsCapability === 'none') {
    tls.DEFAULT_ECDH_CURVE = CLASSICAL_ECDH_CURVE;
  }
}

function setHybridTlsCapabilityForTests(capability: HybridTlsCapability | null): void {
  hybridTlsCapability = capability ?? probeHybridTlsCapability();
}

// Carries the ClientRequest through Agent.createSocket → createConnection so an in-flight
// handshake can be destroyed if the request is cancelled before handoff.
const hybridRequest = Symbol('hybridRequest');

// BoringSSL: ERR_SSL_SSLV3_ALERT_HANDSHAKE_FAILURE, or EPROTO with the alert in the message.
// OpenSSL: ERR_SSL_SSL/TLS_ALERT_HANDSHAKE_FAILURE.
const HANDSHAKE_FAILURE_ALERT = 'ALERT_HANDSHAKE_FAILURE';

const isHandshakeFailure = (error: any): boolean =>
  [error?.code, error?.message].some((value) => typeof value === 'string' && value.includes(HANDSHAKE_FAILURE_ALERT));

// A large hybrid ClientHello may be dropped with a reset and no TLS alert.
const isRetryableKeyExchangeError = (error: any, fromHybridAttempt: boolean): boolean =>
  isHandshakeFailure(error) || (fromHybridAttempt && error?.code === 'ECONNRESET');

const isEstablishedTlsSocket = (socket: TLSSocket): boolean => socket instanceof TLSSocket && socket.encrypted;

const cancellationError = (): Error => Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' });

// socks-proxy-agent destroys `req` on TLS failure; a no-op stand-in keeps the real request alive for retry.
// https-proxy-agent must keep the real `req`: it resumes the CONNECT socket on `req`'s `socket` event.
const tlsAttemptRequest = { destroy() {} };

const agentDestroysRequestOnTlsError = (agent: object): boolean => {
  for (let proto = Object.getPrototypeOf(agent); proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
    const protocols = (proto.constructor as { protocols?: readonly string[] } | undefined)?.protocols;
    if (Array.isArray(protocols) && protocols.some((protocol) => protocol.startsWith('socks'))) {
      return true;
    }
  }
  return false;
};

const watchRequestCancellation = (request: any, onCancel: () => void): (() => void) => {
  if (!request) {
    return () => {};
  }
  if (request.destroyed) {
    onCancel();
    return () => {};
  }
  const onClose = () => onCancel();
  request.once('close', onClose);

  // ClientRequest destroyed before it has a socket emits neither close nor error.
  const previousDestroy = request.destroy;
  let cancelOnDestroy = typeof previousDestroy === 'function';
  if (cancelOnDestroy) {
    request.destroy = ((...args: unknown[]) => {
      const result = previousDestroy.apply(request, args);
      onCancel();
      return result;
    }) as typeof request.destroy;
  }

  const signal = request.signal as AbortSignal | undefined;
  const onAbort = () => onCancel();
  if (signal) {
    if (signal.aborted) {
      onCancel();
    } else {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  }

  return () => {
    request.off('close', onClose);
    if (cancelOnDestroy) {
      request.destroy = previousDestroy;
    }
    signal?.removeEventListener('abort', onAbort);
  };
};

// Bounded by insertion order (FIFO). Cleared with the agent cache on SSL/proxy preference changes;
// agent LRU eviction does not touch this set.
const MAX_HYBRID_KEY_EXCHANGE_ENDPOINTS = 500;
const hybridKeyExchangeEndpoints = new Set<string>();

const endpointKey = (host: string, port: number | string | undefined): string => `${String(host).toLowerCase()}:${port}`;

const rememberHybridEndpoint = (key: string): void => {
  hybridKeyExchangeEndpoints.add(key);
  if (hybridKeyExchangeEndpoints.size > MAX_HYBRID_KEY_EXCHANGE_ENDPOINTS) {
    hybridKeyExchangeEndpoints.delete(hybridKeyExchangeEndpoints.values().next().value!);
  }
};

type ConnectWithEcdhCurve = (ecdhCurve: string | undefined) => TLSSocket | Promise<TLSSocket>;

type ConnectWithKeyExchangeFallbackOptions = {
  onRetry?: (offerHybrid: boolean) => void;
  request?: any;
};

async function waitForHandshake(socket: TLSSocket): Promise<TLSSocket> {
  // Non-TLS sockets (https-proxy-agent's stand-in for a refused CONNECT) pass through.
  if (socket instanceof TLSSocket) {
    await once(socket, 'secureConnect');
  }
  return socket;
}

async function connectWithKeyExchangeFallback(
  { host, port }: { host: string; port: number | string | undefined },
  connect: ConnectWithEcdhCurve,
  { onRetry, request }: ConnectWithKeyExchangeFallbackOptions = {}
): Promise<TLSSocket> {
  const key = endpointKey(host, port);
  let activeSocket: { destroy?: () => void } | undefined;
  let cancelled = false;
  let notifyCancelled: (() => void) | undefined;

  const cancel = () => {
    if (cancelled) {
      return;
    }
    cancelled = true;
    activeSocket?.destroy?.();
    notifyCancelled?.();
  };

  const stopWatching = watchRequestCancellation(request, cancel);

  // Deferred secureConnect handoff also defers req.emit('socket'), so ClientRequest.setTimeout
  // never arms. Mirror the request timeout here while the handshake is still ours.
  const timeoutTimer
    = request?.timeout > 0
      ? setTimeout(() => {
          request.emit('timeout');
          cancel();
        }, request.timeout)
      : undefined;

  const whenCancelled = () =>
    new Promise<never>((_, reject) => {
      if (cancelled) {
        reject(cancellationError());
        return;
      }
      notifyCancelled = () => reject(cancellationError());
    });

  const attempt = async (offerHybrid: boolean) => {
    if (cancelled || request?.destroyed) {
      throw cancellationError();
    }
    const cancelledDuringConnect = whenCancelled();
    const connectPromise = Promise.resolve(connect(offerHybrid ? HYBRID_ECDH_CURVE : undefined));
    void connectPromise.then(
      (pendingSocket) => {
        if (cancelled) {
          pendingSocket.destroy?.();
        }
      },
      () => {}
    );
    const socket = await Promise.race([connectPromise, cancelledDuringConnect]);
    activeSocket = socket;
    if (cancelled || request?.destroyed) {
      socket.destroy?.();
      throw cancellationError();
    }
    try {
      return await Promise.race([waitForHandshake(socket), whenCancelled()]);
    } catch (error) {
      if (cancelled) {
        throw cancellationError();
      }
      throw error;
    } finally {
      notifyCancelled = undefined;
    }
  };

  try {
    const offerHybrid = hybridKeyExchangeEndpoints.has(key);
    try {
      return await attempt(offerHybrid);
    } catch (error) {
      if (cancelled || request?.destroyed || !isRetryableKeyExchangeError(error, offerHybrid)) {
        throw cancelled || request?.destroyed ? cancellationError() : error;
      }
      onRetry?.(!offerHybrid);
      const socket = await attempt(!offerHybrid);
      if (isEstablishedTlsSocket(socket)) {
        if (offerHybrid) {
          hybridKeyExchangeEndpoints.delete(key);
        } else {
          rememberHybridEndpoint(key);
        }
      }
      return socket;
    }
  } finally {
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
    }
    stopWatching();
  }
}

// A prebuilt secureContext ignores ecdhCurve; registered factories supply a hybrid twin.
const hybridSecureContextFactories = new WeakMap<SecureContext, () => SecureContext>();

function registerHybridSecureContext(secureContext: SecureContext, createHybridSecureContext: (ecdhCurve: string) => SecureContext): void {
  let hybridSecureContext: SecureContext | undefined;
  hybridSecureContextFactories.set(secureContext, () => (hybridSecureContext ??= createHybridSecureContext(HYBRID_ECDH_CURVE)));
}

function applyEcdhCurveToSecureContext<T extends { ecdhCurve?: string; secureContext?: SecureContext }>(options: T): T {
  const createHybridSecureContext = options.ecdhCurve && options.secureContext && hybridSecureContextFactories.get(options.secureContext);
  return createHybridSecureContext ? { ...options, secureContext: createHybridSecureContext() } : options;
}

const withEcdhCurve = <T extends object>(options: T, ecdhCurve: string | undefined): T =>
  (ecdhCurve ? applyEcdhCurveToSecureContext({ ...options, ecdhCurve }) : options);

function withHybridKeyExchangeFallback<T>(BaseAgentClass: T): T {
  if (hybridTlsCapability !== 'retry') {
    return BaseAgentClass;
  }

  const usesAgentBase = typeof (BaseAgentClass as any).prototype.connect === 'function';

  return class HybridKeyExchangeFallbackAgent extends (BaseAgentClass as any) {
    private connectWithFallback(options: any, connect: ConnectWithEcdhCurve, request?: any): Promise<TLSSocket> {
      return connectWithKeyExchangeFallback(
        { host: options.servername || options.host, port: options.port },
        connect,
        {
          onRetry: (offerHybrid) => this.logRetry(offerHybrid),
          request
        }
      );
    }

    private logRetry(offerHybrid: boolean) {
      const timeline = (this as any).timeline;
      if (Array.isArray(timeline)) {
        timeline.push({
          timestamp: new Date(),
          type: 'tls',
          message: `TLS handshake failed; retrying ${offerHybrid ? 'with' : 'without'} post-quantum key exchange (X25519MLKEM768)`
        });
      }
    }

    createSocket(req: any, options: any, callback: any) {
      if (usesAgentBase) {
        return super.createSocket(req, options, callback);
      }
      return super.createSocket(req, { ...options, [hybridRequest]: req }, callback);
    }

    createConnection(options: any, callback?: (error: Error | null, socket?: TLSSocket) => void) {
      if (usesAgentBase || !callback) {
        return super.createConnection(options, callback);
      }

      this.connectWithFallback(
        options,
        (ecdhCurve) => super.createConnection(withEcdhCurve(options, ecdhCurve)),
        options[hybridRequest]
      ).then((socket) => callback(null, socket), (error) => callback(error));
      return undefined;
    }

    async connect(req: any, options: any) {
      if (!options.secureEndpoint) {
        return super.connect(req, options);
      }

      // SOCKS: stand-in so TLS-error cleanup cannot destroy the real request before we retry.
      // HTTPS proxy: real `req` so https-proxy-agent can resume the CONNECT socket on `socket`.
      const attemptReq = agentDestroysRequestOnTlsError(this) ? tlsAttemptRequest : req;
      return this.connectWithFallback(
        options,
        (ecdhCurve) => super.connect(attemptReq, withEcdhCurve(options, ecdhCurve)),
        req
      );
    }
  } as unknown as T;
}

function clearHybridKeyExchangeEndpoints(): void {
  hybridKeyExchangeEndpoints.clear();
}

export {
  HYBRID_ECDH_CURVE,
  ADVERTISE_HYBRID_WITHOUT_SHARE,
  MAX_HYBRID_KEY_EXCHANGE_ENDPOINTS,
  configureHybridTlsDefaults,
  setHybridTlsCapabilityForTests,
  connectWithKeyExchangeFallback,
  withHybridKeyExchangeFallback,
  clearHybridKeyExchangeEndpoints,
  registerHybridSecureContext,
  applyEcdhCurveToSecureContext
};
