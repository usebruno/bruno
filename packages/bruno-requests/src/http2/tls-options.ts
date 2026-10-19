import type { ConnectionOptions, TLSSocket } from 'node:tls';
import type { LookupFunction } from 'node:net';
import type { SecureClientSessionOptions } from 'node:http2';
import type { Agent } from 'http2-wrapper';

export type TlsOptions = Pick<
  ConnectionOptions,
  | 'ca'
  | 'cert'
  | 'key'
  | 'pfx'
  | 'passphrase'
  | 'rejectUnauthorized'
  | 'servername'
  | 'checkServerIdentity'
  | 'minVersion'
  | 'maxVersion'
  | 'ciphers'
  | 'secureProtocol'
>;

export const TLS_FIELDS = [
  'ca',
  'cert',
  'key',
  'pfx',
  'passphrase',
  'rejectUnauthorized',
  'servername',
  'checkServerIdentity',
  'minVersion',
  'maxVersion',
  'ciphers',
  'secureProtocol'
] as const satisfies readonly (keyof TlsOptions)[];

/**
 * Pick only TLS-related options, leaving out HTTP agent settings
 * like keepAlive and maxSockets.
 */
export function pickTlsFields(options?: Record<string, unknown> | null): TlsOptions {
  const http2TlsFields: Record<string, unknown> = {};
  if (!options) return http2TlsFields;

  for (const field of TLS_FIELDS) {
    if (options[field] !== undefined) http2TlsFields[field] = options[field];
  }

  return http2TlsFields as TlsOptions;
}

/**
 * Node's HTTP/2 connection may request DNS results as an array (options.all).
 * Wrap single-address results in an array while leaving existing arrays unchanged.
 */
export function wrapLookup(lookup: LookupFunction): LookupFunction {
  return ((hostname: string, options: any, callback: any) => {
    lookup(hostname, options, (err: Error | null, address: any, family?: number) => {
      if (err) return callback(err);

      if (options && options.all && !Array.isArray(address)) {
        return callback(null, [{ address, family }]);
      }

      return callback(null, address, family);
    });
  }) as unknown as LookupFunction;
}

type AgentConstructor = new (...args: any[]) => Agent;

/**
 * Work around a Node 22 issue where a TLS socket error can leave an HTTP/2
 * session stuck without emitting error or close.
 *
 * Destroying the socket ensures http2-wrapper can reject the pending request
 * instead of leaving later requests waiting indefinitely.
 */
export function withSocketGuard<TBase extends AgentConstructor>(Base: TBase): TBase {
  class Guarded extends Base {
    async createConnection(origin: URL, options: SecureClientSessionOptions): Promise<TLSSocket> {
      const socket = (await super.createConnection(origin, options)) as TLSSocket;

      socket.once('error', () => {
        if (!socket.destroyed) socket.destroy();
      });

      return socket;
    }
  }

  return Guarded;
}
