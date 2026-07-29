const axios = require('axios');
const { parseSentHeaders, sentHeadersToObject } = require('@usebruno/common/utils');
const { CLI_VERSION } = require('../constants');
const { addCookieToJar, getCookieStringForUrl } = require('./cookies');
const { createFormData } = require('./form-data');
const { setupProxyAgents } = require('./proxy-util');

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
  requestMaxRedirects = 5,
  disableCookies,
  followRedirects = true,
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
    if (headersToDelete && Array.isArray(headersToDelete)) {
      headersToDelete.forEach((headerName) => {
        const lower = headerName.toLowerCase();
        if (lower === 'host' || lower === 'connection') return;
        config.headers.set(headerName, null);
      });
      delete config.__headersToDelete;
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

  // config.headers describes the request Bruno prepared, not the one it sent: axios builds a fresh
  // AxiosHeaders per call (so the interceptor's own additions never reach the caller's object) and the
  // Node http adapter appends Host, Connection, Accept-Encoding and the body headers afterwards.
  // Record the serialized wire headers here so reporters can describe the real request.
  //
  // request-start-time is Bruno's own timing carrier, not something the user configured; it holds a
  // raw epoch millisecond value, so reporting it would put a value that changes on every run into
  // --reporter-json/--reporter-html output and make those files non-comparable between runs.
  const INTERNAL_HEADERS = new Set(['request-start-time']);
  const recordSentHeaders = (target, req) => {
    if (!target) return;
    const sent = parseSentHeaders(req).filter((h) => !INTERNAL_HEADERS.has(h.name.toLowerCase()));
    if (sent.length) target.sentHeaders = sentHeadersToObject(sent);
  };

  instance.interceptors.response.use(
    (response) => {
      const end = Date.now();
      const start = response.config.headers['request-start-time'];
      response.headers['request-duration'] = end - start;
      redirectCount = 0;
      recordSentHeaders(response, response.request);

      return response;
    },
    async (error) => {
      // A 4xx/5xx rejects here and the runner still reports that request, so record on the error and
      // on its response — the runner reads whichever of the two it ends up holding.
      const req = error.request || error.response?.request;
      recordSentHeaders(error, req);
      recordSentHeaders(error.response, req);
      if (error.response) {
        const end = Date.now();
        const start = error.config.headers['request-start-time'];
        error.response.headers['request-duration'] = end - start;

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

          await setupProxyAgents({
            requestConfig,
            proxyMode,
            proxyConfig,
            systemProxyConfig,
            httpsAgentRequestFields,
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
