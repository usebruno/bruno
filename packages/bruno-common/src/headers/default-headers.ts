export type BrunoDefaultHeaderSource = 'bruno' | 'axios' | 'node';

export type BrunoDefaultHeader = {
  name: string;
  /** Static preview shown in the Headers UI when no dynamic value is needed. */
  previewValue?: string;
  /** Whether the Headers UI should allow omitting this default. */
  omittable: boolean;
  source: BrunoDefaultHeaderSource;
};

/**
 * Catalog of headers Bruno / Axios / Node may add automatically on HTTP sends.
 * Used by the GUI for preview rows and by the runtime omit path for known names.
 * Not HTTP-product-gated here so GraphQL (same Axios stack) can reuse later.
 */
export const BRUNO_DEFAULT_HEADERS: BrunoDefaultHeader[] = [
  {
    name: 'User-Agent',
    previewValue: 'bruno-runtime/<version>',
    omittable: true,
    source: 'bruno'
  },
  {
    name: 'Accept',
    previewValue: 'application/json, text/plain, */*',
    omittable: true,
    source: 'axios'
  },
  {
    name: 'Accept-Encoding',
    previewValue: 'gzip, compress, deflate, br',
    omittable: true,
    source: 'axios'
  },
  {
    name: 'request-start-time',
    previewValue: 'set at runtime',
    omittable: true,
    source: 'bruno'
  },
  {
    name: 'Connection',
    previewValue: 'keep-alive',
    omittable: true,
    source: 'node'
  },
  {
    name: 'Host',
    previewValue: 'derived from URL',
    omittable: false,
    source: 'node'
  }
];

export const getBrunoDefaultHeaderNames = (): string[] =>
  BRUNO_DEFAULT_HEADERS.map((header) => header.name);

export type ApplyOmitHeadersResult = {
  /** Connection must be cleared after keep-alive agents are attached. */
  omitConnection: boolean;
};

type AxiosLikeHeaders = {
  set: (name: string, value: unknown) => void;
};

const normalizeHeaderNameList = (names?: string[] | null): string[] => {
  if (!Array.isArray(names) || !names.length) {
    return [];
  }

  return names
    .map((name) => (typeof name === 'string' ? name.trim() : ''))
    .filter((name) => name.length > 0);
};

/**
 * Suppress Bruno/Axios/Node default headers on an Axios request config.
 *
 * Uses `headers.set(name, null)` so the Axios adapter does not re-add defaults
 * (same pattern as `req.deleteHeader`).
 *
 * - `Host` is never omitted (HTTP/1.1 requirement).
 * - Names in `explicitHeaderNames` are user/inherited headers and are not omitted
 *   via `omitHeaders` (override wins). Script `headersToDelete` still clears them.
 * - `Connection` returns `omitConnection: true` for the caller to apply after agents.
 */
export const applyOmitHeaders = (
  headers: AxiosLikeHeaders,
  {
    omitHeaders,
    headersToDelete,
    explicitHeaderNames
  }: {
    omitHeaders?: string[] | null;
    headersToDelete?: string[] | null;
    explicitHeaderNames?: string[] | null;
  } = {}
): ApplyOmitHeadersResult => {
  const explicit = new Set(
    normalizeHeaderNameList(explicitHeaderNames).map((name) => name.toLowerCase())
  );
  const deleteSet = new Set(
    normalizeHeaderNameList(headersToDelete).map((name) => name.toLowerCase())
  );
  const omitSet = new Set(
    normalizeHeaderNameList(omitHeaders).map((name) => name.toLowerCase())
  );

  const namesToClear = new Set<string>([...omitSet, ...deleteSet]);
  let omitConnection = false;

  namesToClear.forEach((lowerName) => {
    if (lowerName === 'host') {
      return;
    }

    // omitHeaders only suppresses auto-defaults; explicit user/inherited headers win.
    // headersToDelete (scripts) always clears.
    if (omitSet.has(lowerName) && !deleteSet.has(lowerName) && explicit.has(lowerName)) {
      return;
    }

    if (lowerName === 'connection') {
      omitConnection = true;
      return;
    }

    headers.set(lowerName, null);
  });

  return { omitConnection };
};

/**
 * Build the User-Agent default Bruno would send.
 */
export const getBrunoRuntimeUserAgent = (version: string): string =>
  `bruno-runtime/${version || ''}`;
