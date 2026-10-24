/** The HTTP version modes a user can choose (the 'inherit' collection value defers to these). */
export const HTTP_VERSION_VALUES = ['auto', 'http1', 'http2'] as const;

export type HttpVersionValue = (typeof HTTP_VERSION_VALUES)[number];

/**
 * Resolve the HTTP version from the collection setting or fallback.
 * Defaults to 'http1' when neither is valid.
 *
 * Precedence: Desktop uses collection > app; CLI uses flag > collection.
 */
const isHttpVersionValue = (value: unknown): value is HttpVersionValue =>
  HTTP_VERSION_VALUES.includes(value as HttpVersionValue);

export const resolveHttpVersion = (
  collectionHttpVersion?: string | null,
  fallback?: string | null
): HttpVersionValue => {
  if (collectionHttpVersion && collectionHttpVersion !== 'inherit' && isHttpVersionValue(collectionHttpVersion)) {
    return collectionHttpVersion;
  }
  if (isHttpVersionValue(fallback)) {
    return fallback;
  }
  return 'http1';
};
