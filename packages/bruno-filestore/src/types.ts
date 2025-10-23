export interface ParseOptions {
  format?: 'bru' | 'yaml';
}

export interface StringifyOptions {
  format?: 'bru' | 'yaml';
}

export interface RequestBody {
  mode?: string;
  raw?: string;
  formUrlEncoded?: Array<{ name: string; value: string; enabled: boolean }>;
  multipartForm?: Array<{ name: string; value: string; type: string; enabled: boolean }>;
  json?: string;
  xml?: string;
  sparql?: string;
  graphql?: {
    query?: string;
    variables?: string;
  };
}

export interface AuthConfig {
  mode?: string;
  basic?: {
    username?: string;
    password?: string;
  };
  bearer?: {
    token?: string;
  };
  apikey?: {
    key?: string;
    value?: string;
    placement?: string;
  };
  awsv4?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
    service?: string;
    region?: string;
    profileName?: string;
  };
  oauth2?: {
    grantType?: string;
    callbackUrl?: string;
    authorizationUrl?: string;
    accessTokenUrl?: string;
    clientId?: string;
    clientSecret?: string;
    scope?: string;
    state?: string;
    pkce?: boolean;
  };
}

export interface RequestParam {
  name: string;
  value: string;
  enabled: boolean;
}

export interface RequestHeader {
  name: string;
  value: string;
  enabled: boolean;
}

export interface RequestAssertion {
  name: string;
  value: string;
  enabled: boolean;
}

export interface RequestVars {
  req?: Array<{ name: string; value: string; enabled: boolean }>;
  res?: Array<{ name: string; value: string; enabled: boolean }>;
}

export interface RequestScript {
  req?: string;
  res?: string;
}

export interface RequestSettings {
  [key: string]: any;
}

export interface RequestData {
  method: string;
  url: string;
  params: RequestParam[];
  headers: RequestHeader[];
  auth: AuthConfig;
  body: RequestBody;
  script: RequestScript;
  vars: RequestVars;
  assertions: RequestAssertion[];
  tests: string;
  docs: string;
}

export interface ParsedRequest {
  type: 'http-request' | 'graphql-request';
  name: string;
  seq: number;
  settings: RequestSettings;
  tags: string[];
  request: RequestData;
}

export interface ParsedCollection {
  name: string;
  type?: string;
  version?: string;
  [key: string]: any;
}

export interface EnvironmentVariable {
  name: string;
  value: string;
  enabled: boolean;
}

export interface ParsedEnvironment {
  variables: EnvironmentVariable[];
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