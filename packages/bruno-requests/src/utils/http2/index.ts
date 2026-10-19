export { buildTlsConnectOptions, pickTlsFields, wrapLookup, ALPN_BY_MODE } from './tls-connect-options';
export type { HttpVersionMode, BuildTlsConnectOptionsParams } from './tls-connect-options';
export { negotiateHttpVersion, resolveHttpVersion, invalidateAlpn, clearAlpnCache } from './alpn';
export type { NegotiationResult, Resolved, ResolveHttpVersionParams } from './alpn';
