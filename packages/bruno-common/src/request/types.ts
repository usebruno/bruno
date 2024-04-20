import { Dispatcher } from 'undici';
import { Timings } from './Timings';
import { DebugLogger } from './DebugLogger';
import { Timeline } from './Timeline';
import { Callbacks } from './Callbacks';

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
      basic: {
        username: string;
        password: string;
      };
    }
  | {
      mode: 'bearer';
      bearer: {
        token: string;
      };
    }
  | {
      mode: 'digest';
      digest: {
        username: string;
        password: string;
      };
    }
  | {
      mode: 'awsv4';
      awsv4: {
        accessKeyId: string;
        secretAccessKey: string;
        sessionToken: string;
        service: string;
        region: string;
        profileName: string;
      };
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

export type RequestBody =
  | {
      mode: 'none';
    }
  | {
      mode: 'json';
      json: string | Record<string, unknown>;
    }
  | {
      mode: 'text';
      text: string;
    }
  | {
      mode: 'multipartForm';
      multipartForm: (
        | {
            name: string;
            value: string;
            enabled: boolean;
            type: 'text';
            uid: string;
          }
        | {
            name: string;
            value: string[];
            enabled: boolean;
            type: 'file';
            description: string;
            uid: string;
          }
      )[];
    }
  | {
      mode: 'formUrlEncoded';
      formUrlEncoded: {
        name: string;
        value: string;
        enabled: boolean;
        uid: string;
      }[];
    }
  | {
      mode: 'xml';
      xml: string;
    }
  | {
      mode: 'sparql';
      sparql: string;
    };

// This is the request Item from the App/.bru file
export type RequestItem = {
  uid: string;
  name: string;
  type: RequestType;
  seq: number;
  request: {
    method: Dispatcher.HttpMethod;
    url: string;
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
    body: RequestBody;
    script: {
      req?: string;
      res?: string;
    };
    vars: {
      req?: RequestVariable[];
      res?: RequestVariable[];
    };
    assertions: {
      enabled: boolean;
      name: string;
      value: string;
    }[];
    tests: string;
    docs: string;
    maxRedirects: number;
    timeout: number;
  };
  // e.g `my-requests.bru`
  filename: string;
  // e.g `/path/to/collection/and/my-requests.bru`
  pathname: string;
  draft: null | RequestItem;
  depth: number;
};

export type Response = {
  // Last/Final response headers
  headers: Record<string, string | string[] | undefined>;
  statusCode: number;
  responseTime: number;
  // Absolute path to response file
  path: string;
  encoding: BufferEncoding;
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
  brunoConfig: BrunoConfig;
  settingsSelectedTab: string;
  // Unix timestamp in milliseconds
  importedAt: number;
  // TODO: Check what this does
  lastAction: null | any;
  collapsed: boolean;
  environments: CollectionEnvironment[];
  root: {
    request?: {
      auth: AuthMode;
      headers: {
        name: string;
        value: string;
        enabled: boolean;
      }[];
      script: {
        req?: string;
        res?: string;
      };
      tests?: string;
    };
    docs: string;
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
    additionalContextRoots: string[];
    moduleWhitelist: string[];
    filesystemAccess: {
      allow: boolean;
    };
  };
};

export type RequestContext = {
  uid: string;
  requestItem: RequestItem;
  collection: Collection;
  callback: Callbacks;
  dataDir: string;
  nextRequestName?: string;
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
  undiciRequest?: {
    url: string;
    options: Dispatcher.RequestOptions;
  };
  timeline?: Timeline;
  response?: Response;
  error?: Error;
};

export type UndiciRequest = Exclude<RequestContext['undiciRequest'], undefined>;
