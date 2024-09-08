const axios = require('axios');
const { getBaseAgents } = require('./http-agent-util');



/**
 * Function that configures axios with timing interceptors
 * Important to note here that the timings are not completely accurate.
 * @see https://github.com/axios/axios/issues/695
 * @param {{useCookies: boolean}} options Configuration options
 * @returns {axios.AxiosInstance}
 */
function makeAxiosInstance(options) {
  /** @type {axios.AxiosInstance} */
  const instance = axios.create(getBaseAgents(options));

  instance.interceptors.request.use((config) => {
    config.headers['request-start-time'] = Date.now();
    return config;
  });

  instance.interceptors.response.use(
    (response) => {
      const end = Date.now();
      const start = response.config.headers['request-start-time'];
      response.headers['request-duration'] = end - start;
      return response;
    },
    (error) => {
      if (error.response) {
        const end = Date.now();
        const start = error.config.headers['request-start-time'];
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
