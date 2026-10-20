export { buildTlsConnectOptions, pickTlsFields, wrapLookup, ALPN_BY_MODE } from './tls-connect-options';
export type { HttpVersionMode, BuildTlsConnectOptionsParams } from './tls-connect-options';
export { negotiateHttpVersion, resolveHttpVersion, invalidateAlpn, clearAlpnCache } from './alpn';
export type { NegotiationResult, Resolved, ResolveHttpVersionParams } from './alpn';
export { toHttp2Headers, fromHttp2Headers } from './headers';
export type { Http1Headers, Http2RequestHeaders } from './headers';
export { sendHttp2Request } from './transport';
export type { Http2RequestOptions, Http2Response } from './transport';
