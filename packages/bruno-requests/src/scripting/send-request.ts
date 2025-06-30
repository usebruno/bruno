import { AxiosRequestConfig } from 'axios';
import makeAxiosInstance from '../network/axios-instance';
import { T_CertsAndProxyConfigResult } from '../network/types';

type T_SendRequestCallback = (error: any, response: any) => void;

const createSendRequestHandler = ({ certsAndProxyConfig }: { certsAndProxyConfig: T_CertsAndProxyConfigResult }) => {
  return async (requestConfig: AxiosRequestConfig, callback: T_SendRequestCallback) => {
    const axiosInstance = makeAxiosInstance({ logId: 'send-request', certsAndProxyConfig });
    if (!callback) {
      return await axiosInstance(requestConfig);
    }
    try {
      const response = await axiosInstance(requestConfig);
      try {
        await callback(null, response);
        return response;
      }
      catch(error) {
        (error as any).config = (response as any).config;
        return Promise.reject(error);
      }
    }
    catch (error) {
      try {
        await callback(error, null);
        (error as any).silent = true;
        return Promise.reject(error);
      }
      catch(err) {
        (error as any).message = (err as any).message;
        return Promise.reject(error);
      }
    }
  }
};

export default createSendRequestHandler;
