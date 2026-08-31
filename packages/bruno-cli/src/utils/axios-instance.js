const axios = require('axios');
const { CLI_VERSION } = require('../constants');
const { addCookieToJar, getCookieStringForUrl } = require('./cookies');
const { createFormData } = require('./form-data');
const { setupProxyAgents } = require('./proxy-util');
const { isSameOrigin, DEFAULT_MAX_REDIRECTS } = require('@usebruno/common').utils;
const { applyOmitHeaders, shouldOmitConnection } = require('@usebruno/common');
const { getSentHeaders, applyOmitConnectionToAxiosConfig, handleNtlmRedirect } = require('@usebruno/requests');

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

const createRedirectConfig = (error, redirectUrl) => {
  const requestConfig = {
    ...error.config,
    url: redirectUrl,
    headers: { ...error.config.headers }
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
    if (requestConfig.data && typeof requestConfig.data === 'object'
      && requestConfig.data.constructor && requestConfig.data.constructor.name === 'FormData') {
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
function makeAxiosInstance({
  requestMaxRedirects = DEFAULT_MAX_REDIRECTS,
  disableCookies,
  followRedirects = true,
  forwardAuthorizationHeader = true,
  proxyMode,
  proxyConfig,
  systemProxyConfig,
  httpsAgentRequestFields,
  interpolationOptions,
  disableCache
} = {}) {
  let redirectCount = 0;

  /** @type {axios.AxiosInstance} */
  const instance = axios.create({
    proxy: false,
    maxRedirects: 0,
    headers: {}
  });

  // Extend common headers with User-Agent rather than replacing the object.
  // axios.create() preserves defaults.headers.common = { Accept: 'application/json, text/plain, */*' }.
  // Assigning a new object (= { 'User-Agent': ... }) would nuke that default, causing servers that
  // rely on content-negotiation to receive requests with no Accept header.
  instance.defaults.headers.common['User-Agent'] = `bruno-runtime/${CLI_VERSION}`;

  instance.interceptors.request.use((config) => {
    config.metadata = config.metadata || {};
    config.metadata.startTime = Date.now();
    config.headers['request-start-time'] = config.metadata.startTime;

    // Omit listed defaults and script-deleted headers. set(null) so Axios
    // does not put User-Agent / Accept-Encoding back.
    const { omitConnection } = applyOmitHeaders(config.headers, {
      omitHeaders: config.settings?.omitHeaders,
      headersToDelete: config.__headersToDelete,
      explicitHeaderNames: config.__explicitHeaderNames
    });
    delete config.__headersToDelete;

    // Node keep-alive agents add Connection; strip it on the ClientRequest.
    if (omitConnection) {
      applyOmitConnectionToAxiosConfig(config);
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
      const start = response.config.metadata.startTime;
      response.headers['request-duration'] = end - start;
      redirectCount = 0;
      response.sentHeaders = getSentHeaders(response.request);

      return response;
    },
    async (error) => {
      error.sentHeaders = getSentHeaders(error.response?.request || error.request);
      if (error.response) {
        const end = Date.now();
        const start = error.config.metadata.startTime;
        error.response.headers['request-duration'] = end - start;
        error.response.sentHeaders = error.sentHeaders;

        if (redirectResponseCodes.includes(error.response.status)) {
          if (!followRedirects) {
            if (!disableCookies) {
              saveCookies(error.config.url, error.response.headers);
            }

            return Promise.reject(error);
          }

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

          if (!disableCookies) {
            saveCookies(error.config.url, error.response.headers);
          }

          const requestConfig = createRedirectConfig(error, redirectUrl);

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
            }
          }

          const omitConnectionOnRedirect = shouldOmitConnection({
            omitHeaders: requestConfig.settings?.omitHeaders,
            headersToDelete: requestConfig.__headersToDelete,
            explicitHeaderNames: requestConfig.__explicitHeaderNames
          });

          await setupProxyAgents({
            requestConfig,
            proxyMode,
            proxyConfig,
            systemProxyConfig,
            httpsAgentRequestFields: {
              ...httpsAgentRequestFields,
              keepAlive: !omitConnectionOnRedirect
            },
            interpolationOptions,
            disableCache
          });

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
