export { establishTlsConnection, buildTlsConnectOptions, pickTlsFields, wrapLookup, stripIpv6Brackets, ALPN_BY_MODE, TLS_FIELDS } from './tls-connect-options';
export type { HttpVersionMode, BrunoTlsOptions, BuildTlsConnectOptionsParams, ConnectTlsParams, ConnectTlsResult } from './tls-connect-options';
export { acquireSession, closeAllSessions, getSessionCount, getSessionEntries, getSessionKey, hasLiveSession } from './session-pool';
export type { AcquireSessionParams, AcquireResult, PooledSession, SessionState, TimelineEntry, CodedError } from './session-pool';
export { buildHttp2RequestHeaders, CONNECTION_HEADERS } from './headers';
export type { H2HeadersResult, ToH2HeadersParams } from './headers';
export { createHttp2Transport } from './create-http2-transport';
export type { CreateHttp2TransportParams } from './create-http2-transport';

export { negotiateHttpVersion, clearAlpnCache, canUseHttp2 } from './negotiate-http-version';
export type { NegotiateHttpVersionParams, HttpVersionDecision } from './negotiate-http-version';

export { isProxyAgent, proxyKeyFor, redactProxyUri, buildProxyTlsOptions, connectThroughProxy } from './proxy-tunnel';
export type { ProxyAgentLike, BuildProxyTlsOptionsParams, ConnectThroughProxyParams, ProxyTunnelResult } from './proxy-tunnel';

export { applyHttp2Transport, applyBasicAuthHeader } from './apply-http2-transport';
export type { Http2TransportConfig, ApplyHttp2TransportParams } from './apply-http2-transport';

export { getHttp2RequestDetails } from './http2-request-details';
export type { Http2RequestDetails } from './http2-request-details';
