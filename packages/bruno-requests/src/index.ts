export {
  addDigestInterceptor,
  getOAuth2Token,
  createOAuth1Authorizer,
  computeBodyHash,
  applyOAuth1ToRequest,
  addEdgeGridInterceptor,
  handleNtlmRedirect,
  addAwsV4Interceptor,
  resolveAwsV4Credentials
} from './auth';
export type { AwsV4Config } from './auth';
export { interpolateString, interpolateObject } from './interpolation';
export type { InterpolationOptions } from './interpolation';
export { GrpcClient, generateGrpcSampleMessage } from './grpc';
export { WsClient } from './ws/ws-client';
export { default as cookies } from './cookies';

export { getCACertificates } from './utils/ca-cert';
export { transformProxyConfig } from './utils/proxy-util';
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
