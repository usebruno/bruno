export {
  addDigestInterceptor,
  getOAuth2Token,
  createOAuth1Authorizer,
  computeBodyHash,
  applyOAuth1ToRequest,
  addEdgeGridInterceptor,
  handleNtlmRedirect
} from './auth';
export { GrpcClient, generateGrpcSampleMessage } from './grpc';
export { WsClient } from './ws/ws-client';
export { default as cookies } from './cookies';

export { getCACertificates } from './utils/ca-cert';
export { transformProxyConfig, normalizeProxyPort } from './utils/proxy-util';
export type { ProxyPort } from './utils/proxy-util';
export { default as createVaultClient, VaultError } from './utils/node-vault';
export type { VaultClient, VaultConfig, VaultRequestOptions } from './utils/node-vault';
export { getHttpHttpsAgents, resolveAgentsFromPac, PatchedHttpsProxyAgent } from './utils/http-https-agents';
export { initializeShellEnv, fetchShellEnv } from './utils/shell-env';
export { getOrCreateHttpsAgent, getOrCreateHttpAgent, clearAgentCache, getAgentCacheSize } from './utils/agent-cache';
export { getPacResolver, clearPacCache } from './utils/pac-resolver';
export type { PacWrapper, GetPacResolverParams } from './utils/pac-resolver';

export * as scripting from './scripting';

export {
  makeAxiosInstance,
  getSystemProxy,
  getSentHeaders,
  applySentHeadersToRequest,
  applyOmitConnectionToAxiosConfig,
  readCurrentTime,
  measureTimeSince,
  startHop,
  completeHop,
  measureResponseTime
} from './network';
