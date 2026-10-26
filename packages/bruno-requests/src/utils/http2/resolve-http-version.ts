import { HttpVersionMode, HttpVersionSetting, isHttpVersionMode } from '@usebruno/common';

/**
 * Resolve the HTTP version from the collection setting or fallback.
 * Defaults to 'http1' when neither is valid.
 *
 * Precedence: Desktop uses collection > app, CLI uses flag > collection.
 */
export const resolveHttpVersion = (
  collectionHttpVersion?: string | null,
  fallback?: string | null
): HttpVersionMode => {
  if (collectionHttpVersion !== HttpVersionSetting.Inherit && isHttpVersionMode(collectionHttpVersion)) {
    return collectionHttpVersion;
  }
  if (isHttpVersionMode(fallback)) {
    return fallback;
  }
  return HttpVersionMode.Http1;
};
