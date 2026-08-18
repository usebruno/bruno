import { isOpenCollectionLayout, type CollectionLayout } from '@usebruno/common';

/**
 * On-disk format of a collection's files — the same thing `@usebruno/common` calls a layout.
 *
 * `'yml'` and `'yaml'` are the same OpenCollection YAML under two extensions, so both are handled
 * by the `yml` serializer. Use {@link isYamlFormat} to branch, never `=== 'yml'`, so a `.yaml`
 * collection is never mistaken for a `.bru` one.
 */
export type CollectionFormat = CollectionLayout;

/** True for both spellings of OpenCollection YAML. */
export const isYamlFormat = isOpenCollectionLayout;

export interface ParseOptions {
  format?: CollectionFormat;
}

export interface StringifyOptions {
  format?: CollectionFormat;
}

export interface WorkerTask {
  data: any;
  priority: number;
  scriptPath: string;
  taskType?: 'parse' | 'stringify';
  resolve?: (value: any) => void;
  reject?: (reason?: any) => void;
}

export interface Lane {
  maxSize: number;
}

export interface BrunoPresetsExtension {
  request?: {
    type?: string;
    url?: string;
  };
  defaultEnvironment?: string;
}
