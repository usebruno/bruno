import type { App as BrunoApp } from '@usebruno/schema-types/collection/item';

export interface OpenCollectionApp {
  enabled?: boolean;
  code?: string;
}

export const toOpenCollectionApp = (app: BrunoApp | null | undefined): OpenCollectionApp | undefined => {
  if (!app || !app.code) return undefined;
  const ocApp: OpenCollectionApp = {};
  if (app.enabled === true) {
    ocApp.enabled = true;
  }
  ocApp.code = app.code;
  return ocApp;
};

export const toBrunoApp = (app: OpenCollectionApp | null | undefined): BrunoApp | null => {
  if (!app) return null;
  return {
    enabled: app.enabled === true,
    code: app.code || null
  };
};
