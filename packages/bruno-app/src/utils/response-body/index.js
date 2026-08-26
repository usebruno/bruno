import { createResponseBodyClient, getResponseBodyClient } from './client';
import { mediaUrlFor } from './media-url';
import { createWindowedTextModel } from './windowed-text';
import { useResponseBodyWindow } from './useResponseBodyWindow';
import {
  pinBodyRef,
  releaseBodyPin,
  pinResponseForTimeline,
  releaseTimelineBodyPins
} from './pins';

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
    bodyStorage: response.bodyStorage || null,
    size: typeof response.size === 'number' ? response.size : 0
  };
};

export {
  createResponseBodyClient,
  getResponseBodyClient,
  mediaUrlFor,
  createWindowedTextModel,
  useResponseBodyWindow,
  pinBodyRef,
  releaseBodyPin,
  pinResponseForTimeline,
  releaseTimelineBodyPins
};
