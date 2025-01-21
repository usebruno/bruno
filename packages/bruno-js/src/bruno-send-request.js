const { makeAxiosInstance } = require('./axios-instance');

class BrunoRequest {
  constructor() {
    this.axiosInstance = makeAxiosInstance();
  }

  async sendRequestWithPromise(requestConfig, interpolateFn) {
    try {
      const config = typeof requestConfig === 'string' 
        ? { url: requestConfig, method: 'GET' } 
        : { ...requestConfig };

      if (config.body) {
        config.data = config.body;
        delete config.body;
      }

      config.url = interpolateFn(config.url);
      
      if (config.data) {
        if (typeof config.data === 'string') {
          config.data = interpolateFn(config.data);
        } else if (typeof config.data === 'object') {
          config.data = JSON.parse(interpolateFn(JSON.stringify(config.data)));
        }
      }

      const response = await this.axiosInstance(config);
      
      return {
        code: response.status,
        status: response.statusText,
        headers: response.headers,
        body: response.data
      };
    } catch (error) {
      if (error.response) {
        return {
          code: error.response.status,
          status: error.response.statusText,
          headers: error.response.headers,
          body: error.response.data
        };
      }
      throw error;
    }
  }

  sendRequestWithCallback(requestConfig, callback, interpolateFn) {
    this.sendRequestWithPromise(requestConfig, interpolateFn)
      .then(response => callback(null, response))
      .catch(error => callback(error, null));
  }
}

module.exports = BrunoRequest;
