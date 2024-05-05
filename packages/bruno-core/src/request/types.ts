import { Dispatcher } from 'undici';
import { Timings } from './Timings';
import { DebugLogger } from './DebugLogger';
import { Timeline } from './Timeline';
import { Callbacks } from './Callbacks';
import { RequestOptions } from 'node:http';
import { TlsOptions } from 'node:tls';
import { CookieJar } from 'tough-cookie';

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
    }
  | {
      mode: 'graphql';
      graphql: {
        query: string;
        variables: string;
      };
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
  size: number;
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
  root?: {
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

// This should always be equal to `prefences.js` in bruno-electron
export type Preferences = {
  request: {
    sslVerification: boolean;
    customCaCertificate: {
      enabled: boolean;
      filePath: string | null;
    };
    keepDefaultCaCertificates: {
      enabled: boolean;
    };
    storeCookies: boolean;
    sendCookies: boolean;
    timeout: number;
  };
  font: {
    codeFont: string | null;
  };
  proxy: {
    enabled: boolean;
    protocol: 'http' | 'https' | 'socks4' | 'socks5';
    hostname: string;
    port: number | null;
    auth?: {
      enabled: boolean;
      username: string;
      password: string;
    };
    bypassProxy?: string;
  };
};

export type BrunoConfig = {
  version: '1';
  name: string;
  type: 'collection';
  ignore: string[];
  proxy?: {
    enabled: 'global' | true | false;
    protocol: 'https' | 'http' | 'socks4' | 'socks5';
    hostname: string;
    port: number | null;
    auth?: {
      enabled: boolean;
      username: string;
      password: string;
    };
    bypassProxy?: string;
  };
  clientCertificates?: {
    certs: {
      domain: string;
      certFilePath: string;
      keyFilePath: string;
      passphrase: string;
    }[];
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
  dataDir: string;
  nextRequestName?: string;
  abortController?: AbortController;
  cancelToken: string;

  requestItem: RequestItem;
  collection: Collection;
  prefences: Preferences;
  cookieJar: CookieJar;
  variables: {
    collection: Record<string, unknown>;
    environment: Record<string, unknown>;
    process: {
      process: {
        env: Record<string, string>;
      };
    };
  };

  callback: Callbacks;
  timings: Timings;
  debug: DebugLogger;
  timeline?: Timeline;

  httpRequest?: {
    options: RequestOptions & TlsOptions;
    body?: string | Buffer;
    redirectDepth: number;
  };

  response?: Response;
  error?: Error;
};
