const { getCookieStringForUrl, addCookieToJar } = require('../../utils/cookies');

function addRequestCookieInterceptor(axiosInstance) {
  axiosInstance.interceptors.request.use((config) => {
    const cookieString = getCookieStringForUrl(config.url);

    if (cookieString && typeof cookieString === 'string' && cookieString.length) {
      config.headers['cookie'] = cookieString;
    }

    return config;
  });
}

function addResponseCookieInterceptor(axiosInstance) {
  //There is no control over flow if we have auto re-directs
  axiosInstance.defaults.maxRedirects = 0;

  axiosInstance.interceptors.response.use(
    (response) => {
      updateCookieJar(response);

      return response;
    },
    (error) => {
      if (error.response && [301, 302].includes(error.response.status)) {
        updateCookieJar(error.response);

        const redirectUrl = error.response.headers.location;
        return axiosInstance.get(redirectUrl);
      }

      return Promise.reject(error);
    }
  );
}

const updateCookieJar = (response) => {
  if (response.headers['set-cookie']) {
    let setCookieHeaders = Array.isArray(response.headers['set-cookie'])
      ? response.headers['set-cookie']
      : [response.headers['set-cookie']];

    for (let setCookieHeader of setCookieHeaders) {
      if (typeof setCookieHeader === 'string' && setCookieHeader.length) {
        addCookieToJar(setCookieHeader, response.config.url);
      }
    }
  }
};

module.exports = {
  addRequestCookieInterceptor,
  addResponseCookieInterceptor
};
