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

export interface AuthOauth1 {
  consumerKey?: string | null;
  consumerSecret?: string | null;
  accessToken?: string | null;
  tokenSecret?: string | null;
  callbackUrl?: string | null;
  verifier?: string | null;
  signatureMethod?: 'HMAC-SHA1' | 'HMAC-SHA256' | 'HMAC-SHA512' | 'RSA-SHA1' | 'RSA-SHA256' | 'RSA-SHA512' | 'PLAINTEXT' | null;
  privateKey?: string | null;
  privateKeyType?: 'file' | 'text' | null;
  timestamp?: string | null;
  nonce?: string | null;
  version?: string | null;
  realm?: string | null;
  addParamsTo?: 'header' | 'queryparams' | 'body' | null;
  includeBodyHash?: boolean | null;
}

export type OAuthGrantType
  = | 'client_credentials'
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
  tokenSource?: 'access_token' | 'id_token';
  additionalParameters?: OAuthAdditionalParameters | null;
}

export type AuthMode
  = | 'inherit'
    | 'none'
    | 'awsv4'
    | 'basic'
    | 'bearer'
    | 'digest'
    | 'ntlm'
    | 'oauth1'
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
  oauth1?: AuthOauth1 | null;
  oauth2?: OAuth2 | null;
  wsse?: AuthWsse | null;
  apikey?: AuthApiKey | null;
}
