export type CollectionFormat = 'bru' | 'yml';

export interface ParseOptions {
  format?: CollectionFormat;
}

export interface StringifyOptions {
  format?: CollectionFormat;
}

export interface WriteCollectionOptions {
  format?: CollectionFormat;
}

export interface BrunoPresetsExtension {
  request?: {
    type?: string;
    url?: string;
  };
  defaultEnvironment?: string;
}
