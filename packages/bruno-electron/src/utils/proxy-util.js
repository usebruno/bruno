const parseUrl = require('url').parse;
const https = require('node:https');
const http = require('node:http');
const { interpolateString } = require('../ipc/network/interpolate-string');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');
const { get, isUndefined, isNull } = require('lodash');
const {
  getOrCreateHttpsAgent,
  getOrCreateHttpAgent,
  resolveAgentsFromPac,
  PatchedHttpsProxyAgent,
  shouldUseProxy
} = require('@usebruno/requests');
const { preferencesUtil } = require('../store/preferences');

async function setupProxyAgents({
  requestConfig,
  proxyMode = 'off',
  proxyModeReason = '',
  proxyConfig,
  httpsAgentRequestFields,
  interpolationOptions,
  timeline
}) {
  if (timeline) {
    let modeMsg = `Proxy mode: ${proxyMode}`;
    if (proxyMode === 'pac') modeMsg += ` | PAC URL: ${get(proxyConfig, 'pac.source') || '(empty)'}`;
    else if (proxyMode === 'on') modeMsg += ` | ${get(proxyConfig, 'protocol')}://${get(proxyConfig, 'hostname')}:${get(proxyConfig, 'port')}`;
    else if (proxyMode === 'off' && proxyModeReason) modeMsg += ` (${proxyModeReason})`;
    timeline.push({ timestamp: new Date(), type: 'info', message: modeMsg });
  }

  // Clear stale agents so we always recreate them for the current URL
  // (handles protocol switches, host changes, and proxy-bypass rules on redirects).
  delete requestConfig.httpAgent;
  delete requestConfig.httpsAgent;

  const disableCache = !preferencesUtil.isSslSessionCachingEnabled();

  // keepAlive defaults to true; pass false to omit Connection.
  const keepAlive = httpsAgentRequestFields?.keepAlive !== false;

  // Ensure TLS options are properly set
  const tlsOptions = {
    ...httpsAgentRequestFields,
    // Enable all secure protocols by default
    secureProtocol: undefined,
    // Allow Node.js to choose the protocol
    minVersion: 'TLSv1',
    rejectUnauthorized: httpsAgentRequestFields.rejectUnauthorized !== undefined ? httpsAgentRequestFields.rejectUnauthorized : true,
    keepAlive
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

      // When the proxy itself uses HTTPS, the agent connecting to it needs TLS options
      // (e.g., ca certs) even for plain HTTP requests
      const isHttpsProxy = proxyProtocol === 'https';
      const httpProxyAgentOptions = isHttpsProxy ? { keepAlive, ...tlsOptions } : { keepAlive };

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
    const { http_proxy, https_proxy, no_proxy, pac_url } = proxyConfig || {};

    // If the OS is configured with a PAC URL, resolve it using the existing PAC infrastructure
    if (pac_url) {
      if (timeline) timeline.push({ timestamp: new Date(), type: 'info', message: `Resolving system PAC: ${pac_url}` });
      try {
        const { directives, httpAgent, httpsAgent } = await resolveAgentsFromPac({ pacSource: pac_url, requestUrl: requestConfig.url, requestProtocol: isHttpsRequest ? 'https' : 'http', tlsOptions, httpsAgentRequestFields, timeline, disableCache, hostname });
        if (httpAgent) requestConfig.httpAgent = httpAgent;
        if (httpsAgent) requestConfig.httpsAgent = httpsAgent;
        if (directives) {
          if (timeline) { timeline.push({ timestamp: new Date(), type: 'info', message: `PAC directives: ${directives.join('; ')}` }); }
        } else {
          if (timeline) { timeline.push({ timestamp: new Date(), type: 'info', message: 'System PAC resolved: DIRECT (no proxy)' }); }
        }
      } catch (err) {
        if (timeline) { timeline.push({ timestamp: new Date(), type: 'error', message: `System PAC resolution failed: ${err.message}` }); }
      }
    } else {
      const shouldUseSystemProxy = shouldUseProxy(requestConfig.url, no_proxy || '');
      if (shouldUseSystemProxy) {
        try {
          if (http_proxy?.length && !isHttpsRequest) {
            const parsedHttpProxy = new URL(http_proxy);
            const isHttpsSystemProxy = parsedHttpProxy.protocol === 'https:';
            const systemHttpProxyAgentOptions = isHttpsSystemProxy ? { keepAlive, ...tlsOptions } : { keepAlive };
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
    }
  } else if (proxyMode === 'pac') {
    const pacSource = get(proxyConfig, 'pac.source');
    if (pacSource) {
      if (timeline) timeline.push({ timestamp: new Date(), type: 'info', message: `Resolving PAC: ${pacSource}` });
      try {
        const { directives, httpAgent, httpsAgent } = await resolveAgentsFromPac({ pacSource, requestUrl: requestConfig.url, requestProtocol: isHttpsRequest ? 'https' : 'http', tlsOptions, httpsAgentRequestFields, timeline, disableCache, hostname });
        if (httpAgent) requestConfig.httpAgent = httpAgent;
        if (httpsAgent) requestConfig.httpsAgent = httpsAgent;
        if (directives) {
          if (timeline) timeline.push({ timestamp: new Date(), type: 'info', message: `PAC directives: ${directives.join('; ')}` });
        } else {
          if (timeline) timeline.push({ timestamp: new Date(), type: 'info', message: 'PAC resolved: DIRECT (no proxy)' });
        }
      } catch (err) {
        if (timeline) timeline.push({ timestamp: new Date(), type: 'error', message: `PAC resolution failed: ${err.message}` });
      }
    }
  }

  if (!requestConfig.httpAgent && !requestConfig.httpsAgent) {
    if (isHttpsRequest) {
      requestConfig.httpsAgent = getOrCreateHttpsAgent({ AgentClass: https.Agent, options: tlsOptions, proxyUri: null, timeline, disableCache, hostname });
    } else {
      requestConfig.httpAgent = getOrCreateHttpAgent({ AgentClass: http.Agent, options: { keepAlive }, proxyUri: null, timeline, disableCache, hostname });
    }
  }
}

module.exports = {
  shouldUseProxy,
  PatchedHttpsProxyAgent,
  setupProxyAgents
};
