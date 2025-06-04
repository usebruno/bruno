const axios = require('axios');
const { CLI_VERSION } = require('../constants');

/**
 * Function that configures axios with timing interceptors
 * Important to note here that the timings are not completely accurate.
 * @see https://github.com/axios/axios/issues/695
 * @returns {axios.AxiosInstance}
 */
function makeAxiosInstance() {
  /** @type {axios.AxiosInstance} */
  const instance = axios.create({
    proxy: false,
    headers: {
      "User-Agent": `bruno-runtime/${CLI_VERSION}`
    }
  });

  instance.interceptors.request.use((config) => {
    // Store request start time in config instead of headers to avoid server validation issues
    config.requestStartTime = Date.now();
    return config;
  });

  instance.interceptors.response.use(
    (response) => {
      const end = Date.now();
      const start = response.config.requestStartTime;
      response.headers['request-duration'] = end - start;
      return response;
    },
    (error) => {
      if (error.response) {
        const end = Date.now();
        const start = error.config.requestStartTime;
        error.response.headers['request-duration'] = end - start;
      }
      return Promise.reject(error);
    }
  );

  return instance;
}

module.exports = {
  makeAxiosInstance
};
