import { isEmpty, get, isUndefined, isNull } from 'lodash';
import { T_LoggerInstance } from '../../utils/logger';
import { T_HttpsAgentRequestFields, T_ModifiedInternalAxiosRequestConfig, T_ProxyConfig, T_SetupProxyAgentsConfig } from '../types';
import { AgentFactory } from './agents';

const parseUrl = require('node:url').parse;

const DEFAULT_PORTS: Record<string, number> = {
  ftp: 21,
  gopher: 70,
  http: 80,
  https: 443,
  ws: 80,
  wss: 443
};

/**
 * Sets up agents for manual proxy configuration
 */
export function setupProxyAgents(config: T_SetupProxyAgentsConfig): void {
  const { requestConfig, proxyConfig, httpsAgentRequestFields, timeline } = config;

  const isProxyOff = get(proxyConfig, 'mode', 'off') === 'off';
  if (isProxyOff) {
    setupDirectAgents({ requestConfig, httpsAgentRequestFields, timeline });
    return;
  }

  const url = requestConfig.url;
  if (!url) {
    throw new Error('Request URL is required for proxy configuration');
  }

  const bypassProxy = get(proxyConfig, 'bypassProxy', '');
  const shouldProxy = shouldUseProxy(url, bypassProxy);

  if (!shouldProxy) {
    timeline.add('info', 'Proxy bypassed for this URL');
    setupDirectAgents({ requestConfig, httpsAgentRequestFields, timeline });
    return;
  }

  const proxyUri = buildProxyUri(proxyConfig);
  const protocol = get(proxyConfig, 'protocol', '');
  const usingSystemProxy = get(proxyConfig, 'mode', 'off') === 'system';

  timeline.add('info', `Using ${usingSystemProxy ? 'system' : ''} proxy: ${proxyUri}`);

  const agentConfig = {
    agentOptions: httpsAgentRequestFields,
    timeline,
    proxyUri
  };

  if (isSocksProxy(protocol)) {
    // SOCKS proxy for both HTTP and HTTPS
    requestConfig.httpAgent = AgentFactory.createSocksProxyAgent(agentConfig);
    requestConfig.httpsAgent = AgentFactory.createSocksProxyAgent(agentConfig);
  } else {
    // HTTP/HTTPS proxy
    requestConfig.httpAgent = AgentFactory.createHttpProxyAgent(proxyUri);
    requestConfig.httpsAgent = AgentFactory.createHttpsProxyAgent(agentConfig);
  }
}

/**
 * Sets up agents for direct connection (no proxy)
 */
function setupDirectAgents({
  requestConfig,
  httpsAgentRequestFields,
  timeline
}: {
  requestConfig: T_ModifiedInternalAxiosRequestConfig,
  httpsAgentRequestFields: T_HttpsAgentRequestFields,
  timeline: T_LoggerInstance
}): void {
  timeline.add('info', 'Using direct connection (no proxy)');

  const agentConfig = {
    agentOptions: httpsAgentRequestFields,
    timeline
  };

  requestConfig.httpsAgent = AgentFactory.createHttpsAgent(agentConfig);
}

/**
 * Check bypass rules against hostname and port
 */
function checkBypassRules(proxyBypass: string, hostname: string, port: number): boolean {
  const bypassList = proxyBypass.split(/[,;\s]/).filter(rule => rule);

  return bypassList.every(rule => {
    if (!rule) return true; // Skip empty rules

    const parsedRule = rule.match(/^(.+):(\d+)$/);
    const ruleHostname = parsedRule ? parsedRule[1] : rule;
    const rulePort = parsedRule ? parseInt(parsedRule[2]) : 0;

    // Check port match if specified
    if (rulePort && rulePort !== port) {
      return true; // Skip if ports don't match
    }

    // Handle wildcard patterns
    if (ruleHostname.startsWith('*')) {
      const pattern = ruleHostname.slice(1); // Remove leading *
      return !hostname.endsWith(pattern);
    }

    // Exact hostname match
    return hostname !== ruleHostname;
  });
}


function shouldUseProxy(url: string, proxyBypass: string): boolean {
  if (proxyBypass === '*') {
    return false; // Never proxy if wildcard is set
  }

  // Use proxy if no bypass rules are set
  if (!proxyBypass || typeof proxyBypass !== 'string' || isEmpty(proxyBypass.trim())) {
    return true;
  }

  const parsedUrl = parseUrl(url);
  const { protocol, host, port } = parsedUrl;

  if (!host || !protocol) {
    return false; // Don't proxy URLs without valid scheme or host
  }

  const normalizedProtocol = protocol.split(':', 1)[0];
  const hostname = host.replace(/:\d*$/, ''); // Remove port from hostname
  const normalizedPort = parseInt(port) || DEFAULT_PORTS[normalizedProtocol] || 0;

  return checkBypassRules(proxyBypass, hostname, normalizedPort);
}

/**
 * Builds proxy URI from configuration
 */
function buildProxyUri(proxyConfig: T_ProxyConfig): string {
  const protocol = get(proxyConfig, 'protocol', '');
  const hostname = get(proxyConfig, 'hostname', '');
  const port = get(proxyConfig, 'port', '');
  const authEnabled = get(proxyConfig, 'auth.enabled', false);

  if (!protocol || !hostname) {
    throw new Error('Proxy protocol and hostname are required');
  }

  const portPart = isUndefined(port) || isNull(port) ? '' : `:${port}`;

  if (authEnabled) {
    const username = encodeURIComponent(get(proxyConfig, 'auth.username', ''));
    const password = encodeURIComponent(get(proxyConfig, 'auth.password', ''));
    return `${protocol}://${username}:${password}@${hostname}${portPart}`;
  }

  return `${protocol}://${hostname}${portPart}`;
}

/**
 * Determines if proxy protocol is SOCKS-based
 */
function isSocksProxy(protocol: string): boolean {
  return protocol.toLowerCase().includes('socks');
}
