import type { AxiosInstance } from 'axios';

const NGHTTP2_REFUSED_STREAM = 7;

export const isRetryableHttp2Error = (error: any): boolean => {
  if (!error) return false;
  const rstCode = error.rstCode ?? error.request?.rstCode ?? error.response?.request?.rstCode;

  return rstCode === NGHTTP2_REFUSED_STREAM;
};

/**
 * Check whether the request body can be sent again.
 * Streams cannot be replayed because they may have already been consumed.
 */
export const isReplayableBody = (data: unknown): boolean => {
  if (data == null || typeof data === 'string') return true;
  if (Buffer.isBuffer(data)) return true;
  if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) return true;

  return typeof (data as { pipe?: unknown }).pipe !== 'function';
};

/**
 * Retry HTTP/2 requests when the server refuses a stream.
 * Retries are limited to REFUSED_STREAM errors with replayable bodies.
 */
export const addHttp2RetryInterceptor = (instance: AxiosInstance, maxRetries = 1): void => {
  instance.interceptors.response.use(undefined, (error: any) => {
    const config = error?.config;

    if (!config) {
      return Promise.reject(error);
    }

    const retryCount = config.__http2RetryCount ?? 0;

    const canRetry
      = retryCount < maxRetries
        && isRetryableHttp2Error(error)
        && isReplayableBody(config.data);

    if (!canRetry) {
      return Promise.reject(error);
    }

    config.__http2RetryCount = retryCount + 1;

    return instance(config);
  });
};
