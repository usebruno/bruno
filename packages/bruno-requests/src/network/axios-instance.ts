import { default as axios, AxiosRequestConfig, AxiosRequestHeaders, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

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

type ModifiedInternalAxiosRequestConfig = InternalAxiosRequestConfig & {
  startTime: number;
}

type ModifiedAxiosResponse = AxiosResponse & {
  responseTime: number;
}

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

  axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const modifiedConfig: ModifiedInternalAxiosRequestConfig = {
      ...config,
      startTime: Date.now()
    }
    return modifiedConfig;
  });

  axiosInstance.interceptors.response.use((response: AxiosResponse) => {
    const config = response.config as ModifiedInternalAxiosRequestConfig;
    const startTime = config.startTime;
    const endTime = Date.now();
    const modifiedResponse: ModifiedAxiosResponse = {
      ...response,
      responseTime: endTime - startTime
    };
    return modifiedResponse;
  });

  return axiosInstance;
};

export {
  makeAxiosInstance
};
