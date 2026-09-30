const URL = require('url');
const { STATUS_CODES } = require('http');
const Socket = require('net').Socket;
const axios = require('axios');
const connectionCache = new Map(); // Cache to store checkConnection() results
const electronApp = require('electron');
const { setupProxyAgents } = require('../../utils/proxy-util');
const { addCookieToJar, getCookieStringForUrl } = require('../../utils/cookies');
const { preferencesUtil } = require('../../store/preferences');
const { safeStringifyJSON } = require('../../utils/common');
const { createFormData } = require('../../utils/form-data');
const { getSentHeaders, applyOmitConnectionToAxiosConfig, handleNtlmRedirect } = require('@usebruno/requests');
const { buildHttp2Options, describeHttp2Stream, stripConnectionHeaders, installHttp2NativePatch, applyBasicAuthHeader, resolveProxiedHttpVersion } = require('./http2-native');
const { resolveHttpVersion } = require('./http2-resolver');
const { proxyKeyFor } = require('./http2-proxy');
const { isSameOrigin, DEFAULT_MAX_REDIRECTS } = require('@usebruno/common').utils;
const { applyOmitHeaders } = require('@usebruno/common');

const LOCAL_IPV6 = '::1';
const LOCAL_IPV4 = '127.0.0.1';
const LOCALHOST = 'localhost';
const version = electronApp?.app?.getVersion() ?? '';
const redirectResponseCodes = [301, 302, 303, 307, 308];

const saveCookies = (url, headers) => {
  if (preferencesUtil.shouldStoreCookies()) {
    let setCookieHeaders = [];
    if (headers['set-cookie']) {
      setCookieHeaders = Array.isArray(headers['set-cookie'])
        ? headers['set-cookie']
        : [headers['set-cookie']];
      for (const setCookieHeader of setCookieHeaders) {
        if (typeof setCookieHeader === 'string' && setCookieHeader.length) {
          addCookieToJar(setCookieHeader, url);
        }
      }
    }
  }
};

const getTld = (hostname) => {
  if (!hostname) {
    return '';
  }

  return hostname.substring(hostname.lastIndexOf('.') + 1);
};

const checkConnection = (host, port) =>
  new Promise((resolve) => {
    const key = `${host}:${port}`;
    const cachedResult = connectionCache.get(key);

    if (cachedResult !== undefined) {
      resolve(cachedResult);
    } else {
      const socket = new Socket();

      socket.once('connect', () => {
        socket.end();
        connectionCache.set(key, true); // Cache successful connection
        resolve(true);
      });

      socket.once('error', () => {
        connectionCache.set(key, false); // Cache failed connection
        resolve(false);
      });

      // Try to connect to the host and port
      socket.connect(port, host);
    }
  });

/**
 * Function that configures axios with timing interceptors
 * Important to note here that the timings are not completely accurate.
 * @see https://github.com/axios/axios/issues/695
 * @returns {axios.AxiosInstance}
 */

function makeAxiosInstance({
  proxyMode = 'off',
  proxyModeReason = '',
  proxyConfig = {},
  requestMaxRedirects = DEFAULT_MAX_REDIRECTS,
  httpsAgentRequestFields = {},
  interpolationOptions = {},
  followRedirects = true,
  forwardAuthorizationHeader = true
} = {}) {
  /** @type {axios.AxiosInstance} */
  const instance = axios.create({
    transformRequest: function (data, headers) {
      const contentType = headers?.['Content-Type'] || headers?.['content-type'] || '';
      const hasJSONContentType = contentType.includes('json');
      if (typeof data === 'string' && hasJSONContentType) {
        return data;
      }

      axios.defaults.transformRequest.forEach(function (tr) {
        data = tr.call(this, data, headers);
      }, this);
      return data;
    },
    proxy: false,
    maxRedirects: 0,
    headers: {}
  });

  // Extend common headers with User-Agent rather than replacing the object.
  // axios.create() preserves defaults.headers.common = { Accept: 'application/json, text/plain, */*' }.
  // Assigning a new object (= { 'User-Agent': ... }) would nuke that default, causing servers that
  // rely on content-negotiation to receive requests with no Accept header.
  instance.defaults.headers.common['User-Agent'] = `bruno-runtime/${version}`;
  instance.interceptors.request.use(async (config) => {
    const url = URL.parse(config.url);
    config.metadata = config.metadata || {};
    config.metadata.startTime = new Date().getTime();
    const timeline = config.metadata.timeline || [];
    // Add initial request details to the timeline
    timeline.push({
      timestamp: new Date(),
      type: 'separator'
    });
    timeline.push({
      timestamp: new Date(),
      type: 'info',
      message: `Preparing request to ${config.url}`
    });
    timeline.push({
      timestamp: new Date(),
      type: 'info',
      message: `Current time is ${new Date().toISOString()}`
    });

    // Add request method line
    timeline.push({
      timestamp: new Date(),
      type: 'request',
      message: `${config.method.toUpperCase()} ${config.url}`
    });

    // Add request data if available
    if (config.data) {
      const requestData = typeof config.data === 'string' ? config.data : JSON.stringify(config.data, null, 2);
      timeline.push({
        timestamp: new Date(),
        type: 'requestData',
        message: requestData
      });
    }

    // Resolve all *.localhost to localhost and check if it should use IPv6 or IPv4
    // RFC: 6761 section 6.3 (https://tools.ietf.org/html/rfc6761#section-6.3)
    // @see https://github.com/usebruno/bruno/issues/124
    if (url.hostname === LOCAL_IPV4) {
      config.lookup = (hostname, options, callback) => {
        callback(null, LOCAL_IPV4, 4);
      };
    } else if (url.hostname === LOCAL_IPV6) {
      config.lookup = (hostname, options, callback) => {
        callback(null, LOCAL_IPV6, 6);
      };
    } else if (getTld(url.hostname) === LOCALHOST || url.hostname === LOCALHOST) {
      // use custom DNS lookup for localhost
      config.lookup = (hostname, options, callback) => {
        const portNumber = Number(url.port) || (url.protocol.includes('https') ? 443 : 80);
        checkConnection(LOCAL_IPV6, portNumber).then((useIpv6) => {
          const ip = useIpv6 ? LOCAL_IPV6 : LOCAL_IPV4;
          callback(null, ip, useIpv6 ? 6 : 4);
        });
      };
    } else {
      delete config.lookup;
    }

    // Omit listed defaults and script-deleted headers. set(null) so Axios
    // does not put User-Agent / Accept-Encoding back.
    const { omitConnection } = applyOmitHeaders(config.headers, {
      omitHeaders: config.settings?.omitHeaders,
      headersToDelete: config.__headersToDelete,
      explicitHeaderNames: config.__explicitHeaderNames
    });
    delete config.__headersToDelete;

    const agentOptions = {
      ...httpsAgentRequestFields,
      keepAlive: !omitConnection
    };

    try {
      // Now call setupProxyAgents and pass the timeline (async - may perform PAC resolution)
      await setupProxyAgents({
        requestConfig: config,
        proxyMode,
        proxyModeReason,
        proxyConfig,
        httpsAgentRequestFields: agentOptions,
        interpolationOptions,
        timeline
      });
    } catch (err) {
      timeline.push({
        timestamp: new Date(),
        type: 'error',
        message: `Error setting up proxy agents: ${err?.message}`
      });
    }

    // POC evaluation: axios built-in HTTP/2, chosen in Preferences > General > Requests > HTTP version
    // ('http1' default, 'http2' forces h2, 'auto' probes ALPN per origin and falls back; see http2-resolver.js).
    // http2-native.js patches http2.connect so session errors are caught and CAs / client certs / lookup are honoured.
    const httpVersionMode = preferencesUtil.getHttpVersion();
    if (httpVersionMode === 'http2' || httpVersionMode === 'auto') {
      installHttp2NativePatch();
      const proxyKey = proxyKeyFor(config.httpsAgent);
      if (proxyKey) {
        timeline.push({
          timestamp: new Date(),
          type: 'info',
          message: `HTTP/2: request is proxied via ${proxyKey}`
        });
      }
      // Change 4: proxied https requests tunnel through Bruno's proxy agent (or reuse the session already on it);
      // direct requests keep the ALPN-probe resolver.
      const resolved = proxyKey && /^https:/i.test(config.url || '')
        ? await resolveProxiedHttpVersion({ config, mode: httpVersionMode, tlsOptions: agentOptions, proxyKey })
        : await resolveHttpVersion({
            url: config.url,
            mode: httpVersionMode,
            tlsOptions: agentOptions,
            lookup: config.lookup,
            proxyUri: proxyKey
          });
      timeline.push({
        timestamp: new Date(),
        type: 'info',
        message: `HTTP/${resolved.httpVersion === 2 ? '2' : '1.1'} selected (${resolved.reason})`
      });
      // The redirect loop reuses this config for the next hop, so an h1 decision must also undo an earlier h2 one.
      if (resolved.httpVersion !== 2) {
        delete config.httpVersion;
        delete config.http2Options;
      } else {
        config.httpVersion = 2;
        // Through a proxy the tunnel is already connected and DNS is the proxy's job: no lookup in the pool key.
        config.http2Options = buildHttp2Options(agentOptions, proxyKey ? undefined : config.lookup, proxyKey);
        if (applyBasicAuthHeader(config)) {
          timeline.push({
            timestamp: new Date(),
            type: 'info',
            message: 'HTTP/2: Authorization header built from auth option / URL credentials (axios drops these on h2)'
          });
        }
        const strippedHeaders = stripConnectionHeaders(config.headers);
        if (strippedHeaders.length) {
          timeline.push({
            timestamp: new Date(),
            type: 'info',
            message: `HTTP/2: removed connection-specific header(s) not allowed on h2: ${strippedHeaders.join(', ')}`
          });
        }
      }
    }

    // Node keep-alive agents add Connection; strip it on the ClientRequest.
    if (omitConnection) {
      applyOmitConnectionToAxiosConfig(config);
    }

    config.metadata.timeline = timeline;
    return config;
  });

  let redirectCount = 0;

  instance.interceptors.response.use(
    (response) => {
      let timeline;
      const end = Date.now();
      const start = response.config.metadata.startTime;
      response.headers['request-duration'] = end - start;
      redirectCount = 0;

      const config = response.config;
      timeline = config?.metadata?.timeline || [];
      const duration = end - config?.metadata.startTime;

      const h2 = describeHttp2Stream(response.request);
      const sentHeaders = h2 ? h2.sentHeaders : getSentHeaders(response.request);

      /** Post-response vars and scripts read request.headers, which never held the transport set. */
      response.sentHeaders = sentHeaders;

      if (h2) {
        response.httpVersion = '2.0';
        // HTTP/2 has no reason phrase (only :status), so axios leaves statusText undefined; scripts and the
        // timeline expect the h1 wording. Synthesise it from Node's table.
        if (!response.statusText) response.statusText = STATUS_CODES[response.status] || '';
        timeline.push({
          timestamp: new Date(),
          type: 'tls',
          message: `ALPN: ${h2.alpn} · ${h2.protocol} · ${h2.cipher} · ${h2.remote}`
        });
        for (const line of h2.certificateLines) {
          timeline.push({ timestamp: new Date(), type: 'tls', message: line });
        }
        timeline.push({
          timestamp: new Date(),
          type: 'info',
          message: `HTTP/2 request: ${h2.requestLine}`
        });
      }

      Object.entries(sentHeaders).forEach(([key, value]) => {
        timeline.push({
          timestamp: new Date(),
          type: 'requestHeader',
          message: `${key}: ${value}`
        });
      });

      const httpVersion = response?.request?.res?.httpVersion || response?.httpVersion;
      if (httpVersion?.startsWith('2')) {
        timeline.push({
          timestamp: new Date(),
          type: 'info',
          message: `Using HTTP/2, server supports multiplexing`
        });
      }
      timeline.push({
        timestamp: new Date(),
        type: 'response',
        message: `HTTP/${httpVersion || '1.1'} ${response.status} ${response.statusText}`
      });

      Object.entries(response.headers).forEach(([key, value]) => {
        timeline.push({
          timestamp: new Date(),
          type: 'responseHeader',
          message: `${key}: ${value}`
        });
      });

      timeline.push({
        timestamp: new Date(),
        type: 'info',
        message: `Request completed in ${duration} ms`
      });
      response.timeline = timeline;
      return response;
    },
    async (error) => {
      const config = error.config;
      const timeline = config?.metadata?.timeline || [];

      // A failed request carries the ClientRequest on the error itself when no response came back.
      const errorRequest = error.response?.request || error.request;
      const errorH2 = describeHttp2Stream(errorRequest);
      const errorHeaders = errorH2 ? errorH2.sentHeaders : getSentHeaders(errorRequest);
      if (errorH2 && error.response) {
        error.response.httpVersion = '2.0';
        if (!error.response.statusText) error.response.statusText = STATUS_CODES[error.response.status] || '';
      }

      /** A non-2xx still runs post-response scripts, and they read request.headers. */
      if (error.response) error.response.sentHeaders = errorHeaders;

      Object.entries(errorHeaders).forEach(([key, value]) => {
        timeline.push({
          timestamp: new Date(),
          type: 'requestHeader',
          message: `${key}: ${value}`
        });
      });

      timeline?.push({
        timestamp: new Date(),
        type: 'error',
        message: 'there was an error executing the request!'
      });
      if (error.response) {
        const end = Date.now();
        const start = error.config.metadata.startTime;
        error.response.headers['request-duration'] = end - start;
        const duration = end - config?.metadata?.startTime;
        if (error.response && redirectResponseCodes.includes(error.response.status)) {
          timeline.push({
            timestamp: new Date(),
            type: 'response',
            message: `HTTP/${error.response.httpVersion || '1.1'} ${error.response.status} ${error.response.statusText}`
          });
          Object.entries(error.response.headers).forEach(([key, value]) => {
            timeline.push({
              timestamp: new Date(),
              type: 'responseHeader',
              message: `${key}: ${value}`
            });
          });
          timeline.push({
            timestamp: new Date(),
            type: 'info',
            message: `Request completed in ${duration} ms`
          });

          // Attach the timeline to the response
          error.response.timeline = timeline;

          if (!followRedirects) {
            if (preferencesUtil.shouldStoreCookies()) {
              saveCookies(error.config.url, error.response.headers);
            }

            return Promise.reject(error);
          }

          if (redirectCount >= requestMaxRedirects) {
            const errorResponseData = error.response.data;
            timeline?.push({
              timestamp: new Date(),
              type: 'error',
              message: safeStringifyJSON(errorResponseData?.toString?.())
            });
            return Promise.reject(error);
          }

          // Increase redirect count
          redirectCount++;

          const locationHeader = error.response.headers.location;

          if (!locationHeader) {
            error.response.timeline = timeline;
            return Promise.reject(error);
          }

          let redirectUrl = locationHeader;

          // Handle relative URLs by resolving them against the original request URL
          if (locationHeader && !locationHeader.match(/^https?:\/\//i)) {
            // It's a relative URL, resolve it against the original URL
            redirectUrl = URL.resolve(error.config.url, locationHeader);

            timeline.push({
              timestamp: new Date(),
              type: 'info',
              message: `Resolving relative redirect URL: ${locationHeader} → ${redirectUrl}`
            });
          }

          if (preferencesUtil.shouldStoreCookies()) {
            saveCookies(error.config.url, error.response.headers);
          }

          // Create a new request config for the redirect
          const requestConfig = {
            ...error.config,
            url: redirectUrl,
            headers: {
              ...error.config.headers
            }
          };

          handleNtlmRedirect(requestConfig, error.config.url, redirectUrl, forwardAuthorizationHeader);

          if (!isSameOrigin(error.config.url, redirectUrl)) {
            /* AWS SigV4 signs a request for a specific host; re-signing after a cross-origin
            * redirect would send a freshly valid signature to an unrelated host, regardless of
            * the forwardAuthorizationHeader setting below.
            */
            requestConfig.__skipAwsV4Sign = true;
            Object.keys(requestConfig.headers).forEach((key) => {
              if (key.toLowerCase().startsWith('x-amz-')) {
                delete requestConfig.headers[key];
              }
            });

            if (!forwardAuthorizationHeader) {
              Object.keys(requestConfig.headers).forEach((key) => {
                const lowerKey = key.toLowerCase();
                if (lowerKey === 'authorization' || lowerKey === 'proxy-authorization') {
                  delete requestConfig.headers[key];
                }
              });

              timeline.push({
                timestamp: new Date(),
                type: 'info',
                message: `Cross-origin redirect: stripping Authorization and Proxy-Authorization headers`
              });
            }
          }

          // Apply proper HTTP redirect behavior based on status code
          const statusCode = error.response.status;
          const originalMethod = (error.config.method || 'get').toLowerCase();

          // For 301, 302, 303: change method to GET unless it was HEAD
          if ([301, 302, 303].includes(statusCode) && originalMethod !== 'head') {
            requestConfig.method = 'get';
            requestConfig.data = undefined;
            delete requestConfig.headers['content-length'];
            delete requestConfig.headers['Content-Length'];

            delete requestConfig.headers['content-type'];
            delete requestConfig.headers['Content-Type'];

            timeline.push({
              timestamp: new Date(),
              type: 'info',
              message: `Changed method from ${originalMethod.toUpperCase()} to GET for ${statusCode} redirect and removed request body`
            });
          } else {
            // For 307, 308 and other status codes: preserve method and body
            if (requestConfig.data && typeof requestConfig.data === 'object'
              && requestConfig.data.constructor && requestConfig.data.constructor.name === 'FormData') {
              const formData = requestConfig.data;
              if (formData._released || (formData._streams && formData._streams.length === 0)) {
                if (error.config._originalMultipartData && error.config.collectionPath) {
                  timeline.push({
                    timestamp: new Date(),
                    type: 'info',
                    message: `Recreating consumed FormData for ${statusCode} redirect`
                  });

                  const recreatedForm = createFormData(error.config._originalMultipartData, error.config.collectionPath);
                  requestConfig.data = recreatedForm;

                  const formHeaders = recreatedForm.getHeaders();
                  Object.assign(requestConfig.headers, formHeaders);

                  // preserve the original data for potential future redirects
                  requestConfig._originalMultipartData = error.config._originalMultipartData;
                  requestConfig.collectionPath = error.config.collectionPath;
                } else {
                  timeline.push({
                    timestamp: new Date(),
                    type: 'info',
                    message: `FormData consumed but no original data available for ${statusCode} redirect`
                  });
                }
              } else {
                requestConfig._originalMultipartData = error.config._originalMultipartData;
                requestConfig.collectionPath = error.config.collectionPath;
              }
            }
          }

          if (preferencesUtil.shouldSendCookies()) {
            const cookieString = getCookieStringForUrl(redirectUrl);
            if (cookieString && typeof cookieString === 'string' && cookieString.length) {
              requestConfig.headers['cookie'] = cookieString;
            }
          }

          try {
            await setupProxyAgents({
              requestConfig,
              proxyMode,
              proxyModeReason,
              proxyConfig,
              httpsAgentRequestFields,
              interpolationOptions,
              timeline
            });
          } catch (err) {
            if (err.timeline) {
              timeline = err.timeline;
            }
            timeline.push({
              timestamp: new Date(),
              type: 'error',
              message: `Error setting up proxy agents: ${err?.message}`
            });
          }

          requestConfig.metadata.timeline = timeline;
          // Make the redirected request
          return instance(requestConfig);
        } else {
          const errorResponseData = error.response.data;
          timeline.push({
            timestamp: new Date(),
            type: 'response',
            message: `HTTP/${error.response.httpVersion || '1.1'} ${error.response.status} ${error.response.statusText}`
          });
          Object.entries(error?.response?.headers || {}).forEach(([key, value]) => {
            timeline.push({
              timestamp: new Date(),
              type: 'responseHeader',
              message: `${key}: ${value}`
            });
          });
          timeline?.push({
            timestamp: new Date(),
            type: 'error',
            message: safeStringifyJSON(errorResponseData?.toString?.())
          });
          error?.cause && timeline?.push({
            timestamp: new Date(),
            type: 'error',
            message: safeStringifyJSON(error?.cause)
          });
          error?.errors && timeline?.push({
            timestamp: new Date(),
            type: 'error',
            message: safeStringifyJSON(error?.errors)
          });
          error.response.timeline = timeline;
          return Promise.reject(error);
        }
      } else if (error?.code) {
        Object.entries(error?.response?.headers || {}).forEach(([key, value]) => {
          timeline.push({
            timestamp: new Date(),
            type: 'responseHeader',
            message: `${key}: ${value}`
          });
        });
        timeline?.push({
          timestamp: new Date(),
          type: 'error',
          message: safeStringifyJSON(error?.cause)
        });
        timeline?.push({
          timestamp: new Date(),
          type: 'error',
          message: safeStringifyJSON(error?.errors)
        });
        error.timeline = timeline;
        error.statusText = error.code;
        return Promise.reject(error);
      }
      return Promise.reject(error);
    }
  );

  return instance;
}

module.exports = {
  makeAxiosInstance
};
