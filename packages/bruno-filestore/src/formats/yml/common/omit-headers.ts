/**
 * Normalize omitHeaders from YAML / in-memory settings into a clean string[].
 * Returns undefined when there is nothing to persist.
 * OpenCollection HttpRequestSettings may not declare omitHeaders yet; YAML can still carry it.
 */
export const normalizeOmitHeaders = (omitHeaders: unknown): string[] | undefined => {
  if (!Array.isArray(omitHeaders) || !omitHeaders.length) {
    return undefined;
  }

  const names = omitHeaders
    .map((name) => (typeof name === 'string' ? name.trim() : ''))
    .filter((name) => name.length > 0);

  return names.length ? names : undefined;
};
