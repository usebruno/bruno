import { default as axios, AxiosRequestConfig, AxiosRequestHeaders, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import http from 'node:http';
import https from 'node:https';

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
  __headersToDelete?: string[];
};

type ModifiedAxiosResponse = AxiosResponse & {
  responseTime: number;
};

const baseRequestConfig: Partial<AxiosRequestConfig> = {
  proxy: false,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
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
};

const makeAxiosInstance = (customRequestConfig?: AxiosRequestConfig) => {
  customRequestConfig = customRequestConfig || {};
  const axiosInstance = axios.create({
    ...baseRequestConfig,
    ...customRequestConfig,
    headers: {}
  });

  axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    // Apply header deletions requested via req.deleteHeader() in pre-request scripts.
    const modConfig = config as ModifiedInternalAxiosRequestConfig;
    const headersToDelete = modConfig.__headersToDelete;
    if (headersToDelete && Array.isArray(headersToDelete)) {
      headersToDelete.forEach((headerName: string) => {
        const lower = headerName.toLowerCase();
        if (lower === 'host') return;
        if (lower === 'connection') {
          // connection is set by Node.js http.Agent at socket level, not by axios.
          // keepAlive:false means Node.js does not inject Connection:keep-alive.
          modConfig.httpAgent = new http.Agent({ keepAlive: false });
          modConfig.httpsAgent = new https.Agent({ keepAlive: false });
          return;
        }
        // Using set(name, null) rather than delete(): the axios http adapter guards its
        // own defaults (User-Agent, Accept-Encoding) with set(..., false) which only
        // skips writing when the key already exists. delete() removes the key entirely,
        // so the guard misses and the adapter re-adds the default. null keeps the key
        // present (blocking the guard) while toJSON() omits null values from the wire.
        config.headers.set(headerName, null);
      });
      delete modConfig.__headersToDelete;
    }

    const modifiedConfig: ModifiedInternalAxiosRequestConfig = {
      ...config,
      startTime: Date.now()
    };
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
