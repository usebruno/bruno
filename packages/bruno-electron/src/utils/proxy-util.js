const parseUrl = require('url').parse;
const https = require('https');
const { isEmpty, get, isUndefined, isNull } = require('lodash');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { interpolateString } = require('../ipc/network/interpolate-string');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');
const { preferencesUtil } = require('../store/preferences');

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
 * Patched version of HttpsProxyAgent to get around a bug that ignores options
 * such as ca and rejectUnauthorized when upgrading the proxied socket to TLS:
 * https://github.com/TooTallNate/proxy-agents/issues/194
 */
class PatchedHttpsProxyAgent extends HttpsProxyAgent {
  constructor(proxy, opts) {
    super(proxy, opts);
    this.constructorOpts = opts;
  }

  async connect(req, opts) {
    const combinedOpts = { ...this.constructorOpts, ...opts };
    return super.connect(req, combinedOpts);
  }
}

function setupProxyAgents({
  requestConfig,
  proxyMode,
  proxyConfig,
  httpsAgentRequestFields,
  interpolationOptions
}) {
  if (proxyMode === 'on') {
    const shouldProxy = shouldUseProxy(requestConfig.url, get(proxyConfig, 'bypassProxy', ''));
    if (shouldProxy) {
      const proxyProtocol = interpolateString(get(proxyConfig, 'protocol'), interpolationOptions);
      const proxyHostname = interpolateString(get(proxyConfig, 'hostname'), interpolationOptions);
      const proxyPort = interpolateString(get(proxyConfig, 'port'), interpolationOptions);
      const proxyAuthEnabled = get(proxyConfig, 'auth.enabled', false);
      const socksEnabled = proxyProtocol.includes('socks');

      let uriPort = isUndefined(proxyPort) || isNull(proxyPort) ? '' : `:${proxyPort}`;
      let proxyUri;
      if (proxyAuthEnabled) {
        const proxyAuthUsername = interpolateString(get(proxyConfig, 'auth.username'), interpolationOptions);
        const proxyAuthPassword = interpolateString(get(proxyConfig, 'auth.password'), interpolationOptions);
        proxyUri = `${proxyProtocol}://${proxyAuthUsername}:${proxyAuthPassword}@${proxyHostname}${uriPort}`;
      } else {
        proxyUri = `${proxyProtocol}://${proxyHostname}${uriPort}`;
      }

      if (socksEnabled) {
        requestConfig.httpAgent = new SocksProxyAgent(proxyUri);
        requestConfig.httpsAgent = new SocksProxyAgent(proxyUri, httpsAgentRequestFields);
      } else {
        requestConfig.httpAgent = new HttpProxyAgent(proxyUri);
        requestConfig.httpsAgent = new PatchedHttpsProxyAgent(
          proxyUri,
          Object.keys(httpsAgentRequestFields).length > 0 ? { ...httpsAgentRequestFields } : undefined
        );
      }
    } else {
      // If proxy should not be used, set default HTTPS agent
      requestConfig.httpsAgent = new https.Agent(httpsAgentRequestFields);
    }
  } else if (proxyMode === 'system') {
    const { http_proxy, https_proxy, no_proxy } = preferencesUtil.getSystemProxyEnvVariables();
    const shouldUseSystemProxy = shouldUseProxy(url, no_proxy || '');
    if (shouldUseSystemProxy) {
      try {
        if (http_proxy?.length) {
          new URL(http_proxy);
          requestConfig.httpAgent = new HttpProxyAgent(http_proxy);
        }
      } catch (error) {
        throw new Error('Invalid system http_proxy');
      }
      try {
        if (https_proxy?.length) {
          new URL(https_proxy);
          requestConfig.httpsAgent = new PatchedHttpsProxyAgent(
            https_proxy,
            Object.keys(httpsAgentRequestFields).length > 0 ? { ...httpsAgentRequestFields } : undefined
          );
        }
      } catch (error) {
        throw new Error('Invalid system https_proxy');
      }
    } else {
      requestConfig.httpsAgent = new https.Agent(httpsAgentRequestFields);
    }
  } else if (Object.keys(httpsAgentRequestFields).length > 0) {
    requestConfig.httpsAgent = new https.Agent(httpsAgentRequestFields);
  }
}

module.exports = {
  shouldUseProxy,
  PatchedHttpsProxyAgent,
  setupProxyAgents
};
