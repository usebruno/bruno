const { makeAxiosInstance } = require('./axios-instance');
const { addDigestInterceptor } = require('./digestauth-helper');

class BrunoRequest {
  constructor() {
    this.axiosInstance = makeAxiosInstance();
  }

  _processAuth(config) {
    if (!config.auth) return config;

    switch (config.auth.type?.toLowerCase()) {
      case 'basic': {
        // Simplified auth structure
        const { username, password } = config.auth.basic || {};
        
        if (username && password) {
          config.auth = {
            username,
            password
          };
          
          // Add Authorization header
          if (!config.headers) config.headers = {};
          const authString = Buffer.from(`${config.auth.username}:${config.auth.password}`).toString('base64');
          config.headers['Authorization'] = `Basic ${authString}`;
        }
        break;
      }
      
      case 'digest': {
        const { username, password } = config.auth.digest || {};
        
        if (username && password) {
          config.digestConfig = {
            username,
            password
          };
          
          // Add digest interceptor
          addDigestInterceptor(this.axiosInstance, config);

          // Remove auth property since we're using digestConfig
          delete config.auth;
        }
        break;
      }
    }

    return config;
  }

  _processRequestBody(config) {
    if (!config.body) return config;

    const { mode, ...bodyData } = config.body;
    
    switch (mode) {
      case 'urlencoded': {
        const formData = new URLSearchParams();
        if (Array.isArray(bodyData.urlencoded)) {
          bodyData.urlencoded.forEach(param => {
            formData.append(
              param.key, 
              param.value
            );
          });
        }
        config.data = formData;
        if (!config.headers) config.headers = {};
        config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        break;
      }
      
      case 'raw': {
        let rawData = bodyData.raw;
        if (typeof rawData === 'string') {
          try {
            // Try parsing as JSON first
            const parsed = JSON.parse(rawData);
            config.data = JSON.parse(JSON.stringify(parsed));
          } catch {
            // If not JSON, treat as regular string
            config.data = rawData;
          }
        } else {
          config.data = rawData;
        }
        if (!config.headers) config.headers = {};
        config.headers['Content-Type'] = 'application/json';
        break;
      }
      
      default: {
        config.data = config.body;
      }
    }

    delete config.body;
    return config;
  }

  _formatResponse(response) {
    const formatted = {
      code: response.status,
      status: response.statusText,
      headers: response.headers,
      body: response.data,
      data: response.data,
    };

    // Handle form data responses
    if (response.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
      formatted.form = {};
      if (typeof response.data === 'string') {
        const params = new URLSearchParams(response.data);
        params.forEach((value, key) => {
          formatted.form[key] = value;
        });
      }
    }

    return formatted;
  }

  async sendRequestWithPromise(requestConfig) {
    try {
      const config = typeof requestConfig === 'string' 
        ? { url: requestConfig, method: 'GET' } 
        : { ...requestConfig };

      config.url = config.url;

      // Process authentication
      this._processAuth(config);
      
      // Process request body based on mode
      this._processRequestBody(config);

      const response = await this.axiosInstance(config);
      return this._formatResponse(response);
    } catch (error) {
      if (error.response) {
        return this._formatResponse(error.response);
      }
      throw error;
    }
  }

  sendRequestWithCallback(requestConfig, callback) {
    this.sendRequestWithPromise(requestConfig)
      .then(response => callback(null, response))
      .catch(error => callback(error, null));
  }
}

module.exports = BrunoRequest;