const axios = require('axios');
const { CLI_VERSION } = require('../constants');
const { addCookieToJar, getCookieStringForUrl } = require('./cookies');

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
  }

  return requestConfig;
};

/**
 * Function that configures axios with timing interceptors
 * Important to note here that the timings are not completely accurate.
 * @see https://github.com/axios/axios/issues/695
 * @returns {axios.AxiosInstance}
 */
function makeAxiosInstance({ requestMaxRedirects = 5 } = {}) {
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

    // Add cookies to request if available
    const cookieString = getCookieStringForUrl(config.url);
    if (cookieString && typeof cookieString === 'string' && cookieString.length) {
      config.headers['cookie'] = cookieString;
    }

    return config;
  });

  instance.interceptors.response.use(
    (response) => {
      const end = Date.now();
      const start = response.config.headers['request-start-time'];
      response.headers['request-duration'] = end - start;
      redirectCount = 0;

      saveCookies(response.config.url, response.headers);
      return response;
    },
    (error) => {
      if (error.response) {
        const end = Date.now();
        const start = error.config.headers['request-start-time'];
        error.response.headers['request-duration'] = end - start;

        if (redirectResponseCodes.includes(error.response.status)) {
          if (redirectCount >= requestMaxRedirects) {
            const err = new Error(`Maximum redirects (${requestMaxRedirects}) exceeded`);
            err.originalError = error;
            return Promise.reject(err);
          }

          const locationHeader = error.response.headers.location;
          if (!locationHeader) {
            return Promise.reject(new Error('Redirect location header missing'));
          }

          redirectCount++;
          let redirectUrl = locationHeader;

          if (!locationHeader.match(/^https?:\/\//i)) {
            const URL = require('url');
            redirectUrl = URL.resolve(error.config.url, locationHeader);
          }

          saveCookies(redirectUrl, error.response.headers);
          const requestConfig = createRedirectConfig(error, redirectUrl);

          const cookieString = getCookieStringForUrl(redirectUrl);
          if (cookieString && typeof cookieString === 'string' && cookieString.length) {
            requestConfig.headers['cookie'] = cookieString;
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
