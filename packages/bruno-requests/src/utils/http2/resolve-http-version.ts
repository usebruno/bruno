export const HTTP_VERSION_VALUES = ['auto', 'http1.1', 'http2'] as const;

type RequestLike = { settings?: { httpVersion?: string } | null } | null | undefined;

/**
 * Resolve the effective HTTP version for a request.
 * Precedence: request-level setting > collection-level setting > fallback. An 'inherit' or unset
 * value at a level defers to the next one. The fallback is the "global" level — the app preference
 * (desktop) or the --http-version flag (CLI) — and defaults to 'http1.1'.
 */
export const resolveHttpVersion = (
  request: RequestLike,
  collectionHttpVersion?: string | null,
  fallback?: string | null
): string => {
  const perRequest = request && request.settings && request.settings.httpVersion;
  if (perRequest && perRequest !== 'inherit') {
    return perRequest;
  }
  if (collectionHttpVersion && collectionHttpVersion !== 'inherit') {
    return collectionHttpVersion;
  }
  return fallback || 'http1.1';
};
