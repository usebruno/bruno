import * as fs from 'node:fs';
import * as path from 'node:path';
import https from 'node:https';
import type { Agent as HttpAgent } from 'node:http';
import type { Agent as HttpsAgent } from 'node:https';
import { parse as parseUrl, type Url } from 'url';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';
import { isEmpty, get, isUndefined, isNull } from 'lodash';
import { getCACertificates } from './ca-cert';
import { transformProxyConfig } from './proxy-util';

const DEFAULT_PORTS: Record<string, number> = {
  ftp: 21,
  gopher: 70,
  http: 80,
  https: 443,
  ws: 80,
  wss: 443
};

type ProxyMode = 'on' | 'off' | 'system';

type ProxyAuth = {
  enabled: boolean;
  username?: string;
  password?: string;
};

type ProxyConfig = {
  enabled?: boolean | 'global';
  protocol?: string;
  hostname?: string;
  port?: number | null;
  auth?: ProxyAuth;
  bypassProxy?: string;
  mode?: ProxyMode;
};

type SystemProxyConfig = {
  http_proxy?: string;
  https_proxy?: string;
  no_proxy?: string;
};

type ClientCertificate = {
  domain?: string;
  type?: 'cert' | 'pfx';
  certFilePath?: string;
  keyFilePath?: string;
  pfxFilePath?: string;
  passphrase?: string;
};

type CACertificatesCount = {
  system: number;
  root: number;
  custom: number;
  extra: number;
};

type CertsConfig = {
  caCertificatesCount?: CACertificatesCount;
  ca?: string | string[];
  cert?: Buffer;
  key?: Buffer;
  pfx?: Buffer;
  passphrase?: string;
};

type HttpsAgentRequestFields = {
  keepAlive?: boolean;
  rejectUnauthorized?: boolean;
  caCertificatesCount?: CACertificatesCount;
  ca?: string | string[];
};

type TlsOptions = HttpsAgentRequestFields & CertsConfig & {
  secureProtocol?: string;
  minVersion?: string;
  ALPNProtocols?: string[];
};

type AgentResult = {
  httpAgent?: HttpAgent;
  httpsAgent?: HttpsAgent | HttpsProxyAgent<any> | SocksProxyAgent;
};

type ConfigOptions = {
  noproxy: boolean;
  shouldVerifyTls: boolean;
  shouldUseCustomCaCertificate: boolean;
  customCaCertificateFilePath?: string;
  shouldKeepDefaultCaCertificates: boolean;
};

type GetCertsAndProxyConfigParams = {
  requestUrl?: string;
  collectionPath: string;
  options: ConfigOptions;
  clientCertificates?: {
    certs?: ClientCertificate[];
  };
  collectionLevelProxy?: ProxyConfig;
  systemProxyConfig?: SystemProxyConfig;
};

type GetCertsAndProxyConfigResult = {
  proxyMode: ProxyMode;
  proxyConfig: ProxyConfig;
  certsConfig: CertsConfig;
};

type CreateAgentsParams = {
  requestUrl?: string;
  proxyMode: ProxyMode;
  proxyConfig: ProxyConfig;
  certsConfig: CertsConfig;
  httpsAgentRequestFields: HttpsAgentRequestFields;
  systemProxyConfig?: SystemProxyConfig;
};

type GetHttpHttpsAgentsParams = {
  requestUrl?: string;
  collectionPath: string;
  options: ConfigOptions;
  clientCertificates?: {
    certs?: ClientCertificate[];
  };
  collectionLevelProxy?: ProxyConfig;
  systemProxyConfig?: SystemProxyConfig;
};

/**
 * check for proxy bypass, copied from 'proxy-from-env'
 */
const shouldUseProxy = (url: string | undefined, proxyBypass: string | undefined): boolean => {
  if (proxyBypass === '*') {
    return false; // Never proxy if wildcard is set.
  }

  // use proxy if no proxyBypass is set
  if (!proxyBypass || typeof proxyBypass !== 'string' || isEmpty(proxyBypass.trim())) {
    return true;
  }

  const parsedUrl: Url | {} = typeof url === 'string' ? parseUrl(url) : (url ? (url as unknown as Url) : {});
  const urlObj = parsedUrl as Url;
  let proto = urlObj.protocol;
  let hostname = urlObj.host;
  let port: string | null = urlObj.port;
  if (typeof hostname !== 'string' || !hostname || typeof proto !== 'string') {
    return false; // Don't proxy URLs without a valid scheme or host.
  }

  proto = proto.split(':', 1)[0];
  // Stripping ports in this way instead of using parsedUrl.hostname to make
  // sure that the brackets around IPv6 addresses are kept.
  hostname = hostname.replace(/:\d*$/, '');
  const portNum = parseInt(port || '', 10) || DEFAULT_PORTS[proto] || 0;

  return proxyBypass.split(/[,;\s]/).every(function (dontProxyFor) {
    if (!dontProxyFor) {
      return true; // Skip zero-length hosts.
    }
    const parsedProxy = dontProxyFor.match(/^(.+):(\d+)$/);
    let parsedProxyHostname = parsedProxy ? parsedProxy[1] : dontProxyFor;
    const parsedProxyPort = parsedProxy ? parseInt(parsedProxy[2], 10) : 0;
    if (parsedProxyPort && parsedProxyPort !== portNum) {
      return true; // Skip if ports don't match.
    }

    if (!/^[.*]/.test(parsedProxyHostname)) {
      // No wildcards, so stop proxying if there is an exact match.
      return hostname !== parsedProxyHostname;
    }

    if (parsedProxyHostname.charAt(0) === '*') {
      // Remove leading wildcard.
      parsedProxyHostname = parsedProxyHostname.slice(1);
    }
    // Stop proxying if the hostname ends with the no_proxy host.
    return !hostname.endsWith(parsedProxyHostname);
  });
};

/**
 * Patched version of HttpsProxyAgent to get around a bug that ignores options
 * such as ca and rejectUnauthorized when upgrading the proxied socket to TLS:
 * https://github.com/TooTallNate/proxy-agents/issues/194
 */
class PatchedHttpsProxyAgent extends HttpsProxyAgent<any> {
  private constructorOpts: any;

  constructor(proxy: string, opts: any) {
    super(proxy, opts);
    this.constructorOpts = opts;
  }

  async connect(req: any, opts: any) {
    const combinedOpts = { ...this.constructorOpts, ...opts };
    return super.connect(req, combinedOpts);
  }
}

const getCertsAndProxyConfig = ({
  requestUrl,
  collectionPath,
  options,
  clientCertificates,
  collectionLevelProxy,
  systemProxyConfig
}: GetCertsAndProxyConfigParams): GetCertsAndProxyConfigResult => {
  const certsConfig: CertsConfig = {};

  const caCertFilePath = options.shouldUseCustomCaCertificate && options.customCaCertificateFilePath ? options.customCaCertificateFilePath : undefined;
  const caCertificatesData = getCACertificates({
    caCertFilePath,
    shouldKeepDefaultCerts: options.shouldKeepDefaultCaCertificates
  });

  const caCertificates = caCertificatesData.caCertificates;
  const caCertificatesCount = caCertificatesData.caCertificatesCount;

  // configure HTTPS agent with aggregated CA certificates
  certsConfig.caCertificatesCount = caCertificatesCount;
  certsConfig.ca = caCertificates || [];

  // client certificate config
  const clientCertConfig = get(clientCertificates, 'certs', []) as ClientCertificate[];

  for (const clientCert of clientCertConfig) {
    const domain = clientCert?.domain;
    const type = clientCert?.type || 'cert';
    if (domain) {
      const hostRegex = '^(https:\\/\\/|grpc:\\/\\/|grpcs:\\/\\/)?' + domain.replace(/\./g, '\\.').replace(/\*/g, '.*');
      if (requestUrl && requestUrl.match(hostRegex)) {
        if (type === 'cert') {
          try {
            let certFilePath = clientCert?.certFilePath;
            if (!certFilePath) {
              throw new Error('certFilePath is required for cert type');
            }
            certFilePath = path.isAbsolute(certFilePath) ? certFilePath : path.join(collectionPath, certFilePath);
            let keyFilePath = clientCert?.keyFilePath;
            if (!keyFilePath) {
              throw new Error('keyFilePath is required for cert type');
            }
            keyFilePath = path.isAbsolute(keyFilePath) ? keyFilePath : path.join(collectionPath, keyFilePath);

            certsConfig.cert = fs.readFileSync(certFilePath);
            certsConfig.key = fs.readFileSync(keyFilePath);
          } catch (err: any) {
            console.error('Error reading cert/key file', err);
            throw new Error(`Error reading cert/key file: ${err.message}`);
          }
        } else if (type === 'pfx') {
          try {
            let pfxFilePath = clientCert?.pfxFilePath;
            if (!pfxFilePath) {
              throw new Error('pfxFilePath is required for pfx type');
            }
            pfxFilePath = path.isAbsolute(pfxFilePath) ? pfxFilePath : path.join(collectionPath, pfxFilePath);
            certsConfig.pfx = fs.readFileSync(pfxFilePath);
          } catch (err: any) {
            console.error('Error reading pfx file', err);
            throw new Error(`Error reading pfx file: ${err.message}`);
          }
        }
        certsConfig.passphrase = clientCert.passphrase;
        break;
      }
    }
  }

  /**
   * Proxy configuration
   *
   * Preferences proxyMode has three possible values: on, off, system
   * Collection proxyMode has three possible values: true, false, global
   *
   * When collection proxyMode is true, it overrides the app-level proxy settings
   * When collection proxyMode is false, it ignores the app-level proxy settings
   * When collection proxyMode is global, it uses the app-level proxy settings
   *
   * Below logic calculates the proxyMode and proxyConfig to be used for the request
   */
  let proxyMode: ProxyMode = 'off';
  let proxyConfig: ProxyConfig = {};

  const collectionProxyConfig = transformProxyConfig(collectionLevelProxy || {}) as ProxyConfig;
  const collectionProxyDisabled = get(collectionProxyConfig, 'disabled', false);
  const collectionProxyInherit = get(collectionProxyConfig, 'inherit', true);
  const collectionProxyConfigData = get(collectionProxyConfig, 'config', {});

  if (options.noproxy || collectionProxyDisabled) {
    // If noproxy flag is set or collection proxy is disabled, don't use any proxy
    proxyMode = 'off';
  } else if (!collectionProxyDisabled && !collectionProxyInherit) {
    // Use collection-specific proxy
    proxyConfig = collectionProxyConfigData;
    proxyMode = 'on';
  } else if (!collectionProxyDisabled && collectionProxyInherit) {
    // Inherit from system proxy
    const { http_proxy, https_proxy } = systemProxyConfig || {};
    if (http_proxy?.length || https_proxy?.length) {
      proxyMode = 'system';
    }
    // else: no system proxy available, proxyMode stays 'off'
  }
  // else: collection proxy is disabled, proxyMode stays 'off'

  return { proxyMode, proxyConfig, certsConfig };
};

function createAgents({
  requestUrl,
  proxyMode,
  proxyConfig,
  systemProxyConfig,
  certsConfig,
  httpsAgentRequestFields
}: CreateAgentsParams): AgentResult {
  // Ensure TLS options are properly set
  const tlsOptions: TlsOptions = {
    ...httpsAgentRequestFields,
    ...certsConfig,
    // Enable all secure protocols by default
    secureProtocol: undefined,
    // Allow Node.js to choose the protocol
    minVersion: 'TLSv1',
    rejectUnauthorized: httpsAgentRequestFields.rejectUnauthorized !== undefined ? httpsAgentRequestFields.rejectUnauthorized : true
  };

  let httpAgent: HttpAgent | undefined;
  let httpsAgent: HttpsAgent | HttpsProxyAgent<any> | SocksProxyAgent | undefined;

  if (proxyMode === 'on') {
    const shouldProxy = shouldUseProxy(requestUrl, get(proxyConfig, 'bypassProxy', ''));
    if (shouldProxy) {
      const proxyProtocol = get(proxyConfig, 'protocol');
      const proxyHostname = get(proxyConfig, 'hostname');
      const proxyPort = get(proxyConfig, 'port');
      const proxyAuthEnabled = get(proxyConfig, 'auth.enabled', false);
      const socksEnabled = proxyProtocol && proxyProtocol.includes('socks');

      if (!proxyProtocol || !proxyHostname) {
        throw new Error('Proxy protocol and hostname are required when proxy is enabled');
      }

      const uriPort = isUndefined(proxyPort) || isNull(proxyPort) ? '' : `:${proxyPort}`;
      let proxyUri: string;
      if (proxyAuthEnabled) {
        const proxyAuthUsername = encodeURIComponent(get(proxyConfig, 'auth.username', ''));
        const proxyAuthPassword = encodeURIComponent(get(proxyConfig, 'auth.password', ''));
        proxyUri = `${proxyProtocol}://${proxyAuthUsername}:${proxyAuthPassword}@${proxyHostname}${uriPort}`;
      } else {
        proxyUri = `${proxyProtocol}://${proxyHostname}${uriPort}`;
      }

      if (socksEnabled) {
        httpAgent = new SocksProxyAgent(proxyUri);
        httpsAgent = new SocksProxyAgent(proxyUri, tlsOptions as any);
      } else {
        httpAgent = new HttpProxyAgent(proxyUri);
        httpsAgent = new PatchedHttpsProxyAgent(proxyUri, tlsOptions);
      }
    } else {
      // If proxy should not be used, set default HTTPS agent
      httpsAgent = new https.Agent(tlsOptions as any);
    }
  } else if (proxyMode === 'system') {
    const http_proxy = get(systemProxyConfig, 'http_proxy');
    const https_proxy = get(systemProxyConfig, 'https_proxy');
    const no_proxy = get(systemProxyConfig, 'no_proxy');
    const shouldUseSystemProxy = shouldUseProxy(requestUrl, no_proxy || '');
    if (shouldUseSystemProxy) {
      try {
        if (http_proxy?.length) {
          new URL(http_proxy);
          httpAgent = new HttpProxyAgent(http_proxy);
        }
      } catch (error) {
        throw new Error('Invalid system http_proxy');
      }
      try {
        if (https_proxy?.length) {
          new URL(https_proxy);
          httpsAgent = new PatchedHttpsProxyAgent(https_proxy, tlsOptions as any);
        } else {
          httpsAgent = new https.Agent(tlsOptions as any);
        }
      } catch (error) {
        throw new Error('Invalid system https_proxy');
      }
    } else {
      httpsAgent = new https.Agent(tlsOptions as any);
    }
  } else {
    httpsAgent = new https.Agent(tlsOptions as any);
  }

  return { httpAgent, httpsAgent };
}

const getHttpHttpsAgents = async ({
  requestUrl,
  collectionPath,
  clientCertificates,
  collectionLevelProxy,
  systemProxyConfig,
  options
}: GetHttpHttpsAgentsParams): Promise<AgentResult> => {
  const { proxyMode, proxyConfig, certsConfig } = getCertsAndProxyConfig({
    requestUrl,
    collectionPath,
    clientCertificates,
    collectionLevelProxy,
    systemProxyConfig,
    options
  });

  /**
   * @see https://github.com/usebruno/bruno/issues/211 set keepAlive to true, this should fix socket hang up errors
   * @see https://github.com/nodejs/node/pull/43522 keepAlive was changed to true globally on Node v19+
   */
  const httpsAgentRequestFields: HttpsAgentRequestFields = { keepAlive: true };
  if (!options.shouldVerifyTls) {
    httpsAgentRequestFields.rejectUnauthorized = false;
  }

  const { httpAgent, httpsAgent } = createAgents({
    requestUrl,
    proxyMode,
    proxyConfig,
    systemProxyConfig,
    certsConfig,
    httpsAgentRequestFields
  });

  return { httpAgent, httpsAgent };
};

export { getHttpHttpsAgents };
