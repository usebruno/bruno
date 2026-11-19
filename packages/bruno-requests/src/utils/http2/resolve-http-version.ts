import { HttpVersionMode, isHttpVersionMode } from '@usebruno/common';

/**
 * Resolve the HTTP version in order: request, collection, then app preference.
 * Skip inherited or invalid values. Default to HTTP/1 if none is set.
 */
export const resolveHttpVersion = (
  requestHttpVersion?: string | null,
  collectionHttpVersion?: string | null,
  fallback?: string | null
): HttpVersionMode => {
  if (isHttpVersionMode(requestHttpVersion)) {
    return requestHttpVersion;
  }

  if (isHttpVersionMode(collectionHttpVersion)) {
    return collectionHttpVersion;
  }

  if (isHttpVersionMode(fallback)) {
    return fallback;
  }

  return HttpVersionMode.Http1;
};
