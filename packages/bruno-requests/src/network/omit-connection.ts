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
  // Ignore an HTTP/2 transport from a previous request or redirect.
  // Each request selects its own transport.
  const existing = config.transport as (Transport & { __bruno_http2?: boolean }) | undefined;
  const upstream = existing && !existing.__bruno_http2 ? existing : nativeTransport;

  config.transport = {
    request(options, callback) {
      const req = upstream.request(options, callback);
      req.removeHeader('connection');
      return req;
    }
  };
};
