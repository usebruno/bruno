import { RequestInit } from 'undici';
import { Timings } from './Timings';
import { DebugLogger } from './DebugLogger';

export type RequestType = 'http-request' | 'graphql-request';

export type RequestVariable = {
  name: string;
  value: string;
  enabled: boolean;
};

export type AuthMode =
  | {
      mode: 'none';
    }
  | {
      mode: 'inherit';
    }
  | {
      mode: 'basic';
      username: string;
      password: string;
    }
  | {
      mode: 'bearer';
      token: string;
    }
  | {
      mode: 'digest';
      token: string;
    }
  | {
      mode: 'awsv4';
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken: string;
      service: string;
      region: string;
      profileName: string;
    }
  | {
      mode: 'oauth2';
      grantType: 'authorization_code';
      callbackUrl: string;
      authorizationUrl: string;
      accessTokenUrl: string;
      clientId: string;
      clientSecret: string;
      scope: string;
      pkce: boolean;
    }
  | {
      mode: 'oauth2';
      grantType: 'client_credentials';
      accessTokenUrl: string;
      clientId: string;
      clientSecret: string;
      scope: string;
    }
  | {
      mode: 'oauth2';
      grantType: 'password';
      accessTokenUrl: string;
      username: string;
      password: string;
      scope: string;
    };

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
      enabled: boolean;
    }[];
    headers: {
      name: string;
      value: string;
      enabled: boolean;
    }[];
    auth: AuthMode;
    // TODO: Own type
    body: {
      mode: 'none' | 'json';
    };
    data: unknown;
    script: {
      req?: string;
      res?: string;
    };
    vars: {
      req?: RequestVariable[];
      res?: RequestVariable[];
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
  request: {
    // TODO: Own types to sync with request
    auth: {
      mode: AuthMode;
    };
    headers: {
      name: string;
      value: string;
      enabled: boolean;
    }[];
    script: {
      req?: string;
      res?: string;
    };
  };
};

export type BrunoConfig = {
  version: string;
  name: string;
  type: 'collection';
  ignore: string[];
  proxy?: {
    enabled: 'global' | 'enabled' | 'disabled';
    protocol: 'https' | 'http';
    hostname: string;
    port: number;
    auth: {
      enabled: boolean;
      username: string;
      password: string;
    };
    bypassProxy: string;
  };
  scripts: {
    moduleWhitelist: string[];
    filesystemAccess: {
      allow: boolean;
    };
  };
};

// TODO: add nextRequestName
export type RequestContext = {
  requestItem: RequestItem;
  collection: Collection;
  variables: {
    collection: Record<string, unknown>;
    environment: Record<string, unknown>;
    process: {
      process: {
        env: Record<string, string>;
      };
    };
  };
  timings: Timings;
  debug: DebugLogger;
  undiciRequest?: RequestInit;
  response?: any;
  error?: Error;
};
