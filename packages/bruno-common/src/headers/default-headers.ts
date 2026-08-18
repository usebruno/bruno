export type BrunoDefaultHeaderSource = 'bruno' | 'axios' | 'node';

export type BrunoDefaultHeader = {
  name: string;
  /** Value shown in the Headers UI. */
  previewValue?: string;
  /** False for required defaults such as Host. */
  omittable: boolean;
  source: BrunoDefaultHeaderSource;
};

/** Headers Bruno, Axios, or Node add automatically on HTTP sends. */
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
  /** True when Connection should be stripped after agents are attached. */
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
 * Drop auto-added headers from an Axios request.
 * Host is never omitted. User-set headers win over omitHeaders.
 * Script deleteHeader always wins. Connection is left for the caller.
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

    // Keep user-set headers; script deleteHeader still clears them.
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

/** User-Agent Bruno sends by default. */
export const getBrunoRuntimeUserAgent = (version: string): string =>
  `bruno-runtime/${version || ''}`;
