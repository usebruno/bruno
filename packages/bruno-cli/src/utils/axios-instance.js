const axios = require('axios');
const { CLI_VERSION } = require('../constants');
const { addCookieToJar, getCookieStringForUrl } = require('./cookies');
const { createFormData } = require('./form-data');

const redirectResponseCodes = [301, 302, 303, 307, 308];
const METHOD_CHANGING_REDIRECTS = [301, 302, 303];

const saveCookies = (url, headers) => {
  if (headers['set-cookie']) {
    let setCookieHeaders = Array.isArray(headers['set-cookie'])
      ? headers['set-cookie']
      : [headers['set-cookie']];
    for (let setCookieHeader of setCookieHeaders) {
      if (typeof setCookieHeader === 'string' && setCookieHeader.length) {
        addCookieToJar(setCookieHeader, url);
      }
    }
  }
};

/**
 * Check if two URLs share the same origin (protocol + hostname + port)
 * Used to determine if sensitive headers should be preserved during redirects
 * @param {string} url1 - The original URL
 * @param {string} url2 - The redirect URL
 * @returns {boolean} - True if same origin, false otherwise
 */
const isSameOrigin = (url1, url2) => {
  const URL = require('url');
  const parsed1 = URL.parse(url1);
  const parsed2 = URL.parse(url2);

  // Normalize ports: null/undefined means default port for the protocol
  const getPort = (parsed) => {
    if (parsed.port) return parsed.port;
    // Return default port based on protocol
    return parsed.protocol === 'https:' ? '443' : '80';
  };

  return (
    parsed1.protocol === parsed2.protocol
    && parsed1.hostname === parsed2.hostname
    && getPort(parsed1) === getPort(parsed2)
  );
};

/**
 * List of sensitive headers that should not be sent across different origins
 * to prevent credential leakage and follow browser security standards
 */
const SENSITIVE_HEADERS = [
  'authorization',
  'proxy-authorization',
  'cookie',
  'www-authenticate',
  'proxy-authenticate'
];

/**
 * Filter headers for redirect requests based on origin
 * Strips sensitive headers when redirecting to a different origin (cross-domain)
 * to prevent credential leakage, following browser security standards and RFC 7231
 * @param {Object} headers - Original request headers
 * @param {string} originalUrl - The original request URL
 * @param {string} redirectUrl - The redirect target URL
 * @returns {Object} - Filtered headers safe for the redirect
 */
const filterHeadersForRedirect = (headers, originalUrl, redirectUrl) => {
  // If same origin, keep all headers
  if (isSameOrigin(originalUrl, redirectUrl)) {
    return { ...headers };
  }

  // Different origin - strip sensitive headers to prevent credential leakage
  const filteredHeaders = { ...headers };

  SENSITIVE_HEADERS.forEach((headerName) => {
    // Remove all case variations of the header
    Object.keys(filteredHeaders).forEach((key) => {
      if (key.toLowerCase() === headerName) {
        delete filteredHeaders[key];
      }
    });
  });

  return filteredHeaders;
};

const createRedirectConfig = (error, redirectUrl) => {
  const requestConfig = {
    ...error.config,
    url: redirectUrl,
    headers: filterHeadersForRedirect(error.config.headers,
      error.config.url,
      redirectUrl)
  };

  const statusCode = error.response.status;
  const originalMethod = (error.config.method || 'get').toLowerCase();

  // For 301, 302, 303: change method to GET unless it was HEAD
  if (METHOD_CHANGING_REDIRECTS.includes(statusCode) && originalMethod !== 'head') {
    requestConfig.method = 'get';
    requestConfig.data = undefined;
    
    // Clean up headers that are no longer relevant
    delete requestConfig.headers['content-length'];
    delete requestConfig.headers['Content-Length'];
    delete requestConfig.headers['content-type']; 
    delete requestConfig.headers['Content-Type'];
  } else {
    // For 307, 308 and other status codes: preserve method and body
    if (requestConfig.data && typeof requestConfig.data === 'object' && 
        requestConfig.data.constructor && requestConfig.data.constructor.name === 'FormData') {
      
      const formData = requestConfig.data;
      if (formData._released || (formData._streams && formData._streams.length === 0)) {
        if (error.config._originalMultipartData && error.config.collectionPath) {
          const recreatedForm = createFormData(error.config._originalMultipartData, error.config.collectionPath);
          requestConfig.data = recreatedForm;
          const formHeaders = recreatedForm.getHeaders();
          Object.assign(requestConfig.headers, formHeaders);
          
          // preserve the original data for potential future redirects
          requestConfig._originalMultipartData = error.config._originalMultipartData;
          requestConfig.collectionPath = error.config.collectionPath;
        }
      } else {
        requestConfig._originalMultipartData = error.config._originalMultipartData;
        requestConfig.collectionPath = error.config.collectionPath;
      }
    }
  }

  return requestConfig;
};

/**
 * Function that configures axios with timing interceptors
 * Important to note here that the timings are not completely accurate.
 * @see https://github.com/axios/axios/issues/695
 * @returns {axios.AxiosInstance}
 */
function makeAxiosInstance({ requestMaxRedirects = 5, disableCookies } = {}) {
  let redirectCount = 0;

  /** @type {axios.AxiosInstance} */
  const instance = axios.create({
    proxy: false,
    maxRedirects: 0,
    headers: {
      "User-Agent": `bruno-runtime/${CLI_VERSION}`
    }
  });

  instance.interceptors.request.use((config) => {
    config.headers['request-start-time'] = Date.now();

    // Initialize timeline metadata if not present
    if (!config.metadata) {
      config.metadata = {
        startTime: Date.now(),
        timeline: []
      };
    }

    // Add cookies to request if available and not disabled
    if (!disableCookies) {
      const cookieString = getCookieStringForUrl(config.url);
      if (cookieString && typeof cookieString === 'string' && cookieString.length) {
        config.headers['cookie'] = cookieString;
      }
    }

    return config;
  });

  instance.interceptors.response.use(
    (response) => {
      const end = Date.now();
      const start = response.config.headers['request-start-time'];
      response.headers['request-duration'] = end - start;
      redirectCount = 0;

      // Attach timeline to response if it exists
      const config = response.config;
      const timeline = config?.metadata?.timeline || [];
      response.timeline = timeline;

      return response;
    },
    (error) => {
      const config = error.config;
      const timeline = config?.metadata?.timeline || [];

      if (error.response) {
        const end = Date.now();
        const start = error.config.headers['request-start-time'];
        error.response.headers['request-duration'] = end - start;

        if (redirectResponseCodes.includes(error.response.status)) {
          if (redirectCount >= requestMaxRedirects) {
            // todo: needs to be discussed whether the original error response message should be modified or not
            return Promise.reject(error);
          }

          const locationHeader = error.response.headers.location;
          if (!locationHeader) {
            // todo: needs to be discussed whether the original error response message should be modified or not
            return Promise.reject(error);
          }

          redirectCount++;
          let redirectUrl = locationHeader;

          if (!locationHeader.match(/^https?:\/\//i)) {
            const URL = require('url');
            redirectUrl = URL.resolve(error.config.url, locationHeader);
          }

          if (!disableCookies){
            saveCookies(error.config.url, error.response.headers);
          }

          const requestConfig = createRedirectConfig(error, redirectUrl);

          // Log security filtering if cross-domain redirect
          if (!isSameOrigin(error.config.url, redirectUrl)) {
            const URL = require('url');
            const originalHost = URL.parse(error.config.url).hostname;
            const redirectHost = URL.parse(redirectUrl).hostname;
            timeline.push({
              timestamp: new Date(),
              type: 'info',
              message: `Cross-domain redirect detected (${originalHost} → ${redirectHost}). Sensitive headers (Authorization, Cookie, etc.) removed for security.`
            });
          }

          // Ensure timeline is preserved in the redirect request
          if (!requestConfig.metadata) {
            requestConfig.metadata = {
              startTime: config?.metadata?.startTime || Date.now(),
              timeline: timeline
            };
          } else {
            requestConfig.metadata.timeline = timeline;
          }

          if (!disableCookies) {
            const cookieString = getCookieStringForUrl(redirectUrl);
            if (cookieString && typeof cookieString === 'string' && cookieString.length) {
              requestConfig.headers['cookie'] = cookieString;
            }
          }

          return instance(requestConfig);
        }
      }
      return Promise.reject(error);
    }
  );

  return instance;
}

module.exports = {
  makeAxiosInstance
};
