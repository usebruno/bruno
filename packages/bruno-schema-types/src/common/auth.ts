export interface AuthAwsV4 {
  accessKeyId?: string | null;
  secretAccessKey?: string | null;
  sessionToken?: string | null;
  service?: string | null;
  region?: string | null;
  profileName?: string | null;
}

export interface AuthBasic {
  username?: string | null;
  password?: string | null;
}

export interface AuthWsse {
  username?: string | null;
  password?: string | null;
}

export interface AuthBearer {
  token?: string | null;
}

export interface AuthDigest {
  username?: string | null;
  password?: string | null;
}

export interface AuthNTLM {
  username?: string | null;
  password?: string | null;
  domain?: string | null;
}

export interface AuthApiKey {
  key?: string | null;
  value?: string | null;
  placement?: 'header' | 'queryparams' | null;
}

export type OAuthGrantType =
  | 'client_credentials'
  | 'password'
  | 'authorization_code'
  | 'implicit';

export interface OAuthAdditionalParameter {
  name?: string | null;
  value?: string | null;
  sendIn: 'headers' | 'queryparams' | 'body';
  enabled?: boolean;
}

export interface OAuthAdditionalParameters {
  authorization?: OAuthAdditionalParameter[] | null;
  token?: OAuthAdditionalParameter[] | null;
  refresh?: OAuthAdditionalParameter[] | null;
}

export interface OAuth2 {
  grantType: OAuthGrantType;
  username?: string | null;
  password?: string | null;
  callbackUrl?: string | null;
  authorizationUrl?: string | null;
  accessTokenUrl?: string | null;
  clientId?: string | null;
  clientSecret?: string | null;
  scope?: string | null;
  state?: string | null;
  pkce?: boolean | null;
  credentialsPlacement?: 'body' | 'basic_auth_header' | null;
  credentialsId?: string | null;
  tokenPlacement?: string | null;
  tokenHeaderPrefix?: string | null;
  tokenQueryKey?: string | null;
  refreshTokenUrl?: string | null;
  autoRefreshToken?: boolean | null;
  autoFetchToken?: boolean | null;
  additionalParameters?: OAuthAdditionalParameters | null;
}

export type AuthMode =
  | 'inherit'
  | 'none'
  | 'awsv4'
  | 'basic'
  | 'bearer'
  | 'digest'
  | 'ntlm'
  | 'oauth2'
  | 'wsse'
  | 'apikey';

export interface Auth {
  mode: AuthMode;
  awsv4?: AuthAwsV4 | null;
  basic?: AuthBasic | null;
  bearer?: AuthBearer | null;
  digest?: AuthDigest | null;
  ntlm?: AuthNTLM | null;
  oauth2?: OAuth2 | null;
  wsse?: AuthWsse | null;
  apikey?: AuthApiKey | null;
}

