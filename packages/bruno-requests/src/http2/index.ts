export {
  resolveHttpVersion,
  invalidateAlpn,
  clearAlpnCache,
  canUseHttp2,
  HTTP_VERSION
} from './alpn';
export type { HttpVersionPreference, Resolved, ResolveHttpVersionParams } from './alpn';

export {
  acquireH2Session,
  closeAllSessions,
  H2_IDLE_TIMEOUT_MS
} from './session';
export type { AcquireH2SessionParams } from './session';

export { buildHttp2Headers, CONNECTION_SPECIFIC_HEADERS } from './headers';
export type { BuildH2HeadersParams, HeaderValue } from './headers';

export { applyHttp2Transport } from './select-transport';
export type { ApplyHttp2TransportParams, Http2TimelineEntry } from './select-transport';

export { createHttp2Transport } from './transport';
export type { Http2Transport, Http2TransportRequestOptions } from './transport';

export { acquireH2SessionViaProxy, closeAllProxyAgents } from './proxy-session';
export type { AcquireH2SessionViaProxyParams } from './proxy-session';

export { agentToProxyInfo } from './proxy-info';
export type { ProxyInfo, ProxyKind } from './proxy-info';

export { pickTlsFields, TLS_FIELDS } from './tls-options';
export type { TlsOptions } from './tls-options';
