import http from 'node:http';
import https from 'node:https';
import type { ClientRequest, RequestOptions } from 'node:http';

type AxiosLikeHeaders = {
  set: (name: string, value: unknown) => void;
};

type Transport = {
  request: (options: RequestOptions, callback?: (res: http.IncomingMessage) => void) => ClientRequest;
};

type AxiosConfigLike = {
  headers?: AxiosLikeHeaders;
  transport?: Transport;
  url?: string;
};

/**
 * Keep Connection off the wire. Node keep-alive agents add it after Axios
 * prepares headers, so also removeHeader on the ClientRequest.
 */
export const applyOmitConnectionToAxiosConfig = (config: AxiosConfigLike): void => {
  if (!config?.headers || typeof config.headers.set !== 'function') {
    return;
  }

  config.headers.set('Connection', null);

  const isHttps = /^https:/i.test(config.url || '');
  const nativeTransport: Transport = isHttps ? https : http;
  const upstream = config.transport || nativeTransport;

  config.transport = {
    request(options, callback) {
      const req = upstream.request(options, callback);
      req.removeHeader('connection');
      return req;
    }
  };
};
