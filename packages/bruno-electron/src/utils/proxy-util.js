const parseUrl = require('url').parse;
const https = require('node:https');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { interpolateString } = require('../ipc/network/interpolate-string');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');
const { isEmpty, get, isUndefined, isNull } = require('lodash');

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

function createTimelineHttpAgentClass(BaseAgentClass) {
  return class extends BaseAgentClass {
    constructor(options, timeline) {
      // For proxy agents, the first argument is the proxy URI and the second is options
      const { proxy: proxyUri, httpProxyAgentOptions } = options || {};

      if (!proxyUri) {
        throw new Error('TimelineHttpProxyAgent requires options.proxy to be set');
      }

      super(proxyUri, httpProxyAgentOptions);

      this.timeline = Array.isArray(timeline) ? timeline : [];
      // Log the proxy details
      this.timeline.push({
        timestamp: new Date(),
        type: 'info',
        message: `Using proxy: ${proxyUri}`
      });
    }
  };
}

function createTimelineAgentClass(BaseAgentClass) {
  return class extends BaseAgentClass {
    constructor(options, timeline) {
      let caCertificatesCount = options.caCertificatesCount || {};
      delete options.caCertificatesCount;

      // For proxy agents, the first argument is the proxy URI and the second is options
      if (options?.proxy) {
        const { proxy: proxyUri, ...agentOptions } = options;
        // Ensure TLS options are properly set
        const tlsOptions = {
          ...agentOptions,
          rejectUnauthorized: agentOptions.rejectUnauthorized ?? true
        };
        super(proxyUri, tlsOptions);
        this.timeline = Array.isArray(timeline) ? timeline : [];
        this.alpnProtocols = tlsOptions.ALPNProtocols || ['h2', 'http/1.1'];
        this.caProvided = !!tlsOptions.ca;

        // Log TLS verification status
        this.timeline.push({
          timestamp: new Date(),
          type: 'info',
          message: `SSL validation: ${tlsOptions.rejectUnauthorized ? 'enabled' : 'disabled'}`
        });

        // Log the proxy details
        this.timeline.push({
          timestamp: new Date(),
          type: 'info',
          message: `Using proxy: ${proxyUri}`
        });
      } else {
        // This is a regular HTTPS agent case
        const tlsOptions = {
          ...options,
          rejectUnauthorized: options.rejectUnauthorized ?? true
        };
        super(tlsOptions);
        this.timeline = Array.isArray(timeline) ? timeline : [];
        this.alpnProtocols = options.ALPNProtocols || ['h2', 'http/1.1'];
        this.caProvided = !!options.ca;

        // Log TLS verification status
        this.timeline.push({
          timestamp: new Date(),
          type: 'info',
          message: `SSL validation: ${tlsOptions.rejectUnauthorized ? 'enabled' : 'disabled'}`
        });
      }

      this.caCertificatesCount = caCertificatesCount;
    }

    createConnection(options, callback) {
      const { host, port } = options;

      // Log ALPN protocols offered
      if (this.alpnProtocols && this.alpnProtocols.length > 0) {
        this.timeline.push({
          timestamp: new Date(),
          type: 'tls',
          message: `ALPN: offers ${this.alpnProtocols.join(', ')}`
        });
      }

      const rootCerts = this.caCertificatesCount.root || 0;
      const systemCerts = this.caCertificatesCount.system || 0;
      const extraCerts = this.caCertificatesCount.extra || 0;
      const customCerts = this.caCertificatesCount.custom || 0;

      this.timeline.push({
        timestamp: new Date(),
        type: 'tls',
        message: `CA Certificates: ${rootCerts} root, ${systemCerts} system, ${extraCerts} extra, ${customCerts} custom`
      });

      // Log "Trying host:port..."
      this.timeline.push({
        timestamp: new Date(),
        type: 'info',
        message: `Trying ${host}:${port}...`
      });

      let socket;
      try {
        socket = super.createConnection(options, callback);
      } catch (error) {
        this.timeline.push({
          timestamp: new Date(),
          type: 'error',
          message: `Error creating connection: ${error.message}`
        });
        error.timeline = this.timeline;
        throw error;
      }

      // Attach event listeners to the socket
      socket?.on('lookup', (err, address, family, host) => {
        if (err) {
          this.timeline.push({
            timestamp: new Date(),
            type: 'error',
            message: `DNS lookup error for ${host}: ${err.message}`
          });
        } else {
          this.timeline.push({
            timestamp: new Date(),
            type: 'info',
            message: `DNS lookup: ${host} -> ${address}`
          });
        }
      });

      socket?.on('connect', () => {
        const address = socket.remoteAddress || host;
        const remotePort = socket.remotePort || port;

        this.timeline.push({
          timestamp: new Date(),
          type: 'info',
          message: `Connected to ${host} (${address}) port ${remotePort}`
        });
      });

      socket?.on('secureConnect', () => {
        const protocol = socket.getProtocol() || 'SSL/TLS';
        const cipher = socket.getCipher();
        const cipherSuite = cipher ? `${cipher.name} (${cipher.version})` : 'Unknown cipher';

        this.timeline.push({
          timestamp: new Date(),
          type: 'tls',
          message: `SSL connection using ${protocol} / ${cipherSuite}`
        });

        // ALPN protocol
        const alpnProtocol = socket.alpnProtocol || 'None';
        this.timeline.push({
          timestamp: new Date(),
          type: 'tls',
          message: `ALPN: server accepted ${alpnProtocol}`
        });

        // Server certificate
        const cert = socket.getPeerCertificate(true);
        if (cert) {
          this.timeline.push({
            timestamp: new Date(),
            type: 'tls',
            message: `Server certificate:`
          });
          if (cert.subject) {
            this.timeline.push({
              timestamp: new Date(),
              type: 'tls',
              message: ` subject: ${Object.entries(cert.subject).map(([k, v]) => `${k}=${v}`).join(', ')}`
            });
          }
          if (cert.valid_from) {
            this.timeline.push({
              timestamp: new Date(),
              type: 'tls',
              message: ` start date: ${cert.valid_from}`
            });
          }
          if (cert.valid_to) {
            this.timeline.push({
              timestamp: new Date(),
              type: 'tls',
              message: ` expire date: ${cert.valid_to}`
            });
          }
          if (cert.subjectaltname) {
            this.timeline.push({
              timestamp: new Date(),
              type: 'tls',
              message: ` subjectAltName: ${cert.subjectaltname}`
            });
          }
          if (cert.issuer) {
            this.timeline.push({
              timestamp: new Date(),
              type: 'tls',
              message: ` issuer: ${Object.entries(cert.issuer).map(([k, v]) => `${k}=${v}`).join(', ')}`
            });
          }

          // SSL certificate verify ok
          this.timeline.push({
            timestamp: new Date(),
            type: 'tls',
            message: `SSL certificate verify ok.`
          });
        }
      });

      socket?.on('error', (err) => {
        this.timeline.push({
          timestamp: new Date(),
          type: 'error',
          message: `Socket error: ${err.message}`
        });
      });

      return socket;
    }
  };
}

function setupProxyAgents({
  requestConfig,
  proxyMode = 'off',
  proxyConfig,
  httpsAgentRequestFields,
  interpolationOptions,
  timeline
}) {
  // Ensure TLS options are properly set
  const tlsOptions = {
    ...httpsAgentRequestFields,
    // Enable all secure protocols by default
    secureProtocol: undefined,
    // Allow Node.js to choose the protocol
    minVersion: 'TLSv1',
    rejectUnauthorized: httpsAgentRequestFields.rejectUnauthorized !== undefined ? httpsAgentRequestFields.rejectUnauthorized : true
  };

  const httpProxyAgentOptions = {
    keepAlive: true
  };

  if (proxyMode === 'on') {
    const shouldProxy = shouldUseProxy(requestConfig.url, get(proxyConfig, 'bypassProxy', ''));
    if (shouldProxy) {
      const proxyProtocol = interpolateString(get(proxyConfig, 'protocol'), interpolationOptions);
      const proxyHostname = interpolateString(get(proxyConfig, 'hostname'), interpolationOptions);
      const proxyPort = interpolateString(get(proxyConfig, 'port'), interpolationOptions);
      const proxyAuthDisabled = get(proxyConfig, 'auth.disabled', false);
      const proxyAuthEnabled = !proxyAuthDisabled;
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

      if (socksEnabled) {
        const TimelineSocksProxyAgent = createTimelineAgentClass(SocksProxyAgent);
        requestConfig.httpAgent = new TimelineSocksProxyAgent({ proxy: proxyUri }, timeline);
        requestConfig.httpsAgent = new TimelineSocksProxyAgent({ proxy: proxyUri, ...tlsOptions }, timeline);
      } else {
        const TimelineHttpProxyAgent = createTimelineHttpAgentClass(HttpProxyAgent);
        const TimelineHttpsProxyAgent = createTimelineAgentClass(PatchedHttpsProxyAgent);
        requestConfig.httpAgent = new TimelineHttpProxyAgent({ proxy: proxyUri, httpProxyAgentOptions }, timeline);
        requestConfig.httpsAgent = new TimelineHttpsProxyAgent(
          { proxy: proxyUri, ...tlsOptions },
          timeline
        );
      }
    } else {
      // If proxy should not be used, set default HTTPS agent
      const TimelineHttpsAgent = createTimelineAgentClass(https.Agent);
      requestConfig.httpsAgent = new TimelineHttpsAgent(tlsOptions, timeline);
    }
  } else if (proxyMode === 'system') {
    const { http_proxy, https_proxy, no_proxy } = proxyConfig || {};
    const shouldUseSystemProxy = shouldUseProxy(requestConfig.url, no_proxy || '');
    const parsedUrl = parseUrl(requestConfig.url);
    const isHttpsRequest = parsedUrl.protocol === 'https:';
    if (shouldUseSystemProxy) {
      try {
        if (http_proxy?.length && !isHttpsRequest) {
          new URL(http_proxy);
          const TimelineHttpProxyAgent = createTimelineHttpAgentClass(HttpProxyAgent);
          requestConfig.httpAgent = new TimelineHttpProxyAgent({ proxy: http_proxy, httpProxyAgentOptions }, timeline);
        }
      } catch (error) {
        throw new Error(`Invalid system http_proxy "${http_proxy}": ${error.message}`);
      }
      try {
        if (https_proxy?.length && isHttpsRequest) {
          new URL(https_proxy);
          const TimelineHttpsProxyAgent = createTimelineAgentClass(PatchedHttpsProxyAgent);
          requestConfig.httpsAgent = new TimelineHttpsProxyAgent(
            { proxy: https_proxy, ...tlsOptions },
            timeline
          );
        } else {
          const TimelineHttpsAgent = createTimelineAgentClass(https.Agent);
          requestConfig.httpsAgent = new TimelineHttpsAgent(tlsOptions, timeline);
        }
      } catch (error) {
        throw new Error(`Invalid system https_proxy "${https_proxy}": ${error.message}`);
      }
    } else {
      const TimelineHttpsAgent = createTimelineAgentClass(https.Agent);
      requestConfig.httpsAgent = new TimelineHttpsAgent(tlsOptions, timeline);
    }
  } else {
    const TimelineHttpsAgent = createTimelineAgentClass(https.Agent);
    requestConfig.httpsAgent = new TimelineHttpsAgent(tlsOptions, timeline);
  }
}

module.exports = {
  shouldUseProxy,
  PatchedHttpsProxyAgent,
  setupProxyAgents
};
