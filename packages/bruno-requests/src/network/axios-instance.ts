import { default as axios, AxiosRequestConfig, AxiosRequestHeaders } from 'axios';

/**
 * 
 * @param {Object} customRequestConfig options - partial AxiosRequestConfig
 * 
 * @returns {import('axios').AxiosInstance} Configured Axios instance
 * 
 * @example
 * const instance = makeAxiosInstance({
 *   maxRedirects: 0,
 *   proxy: false,
 *   headers: {
 *       "User-Agent": `bruno-runtime/_version_`
 *   },
 * });
 */

const baseRequestConfig: Partial<AxiosRequestConfig> = {
  transformRequest: function transformRequest(data: any, headers: AxiosRequestHeaders) {
    const contentType = headers.getContentType() || '';
    const hasJSONContentType = contentType.includes('json');
    if (typeof data === 'string' && hasJSONContentType) {
      return data;
    }

    if (Array.isArray(axios.defaults.transformRequest)) {
      axios.defaults.transformRequest.forEach((tr) => {
        data = tr.call(this, data, headers);
      });
    }

    return data;
  }
}

const makeAxiosInstance = (customRequestConfig?: AxiosRequestConfig) => {
  customRequestConfig = customRequestConfig || {};
  const axiosInstance = axios.create({
    ...baseRequestConfig,
    ...customRequestConfig
  });
  return axiosInstance;
};

export {
  makeAxiosInstance
};
