export const AUTH_PLACEMENTS = ['request', 'collection'] as const;

export const REQUEST_NAME_SOURCES = ['summary', 'operationId', 'description', 'path'] as const;

type AuthPlacement = typeof AUTH_PLACEMENTS[number];

type RequestNameSource = typeof REQUEST_NAME_SOURCES[number];

interface OpenApiSyncConfig {
  sourceUrl: string;
  groupBy?: 'tags' | 'path';
  authPlacement?: AuthPlacement;
  requestNameSource?: RequestNameSource;
  lastSyncDate?: string;
  specHash?: string;
  autoCheck: boolean;
  autoCheckInterval: number;
}

const SUPPORTED_GROUP_BY = ['tags', 'path'];

const isUsableEntry = (entry: any): boolean =>
  entry !== null
  && typeof entry === 'object'
  && typeof entry.sourceUrl === 'string'
  && entry.sourceUrl !== '';

export const normalizeOpenApiSyncConfigs = (entries: unknown): OpenApiSyncConfig[] => {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.filter(isUsableEntry).map((entry) => ({
    sourceUrl: entry.sourceUrl,
    ...(SUPPORTED_GROUP_BY.includes(entry.groupBy) && { groupBy: entry.groupBy }),
    ...(AUTH_PLACEMENTS.includes(entry.authPlacement) && { authPlacement: entry.authPlacement }),
    ...(REQUEST_NAME_SOURCES.includes(entry.requestNameSource) && { requestNameSource: entry.requestNameSource }),
    ...(entry.lastSyncDate && { lastSyncDate: entry.lastSyncDate }),
    ...(entry.specHash && { specHash: entry.specHash }),
    autoCheck: entry.autoCheck !== false,
    autoCheckInterval: entry.autoCheckInterval || 5
  }));
};
