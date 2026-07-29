const URL = require('url');
const Socket = require('net').Socket;
const axios = require('axios');
const connectionCache = new Map(); // Cache to store checkConnection() results
const electronApp = require('electron');
const { setupProxyAgents } = require('../../utils/proxy-util');
const { addCookieToJar, getCookieStringForUrl } = require('../../utils/cookies');
const { preferencesUtil } = require('../../store/preferences');
const { safeStringifyJSON } = require('../../utils/common');
const { createFormData } = require('../../utils/form-data');
const { parseSentHeaders, hasWireBlock } = require('@usebruno/common/utils');

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
      for (let setCookieHeader of setCookieHeaders) {
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

// Reconcile the current hop's logged request headers with what the request actually sent.
//
// The request interceptor logs config.headers, which is neither complete nor faithful: the Node http
// adapter appends transport headers (Host, Connection, Accept-Encoding, Content-Length,
// Transfer-Encoding) afterwards, axios carries a Content-Type of `undefined` on every request, and a
// non-string value logs as its JS rendering rather than its wire serialization. The serialized block
// on the ClientRequest is authoritative, so when it's available the hop's logged block is replaced
// wholesale — that is what makes the timeline match a packet capture.
//
// Redirects accumulate every hop in one timeline with a 'request' marker per hop, so this is scoped
// to the last hop: earlier hops keep the block they were reconciled with when they completed.
const reconcileSentHeaders = (timeline, req) => {
  if (!Array.isArray(timeline) || !req) return;
  // This only enriches the timeline for display, and it runs on the core success/error (and
  // redirect) path, so a failure here must never break request execution. Swallow and log.
  try {
    const sent = parseSentHeaders(req);
    if (!sent.length) return;

    let hopStart = 0;
    for (let i = timeline.length - 1; i >= 0; i--) {
      if (timeline[i]?.type === 'request') {
        hopStart = i;
        break;
      }
    }

    // Every requestHeader entry in the hop is a candidate for replacement, parseable or not — the
    // wire block is the whole truth about this hop, so a malformed entry must not outlive it.
    const headerIndexes = [];
    for (let i = hopStart; i < timeline.length; i++) {
      if (timeline[i]?.type === 'requestHeader') headerIndexes.push(i);
    }

    const entryFor = (h) => ({ timestamp: new Date(), type: 'requestHeader', message: `${h.name}: ${h.value}` });

    // getHeaders() can't stand in for the wire block: Node emits Connection and Transfer-Encoding
    // only while serializing, so replacing with it would drop headers we know were sent. Fall back
    // to adding just the names missing from the log.
    if (!hasWireBlock(req)) {
      const logged = new Set();
      headerIndexes.forEach((i) => {
        const message = timeline[i]?.message;
        if (typeof message !== 'string') return;
        const idx = message.indexOf(':');
        if (idx !== -1) logged.add(message.slice(0, idx).trim().toLowerCase());
      });
      const additions = sent.filter((h) => !logged.has(h.name.toLowerCase())).map(entryFor);
      if (!additions.length) return;
      const lastIdx = headerIndexes[headerIndexes.length - 1];
      timeline.splice(lastIdx === undefined ? timeline.length : lastIdx + 1, 0, ...additions);
      return;
    }

    const replacement = sent.map(entryFor);
    if (!headerIndexes.length) {
      timeline.splice(hopStart + 1, 0, ...replacement);
      return;
    }
    // The logged block is contiguous in practice, but splicing at the first index and removing
    // exactly the logged entries keeps surrounding entries intact either way.
    const firstIdx = headerIndexes[0];
    for (let i = headerIndexes.length - 1; i >= 0; i--) {
      timeline.splice(headerIndexes[i], 1);
    }
    timeline.splice(firstIdx, 0, ...replacement);
  } catch (err) {
    console.error('Failed to reconcile sent headers into the timeline:', err);
  }
};

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
  requestMaxRedirects = 5,
  httpsAgentRequestFields = {},
  interpolationOptions = {},
  followRedirects = true
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
      let requestData = typeof config.data === 'string' ? config.data : JSON.stringify(config.data, null, 2);
      timeline.push({
        timestamp: new Date(),
        type: 'requestData',
        message: requestData
      });
    }

    // Resolve all *.localhost to localhost and check if it should use IPv6 or IPv4
    // RFC: 6761 section 6.3 (https://tools.ietf.org/html/rfc6761#section-6.3)
    // @see https://github.com/usebruno/bruno/issues/124
    if (getTld(url.hostname) === LOCALHOST || url.hostname === LOCAL_IPV4 || url.hostname === LOCAL_IPV6) {
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

    config.headers['request-start-time'] = Date.now();

    /**
      Apply header deletions requested via req.deleteHeader() in pre-request scripts.
      Using set(name, null) rather than delete(): the axios http adapter guards its
      own defaults (User-Agent, Accept-Encoding) with set(..., false) which only
      skips writing when the key already exists. delete() removes the key entirely,
      so the guard misses and the adapter re-adds the default. null keeps the key
      present (blocking the guard) while toJSON() omits null values from the wire.
     */
    const headersToDelete = config.__headersToDelete;
    let deleteConnection = false;

    if (headersToDelete && Array.isArray(headersToDelete)) {
      headersToDelete.forEach((headerName) => {
        const lower = headerName.toLowerCase();
        if (lower === 'host') return;
        if (lower === 'connection') {
          // Handled after setupProxyAgents to avoid being overwritten by keepAlive:true.
          deleteConnection = true;
          return;
        }
        config.headers.set(headerName, null);
      });
      delete config.__headersToDelete;
    }

    // Log request headers AFTER deletion so the timeline reflects what is actually sent. Skip null
    // (headers marked for deletion), false (e.g. content-type suppressed for no-body requests — see
    // https://github.com/usebruno/bruno/issues/1693), and undefined: axios carries
    // defaults.headers.common['Content-Type'] = undefined on every request, and logging it would both
    // show a phantom "Content-Type: undefined" row and mask the real value the adapter goes on to set.
    // reconcileSentHeaders replaces this block with the wire block once the request is serialized.
    Object.entries(config.headers).forEach(([key, value]) => {
      if (value === null || value === false || value === undefined) return;
      // Scripts can set a non-string value (e.g. req.setHeader('x', {...})); JSON-encode it so the
      // log shows the value instead of "[object Object]".
      const printableValue = typeof value === 'object' ? safeStringifyJSON(value) : value;
      timeline.push({
        timestamp: new Date(),
        type: 'requestHeader',
        message: `${key}: ${printableValue}`
      });
    });

    const agentOptions = {
      ...httpsAgentRequestFields,
      keepAlive: true
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

    config.metadata.timeline = timeline;
    return config;
  });

  let redirectCount = 0;

  instance.interceptors.response.use(
    (response) => {
      let timeline;
      const end = Date.now();
      const start = response.config.headers['request-start-time'];
      response.headers['request-duration'] = end - start;
      redirectCount = 0;

      const config = response.config;
      timeline = config?.metadata?.timeline || [];
      reconcileSentHeaders(timeline, response.request);
      const duration = end - config?.metadata.startTime;

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
      reconcileSentHeaders(timeline, error.request || error.response?.request);
      timeline?.push({
        timestamp: new Date(),
        type: 'error',
        message: 'there was an error executing the request!'
      });
      if (error.response) {
        const end = Date.now();
        const start = error.config.headers['request-start-time'];
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
  makeAxiosInstance,
  reconcileSentHeaders
};
