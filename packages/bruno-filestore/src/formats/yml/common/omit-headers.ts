/** Trim omitHeaders; return undefined when there is nothing to save. */
export const normalizeOmitHeaders = (omitHeaders: unknown): string[] | undefined => {
  if (!Array.isArray(omitHeaders) || !omitHeaders.length) {
    return undefined;
  }

  const names = omitHeaders
    .map((name) => (typeof name === 'string' ? name.trim() : ''))
    .filter((name) => name.length > 0);

  return names.length ? names : undefined;
};
