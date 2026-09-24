interface OpenApiSyncConfig {
  sourceUrl: string;
  groupBy?: 'tags' | 'path';
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
    ...(entry.lastSyncDate && { lastSyncDate: entry.lastSyncDate }),
    ...(entry.specHash && { specHash: entry.specHash }),
    autoCheck: entry.autoCheck !== false,
    autoCheckInterval: entry.autoCheckInterval || 5
  }));
};
