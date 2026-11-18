// Hybrid key exchange (X25519MLKEM768) for BoringSSL (Electron). BoringSSL puts a key share for
// every offered group in the first ClientHello, so we start classical and retry once with hybrid
// when the handshake fails. OpenSSL (CLI) advertises hybrid without that upfront share; see bru.js.
import { once } from 'node:events';
import { TLSSocket, type SecureContext } from 'node:tls';

const HYBRID_ECDH_CURVE = 'X25519:X25519MLKEM768:P-256:P-384';

// BoringSSL: ERR_SSL_SSLV3_ALERT_HANDSHAKE_FAILURE, or EPROTO with the alert in the message.
// OpenSSL: ERR_SSL_SSL/TLS_ALERT_HANDSHAKE_FAILURE.
const HANDSHAKE_FAILURE_ALERT = 'ALERT_HANDSHAKE_FAILURE';

const isHandshakeFailure = (error: any): boolean =>
  [error?.code, error?.message].some((value) => typeof value === 'string' && value.includes(HANDSHAKE_FAILURE_ALERT));

// A large hybrid ClientHello may be dropped with a reset and no TLS alert.
const isRetryableKeyExchangeError = (error: any, fromHybridAttempt: boolean): boolean =>
  isHandshakeFailure(error) || (fromHybridAttempt && error?.code === 'ECONNRESET');

const isEstablishedTlsSocket = (socket: TLSSocket): boolean => socket instanceof TLSSocket && socket.encrypted;

const isBoringSsl = (): boolean => Boolean(process.versions.electron);

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
  onRetry?: (offerHybrid: boolean) => void
): Promise<TLSSocket> {
  const key = endpointKey(host, port);
  const attempt = async (offerHybrid: boolean) => waitForHandshake(await connect(offerHybrid ? HYBRID_ECDH_CURVE : undefined));

  const offerHybrid = hybridKeyExchangeEndpoints.has(key);
  try {
    return await attempt(offerHybrid);
  } catch (error) {
    if (!isRetryableKeyExchangeError(error, offerHybrid)) {
      throw error;
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
