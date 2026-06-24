import type { App as BrunoApp } from '@usebruno/schema-types/collection/item';

export interface OpenCollectionApp {
  code?: string;
}

export const toOpenCollectionApp = (app: BrunoApp | null | undefined): OpenCollectionApp | undefined => {
  if (!app || !app.code) return undefined;
  return { code: app.code };
};

export const toBrunoApp = (app: OpenCollectionApp | null | undefined): BrunoApp | null => {
  if (!app) return null;
  return {
    enabled: false,
    code: app.code || null
  };
};
