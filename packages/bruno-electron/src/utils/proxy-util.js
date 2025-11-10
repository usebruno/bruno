const parseUrl = require('url').parse;
const https = require('node:https');
const http = require('node:http');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { interpolateString } = require('../ipc/network/interpolate-string');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');
const { isEmpty, get, isUndefined, isNull } = require('lodash');
const { getOrCreateHttpsAgent, getOrCreateHttpAgent } = require('@usebruno/requests');
const { preferencesUtil } = require('../store/preferences');
const { getPacResolver } = require('../../../bruno-common/src/net/pac-resolver');

const DEFAULT_PORTS = {
  ftp: 21,
  gopher: 70,
  http: 80,
  https: 443,
  ws: 80,
  wss: 443
};
/**
 * check for proxy bypass, copied form 'proxy-from-env'
 */
const shouldUseProxy = (url, proxyBypass) => {
  if (proxyBypass === '*') {
    return false; // Never proxy if wildcard is set.
  }

  // use proxy if no proxyBypass is set
  if (!proxyBypass || typeof proxyBypass !== 'string' || isEmpty(proxyBypass.trim())) {
    return true;
  }

  const parsedUrl = typeof url === 'string' ? parseUrl(url) : url || {};
  let proto = parsedUrl.protocol;
  let hostname = parsedUrl.host;
  let port = parsedUrl.port;
  if (typeof hostname !== 'string' || !hostname || typeof proto !== 'string') {
    return false; // Don't proxy URLs without a valid scheme or host.
  }

  proto = proto.split(':', 1)[0];
  // Stripping ports in this way instead of using parsedUrl.hostname to make
  // sure that the brackets around IPv6 addresses are kept.
  hostname = hostname.replace(/:\d*$/, '');
  port = parseInt(port) || DEFAULT_PORTS[proto] || 0;

  return proxyBypass.split(/[,;\s]/).every(function (dontProxyFor) {
    if (!dontProxyFor) {
      return true; // Skip zero-length hosts.
    }
    const parsedProxy = dontProxyFor.match(/^(.+):(\d+)$/);
    let parsedProxyHostname = parsedProxy ? parsedProxy[1] : dontProxyFor;
    const parsedProxyPort = parsedProxy ? parseInt(parsedProxy[2]) : 0;
    if (parsedProxyPort && parsedProxyPort !== port) {
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
 * Options that should be forwarded from the constructor to the target TLS upgrade.
 */
const TARGET_TLS_OPTIONS = ['cert', 'key', 'pfx', 'passphrase', 'rejectUnauthorized', 'secureContext'];

/**
 * Patched version of HttpsProxyAgent that correctly handles TLS options for
 * both the proxy connection and the target server connection.
 *
 * The upstream HttpsProxyAgent (https://github.com/TooTallNate/proxy-agents/issues/194)
 * ignores constructor options when upgrading the tunneled socket to TLS for the
 * target server. This patch forwards the relevant TLS options to the target upgrade.
 */
class PatchedHttpsProxyAgent extends HttpsProxyAgent {
  constructor(proxy, opts) {
    super(proxy, opts);
    this.constructorOpts = opts;
  }

  async connect(req, opts) {
    const targetOpts = { ...opts };

    if (this.constructorOpts) {
      for (const key of TARGET_TLS_OPTIONS) {
        if (key in this.constructorOpts) {
          targetOpts[key] = this.constructorOpts[key];
        }
      }
    }

    return super.connect(req, targetOpts);
  }
}

async function setupProxyAgents({
  requestConfig,
  proxyMode = 'off',
  proxyConfig,
  httpsAgentRequestFields,
  interpolationOptions,
  timeline
}) {
  // Clear stale agents so we always recreate them for the current URL
  // (handles protocol switches, host changes, and proxy-bypass rules on redirects).
  delete requestConfig.httpAgent;
  delete requestConfig.httpsAgent;

  const disableCache = !preferencesUtil.isSslSessionCachingEnabled();

  // Ensure TLS options are properly set
  const tlsOptions = {
    ...httpsAgentRequestFields,
    // Enable all secure protocols by default
    secureProtocol: undefined,
    // Allow Node.js to choose the protocol
    minVersion: 'TLSv1',
    rejectUnauthorized: httpsAgentRequestFields.rejectUnauthorized !== undefined ? httpsAgentRequestFields.rejectUnauthorized : true,
    // Enable keepAlive for connection reuse
    keepAlive: true
  };

  const parsedUrl = parseUrl(requestConfig.url);
  const isHttpsRequest = parsedUrl.protocol === 'https:';
  const hostname = parsedUrl.hostname || null;

  if (proxyMode === 'on') {
    const shouldProxy = shouldUseProxy(requestConfig.url, get(proxyConfig, 'bypassProxy', ''));
    if (shouldProxy) {
      const proxyProtocol = interpolateString(get(proxyConfig, 'protocol'), interpolationOptions);
      const proxyHostname = interpolateString(get(proxyConfig, 'hostname'), interpolationOptions);
      const proxyPort = interpolateString(get(proxyConfig, 'port'), interpolationOptions);
      const proxyAuthEnabled = !get(proxyConfig, 'auth.disabled', false);
      const socksEnabled = proxyProtocol.includes('socks');

      let uriPort = isUndefined(proxyPort) || isNull(proxyPort) ? '' : `:${proxyPort}`;
      let proxyUri;
      if (proxyAuthEnabled) {
        const proxyAuthUsername = encodeURIComponent(interpolateString(get(proxyConfig, 'auth.username'), interpolationOptions));
        const proxyAuthPassword = encodeURIComponent(interpolateString(get(proxyConfig, 'auth.password'), interpolationOptions));
        proxyUri = `${proxyProtocol}://${proxyAuthUsername}:${proxyAuthPassword}@${proxyHostname}${uriPort}`;
      } else {
        proxyUri = `${proxyProtocol}://${proxyHostname}${uriPort}`;
      }

      if (timeline) {
        timeline.push({
          timestamp: new Date(),
          type: 'info',
          message: `Using proxy: ${proxyProtocol}://${proxyHostname}${uriPort}`
        });
      }

      // When the proxy itself uses HTTPS, the agent connecting to it needs TLS options
      // (e.g., ca certs) even for plain HTTP requests
      const isHttpsProxy = proxyProtocol === 'https';
      const httpProxyAgentOptions = isHttpsProxy ? { keepAlive: true, ...tlsOptions } : { keepAlive: true };

      // Only set the agent needed for the request protocol
      if (socksEnabled) {
        if (isHttpsRequest) {
          requestConfig.httpsAgent = getOrCreateHttpsAgent({ AgentClass: SocksProxyAgent, options: tlsOptions, proxyUri, timeline, disableCache, hostname });
        } else {
          requestConfig.httpAgent = getOrCreateHttpAgent({ AgentClass: SocksProxyAgent, options: httpProxyAgentOptions, proxyUri, timeline, disableCache, hostname });
        }
      } else {
        if (isHttpsRequest) {
          requestConfig.httpsAgent = getOrCreateHttpsAgent({ AgentClass: PatchedHttpsProxyAgent, options: tlsOptions, proxyUri, timeline, disableCache, hostname });
        } else {
          requestConfig.httpAgent = getOrCreateHttpAgent({ AgentClass: HttpProxyAgent, options: httpProxyAgentOptions, proxyUri, timeline, disableCache, hostname });
        }
      }
    }
  } else if (proxyMode === 'system') {
    const { http_proxy, https_proxy, no_proxy } = proxyConfig || {};
    const shouldUseSystemProxy = shouldUseProxy(requestConfig.url, no_proxy || '');
    if (shouldUseSystemProxy) {
      try {
        if (http_proxy?.length && !isHttpsRequest) {
          const parsedHttpProxy = new URL(http_proxy);
          const isHttpsSystemProxy = parsedHttpProxy.protocol === 'https:';
          const systemHttpProxyAgentOptions = isHttpsSystemProxy ? { keepAlive: true, ...tlsOptions } : { keepAlive: true };
          if (timeline) {
            timeline.push({
              timestamp: new Date(),
              type: 'info',
              message: `Using system proxy: ${http_proxy}`
            });
          }
          requestConfig.httpAgent = getOrCreateHttpAgent({ AgentClass: HttpProxyAgent, options: systemHttpProxyAgentOptions, proxyUri: http_proxy, timeline, disableCache, hostname });
        }
      } catch (error) {
        throw new Error(`Invalid system http_proxy "${http_proxy}": ${error.message}`);
      }
      try {
        if (https_proxy?.length && isHttpsRequest) {
          new URL(https_proxy);
          if (timeline) {
            timeline.push({
              timestamp: new Date(),
              type: 'info',
              message: `Using system proxy: ${https_proxy}`
            });
          }
          requestConfig.httpsAgent = getOrCreateHttpsAgent({ AgentClass: PatchedHttpsProxyAgent, options: tlsOptions, proxyUri: https_proxy, timeline, disableCache, hostname });
        }
      } catch (error) {
        throw new Error(`Invalid system https_proxy "${https_proxy}": ${error.message}`);
      }
    }
  } else if (proxyMode === 'pac') {
    const pacUrl = get(proxyConfig, 'pacUrl');
    if (pacUrl) {
      try {
        const resolver = await getPacResolver({ pacUrl });
        const directives = await resolver.resolve(requestConfig.url);
        if (directives && directives.length) {
          const first = directives[0];
          timeline.push({ timestamp: new Date(), type: 'info', message: `PAC directives: ${directives.join('; ')}` });
          if (/^(PROXY|HTTP)\s+/i.test(first)) {
            const hostPort = first.split(/\s+/)[1];
            const proxyUri = `http://${hostPort}`;
            requestConfig.httpAgent = getOrCreateHttpAgent({ AgentClass: HttpProxyAgent, options: { keepAlive: true }, proxyUri, timeline, disableCache, hostname });
            requestConfig.httpsAgent = getOrCreateHttpsAgent({ AgentClass: PatchedHttpsProxyAgent, options: tlsOptions, proxyUri, timeline, disableCache, hostname });
          } else if (/^SOCKS/i.test(first)) {
            const hostPort = first.split(/\s+/)[1];
            const proxyUri = `socks5://${hostPort}`;
            requestConfig.httpAgent = getOrCreateHttpAgent({ AgentClass: SocksProxyAgent, options: { keepAlive: true }, proxyUri, timeline, disableCache, hostname });
            requestConfig.httpsAgent = getOrCreateHttpsAgent({ AgentClass: SocksProxyAgent, options: tlsOptions, proxyUri, timeline, disableCache, hostname });
          }
        }
      } catch (err) {
        timeline.push({ timestamp: new Date(), type: 'error', message: `PAC resolution failed: ${err.message}` });
      }
    }
  }

  if (!requestConfig.httpAgent && !requestConfig.httpsAgent) {
    if (isHttpsRequest) {
      requestConfig.httpsAgent = getOrCreateHttpsAgent({ AgentClass: https.Agent, options: tlsOptions, proxyUri: null, timeline, disableCache, hostname });
    } else {
      requestConfig.httpAgent = getOrCreateHttpAgent({ AgentClass: http.Agent, options: { keepAlive: true }, proxyUri: null, timeline, disableCache, hostname });
    }
  }
}

module.exports = {
  shouldUseProxy,
  PatchedHttpsProxyAgent,
  setupProxyAgents
};
