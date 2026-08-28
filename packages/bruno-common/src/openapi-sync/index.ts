interface OpenApiSyncConfig {
  sourceUrl: string;
  groupBy?: 'tags' | 'path';
  lastSyncDate?: string;
  specHash?: string;
  autoCheck: boolean;
  autoCheckInterval: number;
}

export const normalizeOpenApiSyncConfigs = (entries: unknown): OpenApiSyncConfig[] => {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .filter((entry) => entry !== null && typeof entry === 'object')
    .map((entry) => ({
      sourceUrl: entry.sourceUrl,
      groupBy: entry.groupBy,
      ...(entry.lastSyncDate && { lastSyncDate: entry.lastSyncDate }),
      ...(entry.specHash && { specHash: entry.specHash }),
      autoCheck: entry.autoCheck !== false,
      autoCheckInterval: entry.autoCheckInterval || 5
    }));
};
