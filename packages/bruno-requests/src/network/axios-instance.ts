import http from 'node:http';
import https from 'node:https';
import { randomUUID } from 'node:crypto';
import { default as axios, AxiosRequestConfig, AxiosRequestHeaders, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { T_AxiosInstanceConfig, T_CertsAndProxyConfigResult, T_ModifiedAxiosResponse, T_ModifiedInternalAxiosRequestConfig } from './types';
import { setupProxyAgents } from './certs-and-proxy';
import createLogger, { T_LoggerInstance } from '../utils/logger';
const HTTP_AGENT_OPTIONS = { 
  keepAlive: true,
  keepAliveMsecs: 30000, // 30 seconds
  timeout: 60000, // 60 seconds
  maxSockets: 50, // Limit concurrent connections
  maxFreeSockets: 10 // Limit free sockets in pool
};

const HTTPS_AGENT_OPTIONS = { 
  keepAlive: true,
  keepAliveMsecs: 30000, // 30 seconds
  timeout: 60000, // 60 seconds
  maxSockets: 50, // Limit concurrent connections
  maxFreeSockets: 10, // Limit free sockets in pool
  ALPNProtocols: ['http/1.1'] // Only HTTP/1.1, no h2
};

/**
 * Creates a configured Axios instance with proxy/certs support and request/response logging
 * 
 * @param config - Configuration options for the Axios instance
 * @returns Configured Axios instance
 */
const makeAxiosInstance = ({ logId = 'request', certsAndProxyConfig = { proxyConfig: { mode: 'off' }, httpsAgentRequestFields: {} } }: T_AxiosInstanceConfig) => {
  const baseConfig = createBaseRequestConfig();

  const axiosInstance = axios.create(baseConfig);
  const timeline = createLogger(`${logId || 'request'}-${randomUUID()}`);

  // Setup interceptors
  const requestInterceptor = createRequestInterceptor(timeline, certsAndProxyConfig);
  axiosInstance.interceptors.request.use(requestInterceptor);

  const { onFulfilled, onRejected } = createResponseInterceptors(timeline, certsAndProxyConfig);
  axiosInstance.interceptors.response.use(onFulfilled, onRejected);

  return axiosInstance;
};

/**
 * Base request configuration
 */
const createBaseRequestConfig = (): Partial<AxiosRequestConfig> => ({
  proxy: false,
  // Standardized keep-alive settings
  httpAgent: new http.Agent(HTTP_AGENT_OPTIONS),
  httpsAgent: new https.Agent(HTTPS_AGENT_OPTIONS),
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
});

/**
 * Creates a request interceptor that handles timing and proxy setup
 */
const createRequestInterceptor = (timeline: T_LoggerInstance, certsAndProxyConfig: T_CertsAndProxyConfigResult) => {
  return (config: InternalAxiosRequestConfig): T_ModifiedInternalAxiosRequestConfig => {
    const modifiedConfig: T_ModifiedInternalAxiosRequestConfig = {
      ...config,
      startTime: Date.now(),
      certsAndProxyConfig
    };

    timeline.add('info', `Preparing request to ${config.url}`);

    try {
      setupProxyAgents({
        requestConfig: modifiedConfig,
        proxyConfig: certsAndProxyConfig.proxyConfig,
        httpsAgentRequestFields: certsAndProxyConfig.httpsAgentRequestFields || {},
        timeline
      });
    } catch (err: any) {
      timeline.add('error', `Error setting up proxy agents: ${err?.message}`);
      throw err; // Re-throw to prevent request from proceeding with invalid config
    }

    return modifiedConfig;
  };
};

/**
 * Creates response interceptors for success and error cases
 */
const createResponseInterceptors = (timeline: T_LoggerInstance, certsAndProxyConfig: T_CertsAndProxyConfigResult) => {
  const onFulfilled = (response: AxiosResponse): T_ModifiedAxiosResponse => {
    const config = response.config as T_ModifiedInternalAxiosRequestConfig;
    const startTime = config.startTime;
    const endTime = Date.now();
    const duration = endTime - startTime;

    timeline.add('response', `HTTP/${response.status} ${response.statusText}`);
    timeline.add('info', `Request completed in ${duration} ms`);

    config.timeline = timeline.getAll();
    timeline.reset();

    return {
      ...response,
      config,
      responseTime: duration
    };
  };

  const onRejected = async (error: any) => {
    if (!error.config) {
      error.config = {};
    }
    const config = error.config as T_ModifiedInternalAxiosRequestConfig;
    const startTime = config?.startTime;
    const endTime = Date.now();
    
    timeline.add('error', `Request failed: ${error.message}`);
    
    
    if (error.response) {
      const duration = startTime ? endTime - startTime : 0;
      timeline.add('response', `HTTP/${error.response.status} ${error.response.statusText}`);
      timeline.add('info', `Request completed with error in ${duration} ms`);
    } else if (error.request) {
      timeline.add('error', 'No response received from server');
      if (error.code) {
        timeline.add('error', `Error code: ${error.code}`);
      }
    } else {
      timeline.add('error', 'Request setup failed');
    }
    
    if (config) {
      config.timeline = timeline.getAll();
    }
    timeline.reset();
    return Promise.reject(error);
  };

  return { onFulfilled, onRejected };
};

export default makeAxiosInstance;