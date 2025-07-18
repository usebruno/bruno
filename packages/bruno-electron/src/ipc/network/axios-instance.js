const URL = require('url');
const Socket = require('net').Socket;
const axios = require('axios');
const connectionCache = new Map(); // Cache to store checkConnection() results
const electronApp = require("electron");
const { setupProxyAgents } = require('../../utils/proxy-util');
const { addCookieToJar, getCookieStringForUrl } = require('../../utils/cookies');
const { preferencesUtil } = require('../../store/preferences');
const { safeStringifyJSON } = require('../../utils/common');

const LOCAL_IPV6 = '::1';
const LOCAL_IPV4 = '127.0.0.1';
const LOCALHOST = 'localhost';
const version = electronApp?.app?.getVersion() ?? "";
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
}

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
  proxyConfig = {}, 
  requestMaxRedirects = 5, 
  httpsAgentRequestFields = {}, 
  interpolationOptions = {}
} = {}) {
  /** @type {axios.AxiosInstance} */
  const instance = axios.create({
    transformRequest: function transformRequest(data, headers) {
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
    headers: {
      "User-Agent": `bruno-runtime/${version}`
    }
  });

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
      message: `Preparing request to ${config.url}`,
    });
    timeline.push({
      timestamp: new Date(),
      type: 'info',
      message: `Current time is ${new Date().toISOString()}`,
    });
  
    // Add request method and headers
    timeline.push({
      timestamp: new Date(),
      type: 'request',
      message: `${config.method.toUpperCase()} ${config.url}`,
    });
    Object.entries(config.headers).forEach(([key, value]) => {
      timeline.push({
        timestamp: new Date(),
        type: 'requestHeader',
        message: `${key}: ${value}`,
      });
    });
  
    // Add request data if available
    if (config.data) {
      let requestData = typeof config.data === 'string' ? config.data : JSON.stringify(config.data, null, 2);
      timeline.push({
        timestamp: new Date(),
        type: 'requestData',
        message: requestData,
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
    }

    // Store request start time in config instead of headers to avoid server validation issues
    config.requestStartTime = Date.now();

    const agentOptions = {
      ...httpsAgentRequestFields,
      keepAlive: true,
    };

    try {
      // Now call setupProxyAgents and pass the timeline
      setupProxyAgents({
        requestConfig: config,
        proxyMode: proxyMode, // 'on', 'off', or 'system', depending on your settings
        proxyConfig: proxyConfig,
        httpsAgentRequestFields: agentOptions,
        interpolationOptions: interpolationOptions, // Provide your interpolation options
        timeline,
      });
    }
    catch(err) {
      if (err.timeline) {
        timeline = err.timeline;
      }
      timeline.push({
        timestamp: new Date(),
        type: 'error',
        message: `Error setting up proxy agents: ${err?.message}`,
      });
    }
    config.metadata.timeline = timeline;
    return config;
  });

  let redirectCount = 0

  instance.interceptors.response.use(
    (response) => {
      let timeline;
      const end = Date.now();
      const start = response.config.requestStartTime;
      response.headers['request-duration'] = end - start;
      redirectCount = 0;

      const config = response.config;
      timeline = config?.metadata?.timeline || []
      const duration = end - config?.metadata.startTime;

      const httpVersion = response?.request?.res?.httpVersion || response?.httpVersion;
      if (httpVersion?.startsWith('2')) {
        timeline.push({
          timestamp: new Date(),
          type: 'info',
          message: `Using HTTP/2, server supports multiplexing`,
        });
      }
      timeline.push({
        timestamp: new Date(),
        type: 'response',
        message: `HTTP/${httpVersion || '1.1'} ${response.status} ${response.statusText}`,
      });

      Object.entries(response.headers).forEach(([key, value]) => {
        timeline.push({
          timestamp: new Date(),
          type: 'responseHeader',
          message: `${key}: ${value}`,
        });
      });

      timeline.push({
        timestamp: new Date(),
        type: 'info',
        message: `Request completed in ${duration} ms`,
      });
      response.timeline = timeline;
      return response;
    },
    (error) => {
      const config = error.config;
      const timeline = config?.metadata?.timeline || [];
      timeline?.push({
        timestamp: new Date(),
        type: 'error',
        message: 'there was an error executing the request!'
      });
      if (error.response) {
        const end = Date.now();
        const start = error.config.requestStartTime;
        error.response.headers['request-duration'] = end - start;
        const duration = end - config?.metadata?.startTime;
        if (error.response && redirectResponseCodes.includes(error.response.status)) {
          timeline.push({
            timestamp: new Date(),
            type: 'response',
            message: `HTTP/${error.response.httpVersion || '1.1'} ${error.response.status} ${error.response.statusText}`,
          });
          Object.entries(error.response.headers).forEach(([key, value]) => {
            timeline.push({
              timestamp: new Date(),
              type: 'responseHeader',
              message: `${key}: ${value}`,
            });
          });
          timeline.push({
            timestamp: new Date(),
            type: 'info',
            message: `Request completed in ${duration} ms`,
          });

          // Attach the timeline to the response
          error.response.timeline = timeline;

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
          let redirectUrl = locationHeader;

          // Handle relative URLs by resolving them against the original request URL
          if (locationHeader && !locationHeader.match(/^https?:\/\//i)) {
            // It's a relative URL, resolve it against the original URL
            redirectUrl = URL.resolve(error.config.url, locationHeader);
            
            timeline.push({
              timestamp: new Date(),
              type: 'info',
              message: `Resolving relative redirect URL: ${locationHeader} → ${redirectUrl}`,
            });
          }

          if (preferencesUtil.shouldStoreCookies()) {
            saveCookies(redirectUrl, error.response.headers);
          }

          // Create a new request config for the redirect
          const requestConfig = {
            ...error.config,
            url: redirectUrl,
            headers: {
              ...error.config.headers,
            },
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
                message: `Changed method from ${originalMethod.toUpperCase()} to GET for ${statusCode} redirect and removed request body`,
              });
          }

          if (preferencesUtil.shouldSendCookies()) {
            const cookieString = getCookieStringForUrl(redirectUrl);
            if (cookieString && typeof cookieString === 'string' && cookieString.length) {
              requestConfig.headers['cookie'] = cookieString;
            }
          }

          try { 
            setupProxyAgents({
              requestConfig,
              proxyMode,
              proxyConfig,
              httpsAgentRequestFields,
              interpolationOptions,
              timeline
            });
          }
          catch(err) {
            if (err.timeline) {
              timeline = err.timeline;
            }
            timeline.push({
              timestamp: new Date(),
              type: 'error',
              message: `Error setting up proxy agents: ${err?.message}`,
            });
          }

          requestConfig.metadata.timeline = timeline;
          // Make the redirected request
          return instance(requestConfig);
        }
        else {
          const errorResponseData = error.response.data;
          timeline.push({
            timestamp: new Date(),
            type: 'response',
            message: `HTTP/${error.response.httpVersion || '1.1'} ${error.response.status} ${error.response.statusText}`,
          });
          Object.entries(error?.response?.headers || {}).forEach(([key, value]) => {
            timeline.push({
              timestamp: new Date(),
              type: 'responseHeader',
              message: `${key}: ${value}`,
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
      }
      else if (error?.code) {
        Object.entries(error?.response?.headers || {}).forEach(([key, value]) => {
          timeline.push({
            timestamp: new Date(),
            type: 'responseHeader',
            message: `${key}: ${value}`,
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
