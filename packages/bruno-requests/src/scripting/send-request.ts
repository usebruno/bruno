import { AxiosRequestConfig } from 'axios';
import { makeAxiosInstance } from '../network';
import { getHttpHttpsAgents } from '../utils/http-https-agents';
import type { GetHttpHttpsAgentsParams } from '../utils/http-https-agents';

type T_SendRequestCallback = (error: any, response: any) => void;

/**
 * Configuration for creating a sendRequest function with proxy/certs support.
 * This is the same config used by getHttpHttpsAgents, minus requestUrl which is
 * extracted from the actual request.
 */
type SendRequestConfig = Omit<GetHttpHttpsAgentsParams, 'requestUrl'>;

/**
 * Creates a sendRequest function configured with proxy and certificate settings.
 * This allows bru.sendRequest to use the same proxy/certs config as the main request.
 *
 * @param config - Configuration for proxy, certs, and TLS options (same as getHttpHttpsAgents)
 * @returns A sendRequest function that applies the config to each request
 */
const createSendRequest = (config?: SendRequestConfig) => {
  return async (requestConfig: AxiosRequestConfig | string, callback?: T_SendRequestCallback) => {
    // Handle case where requestConfig is a URL string
    const normalizedConfig: AxiosRequestConfig = typeof requestConfig === 'string'
      ? { url: requestConfig }
      : { ...requestConfig };

    // If config is provided, create agents with the request URL for proper proxy bypass
    if (config) {
      const requestUrl = normalizedConfig.url;

      const { httpAgent, httpsAgent } = await getHttpHttpsAgents({
        ...config,
        requestUrl
      });

      // Apply agents if not explicitly set in normalizedConfig
      if (httpAgent && !normalizedConfig.httpAgent) {
        normalizedConfig.httpAgent = httpAgent;
      }
      if (httpsAgent && !normalizedConfig.httpsAgent) {
        normalizedConfig.httpsAgent = httpsAgent;
      }
    }

    const axiosInstance = makeAxiosInstance();

    if (!callback) {
      return await axiosInstance(normalizedConfig);
    }

    try {
      const response = await axiosInstance(normalizedConfig);
      try {
        await callback(null, response);
        return response;
      } catch (error) {
        return Promise.reject(error);
      }
    } catch (error) {
      try {
        await callback(error, null);
      } catch (err) {
        return Promise.reject(err);
      }
    }
  };
};

// Default sendRequest without config (for backward compatibility)
const sendRequest = createSendRequest();

export default sendRequest;
export { createSendRequest };
export type { SendRequestConfig };
