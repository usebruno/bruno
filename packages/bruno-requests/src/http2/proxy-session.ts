import * as http2wrapper from 'http2-wrapper';
import { SocksProxyAgent } from 'socks-proxy-agent';
import type { ClientHttp2Session } from 'node:http2';
import type { LookupFunction } from 'node:net';
import { pickTlsFields, wrapLookup, withSocketGuard } from './tls-options';
import { H2_IDLE_TIMEOUT_MS, acquireFreshH2Session } from './session';
import type { ProxyInfo } from './proxy-info';

type ProxyStreamResult = [stream: unknown, statusCode: number, statusMessage: string];
type SocksInternals = {
  proxyOptions: { url: URL | string };
  socksAgent?: SocksProxyAgent;
  socksLookup?: LookupFunction;
};

/**
 * Reuse http2-wrapper's tunneling and session pooling, but open the proxy connection with
 * socks-proxy-agent
 */
class Http2OverSocksBase extends http2wrapper.proxies.Http2OverHttp {
  async _getProxyStream(authority: string): Promise<ProxyStreamResult> {
    const self = this as unknown as SocksInternals;
    const { url } = self.proxyOptions;
    const proxyHref = typeof url === 'string' ? url : url.href;
    const lastColon = authority.lastIndexOf(':');
    const host = authority.slice(0, lastColon);
    const port = Number(authority.slice(lastColon + 1));

    // One agent per proxy; it parses the scheme to pick the SOCKS version, auth and DNS behaviour.
    if (!self.socksAgent) {
      self.socksAgent = new SocksProxyAgent(proxyHref);
    }

    // agent-base's connect() returns the raw tunnelled socket when secureEndpoint is false
    const req = { destroy() {} } as any;
    const socket = await self.socksAgent.connect(req, {
      host,
      port,
      secureEndpoint: false,
      ...(self.socksLookup ? { lookup: self.socksLookup } : {})
    } as any);

    return [socket, 200, 'OK'];
  }
}

const Http2OverHttp = withSocketGuard(http2wrapper.proxies.Http2OverHttp);
const Http2OverHttps = withSocketGuard(http2wrapper.proxies.Http2OverHttps);
const Http2OverSocks = withSocketGuard(Http2OverSocksBase);

/** One pooled Agent per proxy, keyed by ProxyInfo.key. */
const proxyAgents = new Map<string, InstanceType<typeof http2wrapper.Agent>>();

const buildProxyAgent = (info: ProxyInfo): InstanceType<typeof http2wrapper.Agent> => {
  const proxyOptions: http2wrapper.ProxyOptions = { url: info.url };
  const agentOptions = { timeout: H2_IDLE_TIMEOUT_MS };
  if (info.kind === 'socks') {
    return new Http2OverSocks({ proxyOptions, ...agentOptions });
  }
  if (info.kind === 'https') {
    // The connection to the proxy is itself TLS; forward the proxy's TLS fields so its cert is verified.
    Object.assign(proxyOptions, pickTlsFields(info.proxyTls));
    return new Http2OverHttps({ proxyOptions, ...agentOptions });
  }
  return new Http2OverHttp({ proxyOptions, ...agentOptions });
};

export type AcquireH2SessionViaProxyParams = {
  origin: string;
  proxyInfo: ProxyInfo;
  tlsOptions?: Record<string, unknown> | null;
  lookup?: LookupFunction;
};

export function acquireH2SessionViaProxy(params: AcquireH2SessionViaProxyParams): Promise<ClientHttp2Session> {
  const { origin, proxyInfo, tlsOptions, lookup } = params;
  let agent = proxyAgents.get(proxyInfo.key);
  if (!agent) {
    agent = buildProxyAgent(proxyInfo);
    proxyAgents.set(proxyInfo.key, agent);
  }
  // For SOCKS, resolve the destination with custom DNS when one is configured.
  if (proxyInfo.kind === 'socks' && lookup) {
    (agent as unknown as SocksInternals).socksLookup = lookup;
  }
  return acquireFreshH2Session(agent as unknown as Parameters<typeof acquireFreshH2Session>[0], origin, {
    ...pickTlsFields(tlsOptions),
    ...(lookup ? { lookup: wrapLookup(lookup) } : {})
  });
}

/** Destroy every pooled proxy Agent (app quit, CLI run end, HTTP version preference change). */
export function closeAllProxyAgents(): void {
  for (const agent of proxyAgents.values()) {
    try {
      agent.destroy();
    } catch {
      /* already gone */
    }
  }
  proxyAgents.clear();
}
