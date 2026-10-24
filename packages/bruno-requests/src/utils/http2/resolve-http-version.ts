export const HTTP_VERSION_VALUES = ['auto', 'http1.1', 'http2'] as const;

/**
 * Resolve the effective HTTP version for a request.
 * Precedence: collection-level setting > fallback. An 'inherit' or unset collection value defers
 * to the fallback. The fallback is the "global" level — the app preference (desktop) or the
 * --http-version flag (CLI) — and defaults to 'http1.1'.
 */
export const resolveHttpVersion = (
  collectionHttpVersion?: string | null,
  fallback?: string | null
): string => {
  if (collectionHttpVersion && collectionHttpVersion !== 'inherit') {
    return collectionHttpVersion;
  }
  return fallback || 'http1.1';
};
