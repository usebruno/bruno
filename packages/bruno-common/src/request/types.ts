import { RequestInit } from 'undici';
import { Timings } from './Timings';
import { DebugLogger } from './DebugLogger';

export type RequestType = 'http-request' | 'graphql-request';

// This is the request Item from the App/.bru file
export type RequestItem = {
  uid: string;
  name: string;
  type: RequestType;
  seq: number;
  request: {
    method: string;
    url: string;
    // TODO
    params: {
      name: string;
      value: string;
    }[];
    headers: {
      name: string;
      value: string;
    }[];
    // TODO: Own type
    auth: {
      mode: 'none';
    };
    // TODO: Own type
    body: {
      mode: 'none';
    };
    script: {
      req?: string;
      res?: string;
    };
    vars: {
      // TODO
      req?: unknown[];
      res?: unknown[];
    };
    // TODO
    assertions: [];
    tests: string;
    docs: string;
  };
  // e.g `my-requests.bru`
  filename: string;
  // e.g `/path/to/collection/and/my-requests.bru`
  pathname: string;
  draft: null | RequestItem;
  depth: number;
};

export type FolderItem = {
  uid: string;
  name: string;
  // Absolute path to folder
  pathname: string;
  collapsed: boolean;
  type: 'folder';
  items: (RequestItem | FolderItem)[];
  depth: number;
};

export type CollectionVariables = Record<string, unknown>;

export type EnvironmentVariable = {
  name: string;
  uid: string;
  value: unknown;
  enabled: boolean;
  secret: boolean;
  // TODO: Are there more types
  type: 'text';
};

export type CollectionEnvironment = {
  name: string;
  uid: string;
  variables: EnvironmentVariable[];
};

export type Collection = {
  // e.g. '1'
  version: string;
  uid: string;
  name: string;
  // Full path to collection folder
  pathname: string;
  items: (RequestItem | FolderItem)[];
  collectionVariables: CollectionVariables;
  // Config json
  // TODO: Own type
  brunoConfig: BrunoConfig;
  settingsSelectedTab: string;
  // Unix timestamp in milliseconds
  importedAt: number;
  // TODO: Check what this does
  lastAction: null | any;
  collapsed: boolean;
  environments: CollectionEnvironment[];
};

export type BrunoConfig = {
  version: string;
  name: string;
  type: 'collection';
  ignore: string;
  scripts: {
    moduleWhitelist: string[];
    filesystemAccess: {
      allow: boolean;
    };
  };
};

export type RequestContext = {
  requestItem: RequestItem;
  collection: Collection;
  variables: {
    collection: Record<string, unknown>;
    environment: Record<string, unknown>;
    process: Record<string, unknown>;
  };
  timings: Timings;
  debug: DebugLogger;
  undiciRequest?: RequestInit;
  response?: any;
  error?: Error;
};
