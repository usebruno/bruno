const URL = require('url');
const Socket = require('net').Socket;
const axios = require('axios');
const connectionCache = new Map(); // Cache to store checkConnection() results
const electronApp = require("electron");
const { get } = require('lodash');
const { preferencesUtil } = require('../../store/preferences');
const { getCookieStringForUrl, addCookieToJar } = require('../../utils/cookies');

const LOCAL_IPV6 = '::1';
const LOCAL_IPV4 = '127.0.0.1';
const LOCALHOST = 'localhost';
const version = electronApp?.app?.getVersion()?.substring(1) ?? "";

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

/**
 * Function that configures axios with timing interceptors
 * Important to note here that the timings are not completely accurate.
 * @see https://github.com/axios/axios/issues/695
 * @returns {axios.AxiosInstance}
 */
function makeAxiosInstance({ brunoConfig, MAX_REDIRECTS, httpsAgentRequestFields, interpolationOptions, setupProxyAgents }) {
  /** @type {axios.AxiosInstance} */
  const instance = axios.create({
    transformRequest: function transformRequest(data, headers) {
      // doesn't apply the default transformRequest if the data is a string, so that axios doesn't add quotes see :
      // https://github.com/usebruno/bruno/issues/2043
      // https://github.com/axios/axios/issues/4034
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
    headers: {
      "User-Agent": `bruno-runtime/${version}`
    }
  });

  instance.interceptors.request.use(async (config) => {
    const url = URL.parse(config.url);

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

    config.headers['request-start-time'] = Date.now();
    return config;
  });

  let redirectCount = 0

  instance.interceptors.response.use(
    (response) => {
      const end = Date.now();
      const start = response.config.headers['request-start-time'];
      response.headers['request-duration'] = end - start;
      redirectCount = 0;
      return response;
    },
    (error) => {
      if (error.response) {
        const end = Date.now();
        const start = error.config.headers['request-start-time'];
        error.response.headers['request-duration'] = end - start;

        if (error.response && [301, 302, 303, 307, 308].includes(error.response.status)) {
          if (redirectCount >= MAX_REDIRECTS) {
            const dataBuffer = Buffer.from(error.response.data);

            return {
              status: error.response.status,
              statusText: error.response.statusText,
              headers: error.response.headers,
              data: error.response.data,
              dataBuffer: dataBuffer.toString('base64'),
              size: Buffer.byteLength(dataBuffer),
              duration: error.response.headers.get('request-duration') ?? 0
            };
          }

          let proxyMode = 'off';
          let proxyConfig = {};

          const collectionProxyConfig = get(brunoConfig, 'proxy', {});
          const collectionProxyEnabled = get(collectionProxyConfig, 'enabled', 'global');
          if (collectionProxyEnabled === true) {
            proxyConfig = collectionProxyConfig;
            proxyMode = 'on';
          } else if (collectionProxyEnabled === 'global') {
            proxyConfig = preferencesUtil.getGlobalProxyConfig();
            proxyMode = get(proxyConfig, 'mode', 'off');
          }

          // Increase redirect count
          redirectCount++;

          const redirectUrl = error.response.headers.location;

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

          if (preferencesUtil.shouldSendCookies()) {
            const cookieString = getCookieStringForUrl(error.response.headers.location);
            if (cookieString && typeof cookieString === 'string' && cookieString.length) {
              requestConfig.headers['cookie'] = cookieString;
            }
          }


          setupProxyAgents({
            requestConfig,
            proxyMode,
            proxyConfig,
            httpsAgentRequestFields,
            interpolationOptions
          });

          // Make the redirected request
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
