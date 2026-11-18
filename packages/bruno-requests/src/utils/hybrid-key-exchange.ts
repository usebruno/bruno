/**
 * Post-quantum hybrid key exchange (X25519MLKEM768) for BoringSSL runtimes (Electron).
 *
 * BoringSSL sends a key share for both a classical and a post-quantum group whenever both are
 * offered, so offering X25519MLKEM768 always adds its ~1.2KB key share to the first ClientHello,
 * which some servers with small ClientHello limits reject. Connections therefore start with
 * BoringSSL's classical default. When a TLS handshake is rejected, it is retried once with the
 * other setting (hybrid group offered or not), before the socket is handed to the request, and an
 * endpoint whose retry succeeds keeps that setting for later connections. Because a rejected
 * setting is always retried, the remembered setting follows a server that adds or drops support.
 *
 * Node's OpenSSL (bruno-cli) can offer the hybrid group without sending its key share up front,
 * so it needs no retry; see bruno-cli/bin/bru.js.
 */
import { once } from 'node:events';
import { TLSSocket, type SecureContext } from 'node:tls';

const HYBRID_ECDH_CURVE = 'X25519:X25519MLKEM768:P-256:P-384';

// A handshake_failure alert. BoringSSL reports it as ERR_SSL_SSLV3_ALERT_HANDSHAKE_FAILURE, or as
// EPROTO with the alert in the message when the failure surfaces on a write; OpenSSL reports it
// as ERR_SSL_SSL/TLS_ALERT_HANDSHAKE_FAILURE.
const HANDSHAKE_FAILURE_ALERT = 'ALERT_HANDSHAKE_FAILURE';

const isHandshakeFailure = (error: any): boolean =>
  [error?.code, error?.message].some((value) => typeof value === 'string' && value.includes(HANDSHAKE_FAILURE_ALERT));

const isBoringSsl = (): boolean => Boolean(process.versions.electron);

// The endpoints that needed the hybrid group, least recently used first. A Set iterates in
// insertion order, so re-inserting an endpoint on use and evicting the first entry makes it an LRU.
const MAX_HYBRID_KEY_EXCHANGE_ENDPOINTS = 500;
const hybridKeyExchangeEndpoints = new Set<string>();

// Marks the endpoint most recently used, returning whether it was already remembered.
const touchHybridKeyExchangeEndpoint = (endpointKey: string): boolean => {
  const remembered = hybridKeyExchangeEndpoints.delete(endpointKey);
  hybridKeyExchangeEndpoints.add(endpointKey);
  return remembered;
};

const usesHybridKeyExchange = (endpointKey: string): boolean =>
  hybridKeyExchangeEndpoints.has(endpointKey) && touchHybridKeyExchangeEndpoint(endpointKey);

const rememberHybridKeyExchange = (endpointKey: string): void => {
  touchHybridKeyExchangeEndpoint(endpointKey);
  if (hybridKeyExchangeEndpoints.size > MAX_HYBRID_KEY_EXCHANGE_ENDPOINTS) {
    hybridKeyExchangeEndpoints.delete(hybridKeyExchangeEndpoints.values().next().value!);
  }
};

const getEndpointKey = (host: string, port: number | string | undefined): string => `${String(host).toLowerCase()}:${port}`;

/**
 * Resolves with the socket once its TLS handshake completes, or rejects with its error. A socket
 * that isn't TLS (https-proxy-agent's stand-in for a refused CONNECT) resolves as is.
 */
async function waitForHandshake(socket: TLSSocket): Promise<TLSSocket> {
  if (socket instanceof TLSSocket) {
    // Rejects with the socket's error if it fails first.
    await once(socket, 'secureConnect');
  }
  return socket;
}

type ConnectWithEcdhCurve = (ecdhCurve: string | undefined) => TLSSocket | Promise<TLSSocket>;

/**
 * Opens a TLS connection with the setting remembered for the endpoint, and on a handshake
 * failure retries once with the other setting, remembering it if the retry succeeds.
 */
async function connectWithKeyExchangeFallback(
  { host, port }: { host: string; port: number | string | undefined },
  connect: ConnectWithEcdhCurve,
  onRetry?: (offerHybrid: boolean) => void
): Promise<TLSSocket> {
  const endpointKey = getEndpointKey(host, port);
  const attempt = async (offerHybrid: boolean) => waitForHandshake(await connect(offerHybrid ? HYBRID_ECDH_CURVE : undefined));

  const offerHybrid = usesHybridKeyExchange(endpointKey);
  try {
    return await attempt(offerHybrid);
  } catch (error) {
    if (!isHandshakeFailure(error)) {
      throw error;
    }
    onRetry?.(!offerHybrid);
    const socket = await attempt(!offerHybrid);
    if (offerHybrid) {
      hybridKeyExchangeEndpoints.delete(endpointKey);
    } else {
      rememberHybridKeyExchange(endpointKey);
    }
    return socket;
  }
}

// The groups a TLS connection offers belong to its secure context, so a connection given a
// prebuilt `secureContext` ignores `ecdhCurve`. Code that builds secure contexts registers how to
// build each one's hybrid twin.
const hybridSecureContextFactories = new WeakMap<SecureContext, () => SecureContext>();

function registerHybridSecureContext(secureContext: SecureContext, createHybridSecureContext: (ecdhCurve: string) => SecureContext): void {
  let hybridSecureContext: SecureContext | undefined;
  hybridSecureContextFactories.set(secureContext, () => (hybridSecureContext ??= createHybridSecureContext(HYBRID_ECDH_CURVE)));
}

/**
 * Makes connection options carrying an `ecdhCurve` honor it when they also carry a registered
 * `secureContext`, by swapping in that context's hybrid twin.
 */
function applyEcdhCurveToSecureContext<T extends { ecdhCurve?: string; secureContext?: SecureContext }>(options: T): T {
  const createHybridSecureContext = options.ecdhCurve && options.secureContext && hybridSecureContextFactories.get(options.secureContext);
  return createHybridSecureContext ? { ...options, secureContext: createHybridSecureContext() } : options;
}

const withEcdhCurve = <T extends object>(options: T, ecdhCurve: string | undefined): T =>
  (ecdhCurve ? applyEcdhCurveToSecureContext({ ...options, ecdhCurve }) : options);

/**
 * Wraps an HTTPS agent class so its TLS connections fall back between the classical and the
 * hybrid key exchange during the handshake, on BoringSSL runtimes.
 *
 * Plain `https.Agent` subclasses connect through `createConnection`, which defers the socket to
 * its callback until the handshake has settled. agent-base proxy agents (https-proxy-agent,
 * socks-proxy-agent) build the target TLS socket in `connect`, opening a fresh tunnel per attempt.
 */
function withHybridKeyExchangeFallback<T>(BaseAgentClass: T): T {
  const usesAgentBase = typeof (BaseAgentClass as any).prototype.connect === 'function';

  return class HybridKeyExchangeFallbackAgent extends (BaseAgentClass as any) {
    private connectWithFallback(options: any, connect: ConnectWithEcdhCurve): Promise<TLSSocket> {
      return connectWithKeyExchangeFallback(
        { host: options.servername || options.host, port: options.port },
        connect,
        (offerHybrid) => this.logRetry(offerHybrid)
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

    createConnection(options: any, callback?: (error: Error | null, socket?: TLSSocket) => void) {
      if (usesAgentBase || !callback || !isBoringSsl()) {
        return super.createConnection(options, callback);
      }

      this.connectWithFallback(options, (ecdhCurve) => super.createConnection(withEcdhCurve(options, ecdhCurve))).then((socket) => callback(null, socket), (error) => callback(error));
      return undefined;
    }

    async connect(req: any, options: any) {
      if (!options.secureEndpoint || !isBoringSsl()) {
        return super.connect(req, options);
      }

      return this.connectWithFallback(options, (ecdhCurve) => super.connect(req, withEcdhCurve(options, ecdhCurve)));
    }
  } as unknown as T;
}

function clearHybridKeyExchangeEndpoints(): void {
  hybridKeyExchangeEndpoints.clear();
}

export {
  HYBRID_ECDH_CURVE,
  MAX_HYBRID_KEY_EXCHANGE_ENDPOINTS,
  connectWithKeyExchangeFallback,
  withHybridKeyExchangeFallback,
  clearHybridKeyExchangeEndpoints,
  registerHybridSecureContext,
  applyEcdhCurveToSecureContext
};
