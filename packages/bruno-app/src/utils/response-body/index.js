import { createResponseBodyClient, getResponseBodyClient } from './client';

/** Map IPC/network response into Redux-safe shape: never dataBuffer. */
export const mapNetworkResponseToRedux = (response = {}) => {
  if (!response || typeof response !== 'object') {
    return response;
  }

  const {
    dataBuffer, // eslint-disable-line no-unused-vars -- intentionally stripped
    ...rest
  } = response;

  return {
    ...rest,
    bodyRef: response.bodyRef || null,
    size: typeof response.size === 'number' ? response.size : 0
  };
};

export {
  createResponseBodyClient,
  getResponseBodyClient
};
