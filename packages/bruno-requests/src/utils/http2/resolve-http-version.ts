/** The HTTP version modes a user can choose (the 'inherit' collection value defers to these). */
export const HTTP_VERSION_VALUES = ['auto', 'http1', 'http2'] as const;

export type HttpVersionValue = (typeof HTTP_VERSION_VALUES)[number];

/**
 * Get the HTTP version mode for a request.
 *
 * The collection setting takes priority over the app preference or CLI flag.
 * If it's unset or set to 'inherit', use the fallback. Defaults to 'http1'.
 */
export const resolveHttpVersion = (
  collectionHttpVersion?: string | null,
  fallback?: string | null
): string => {
  if (collectionHttpVersion && collectionHttpVersion !== 'inherit') {
    return collectionHttpVersion;
  }

  return fallback || 'http1';
};
