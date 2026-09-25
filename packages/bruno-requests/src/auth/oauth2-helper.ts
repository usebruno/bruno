import axios, { AxiosInstance, AxiosRequestConfig, ResponseType } from 'axios';
import crypto from 'node:crypto';
import qs from 'qs';
import debug from 'debug';

// Same default as the Bruno app, so a collection's redirect URI registered with the IdP keeps matching
const BRUNO_OAUTH2_CALLBACK_URL = 'https://oauth.usebruno.com/callback';

export interface TokenStore {
  saveCredential({ url, credentialsId, credentials }: { url: string; credentialsId: string; credentials: any }): Promise<boolean>;
  getCredential({ url, credentialsId }: { url: string; credentialsId: string }): Promise<any>;
  deleteCredential({ url, credentialsId }: { url: string; credentialsId: string }): Promise<boolean>;
}

export interface AdditionalParameter {
  name: string;
  value: string;
  enabled: boolean;
  sendIn: 'headers' | 'queryparams' | 'body';
}

/**
 * Codes set on errors callers need to tell apart without parsing messages.
 * - UNSUPPORTED_GRANT: the config can never produce a token here, so the request must not be sent.
 * - AUTHORIZATION_DENIED: the IdP answered the authorization request with an `error` (see `oauth2Error`).
 */
export const OAUTH2_ERROR_CODES = {
  UNSUPPORTED_GRANT: 'OAUTH2_UNSUPPORTED_GRANT',
  AUTHORIZATION_DENIED: 'OAUTH2_AUTHORIZATION_DENIED'
} as const;

const createOAuth2Error = (code: string, message: string, details: Record<string, unknown> = {}) =>
  Object.assign(new Error(message), { code, ...details });

export interface OAuth2Config {
  // `implicit` is accepted so collections using it are rejected clearly instead of silently skipped
  grantType: 'client_credentials' | 'password' | 'authorization_code' | 'implicit';
  accessTokenUrl: string;
  refreshTokenUrl?: string;
  authorizationUrl?: string;
  callbackUrl?: string;
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  scope?: string;
  state?: string;
  pkce?: boolean;
  credentialsPlacement?: 'basic_auth_header' | 'body';
  credentialsId?: string;
  autoRefreshToken?: boolean;
  autoFetchToken?: boolean;
  tokenSource?: 'access_token' | 'id_token';
  additionalParameters?: {
    authorization?: AdditionalParameter[];
    token?: AdditionalParameter[];
    refresh?: AdditionalParameter[];
  };
}

/**
 * Sends the user to `authorizeUrl` and resolves with the full URL the IdP redirected back to
 * (the callback URL carrying `code`/`state`, or `error`). The helper validates that URL itself,
 * so implementations only move it from the browser back to the caller.
 */
export type AuthorizeUser = (authorizeUrl: string, context: { callbackUrl: string }) => Promise<string>;

export interface GetOAuth2TokenOptions {
  authorize?: AuthorizeUser;
}

interface RequestConfig extends AxiosRequestConfig {
  method: string;
  url: string;
  headers: {
    'Content-Type': string;
    'Authorization'?: string;
    [key: string]: any;
  };
  data: string;
  responseType: ResponseType;
}

interface ClientCredentialsData {
  grant_type: string;
  scope?: string;
  client_id?: string;
  client_secret?: string;
  [key: string]: any; // For additional parameters
}

interface PasswordGrantData {
  grant_type: string;
  username: string;
  password: string;
  scope?: string;
  client_id?: string;
  client_secret?: string;
  [key: string]: any; // For additional parameters
}

/**
 * Apply additional parameters to a request
 */
const applyAdditionalParameters = (requestConfig: RequestConfig, data: any, params: AdditionalParameter[] = []) => {
  params.forEach((param) => {
    if (!param.enabled || !param.name) {
      return;
    }

    switch (param.sendIn) {
      case 'headers':
        requestConfig.headers[param.name] = param.value || '';
        break;
      case 'queryparams':
        // For query params, add to URL
        try {
          const url = new URL(requestConfig.url);
          url.searchParams.append(param.name, param.value || '');
          requestConfig.url = url.href;
        } catch (error) {
          throw new Error(`Invalid token URL: ${requestConfig.url}`);
        }
        break;
      case 'body':
        // For body, add to data object
        data[param.name] = param.value || '';
        break;
    }
  });
};

/**
 * Safely parse JSON response data
 */
const safeParseJSONBuffer = (data: any) => {
  try {
    return JSON.parse(Buffer.isBuffer(data) ? data.toString() : data);
  } catch {
    return data;
  }
};

/**
 * Fetches an OAuth2 token using client credentials grant
 */
const fetchTokenClientCredentials = async (oauth2Config: OAuth2Config, axiosInstance?: AxiosInstance) => {
  const {
    accessTokenUrl,
    clientId,
    clientSecret,
    scope,
    credentialsPlacement = 'basic_auth_header',
    additionalParameters
  } = oauth2Config;

  if (!accessTokenUrl) {
    throw new Error('Access Token URL is required for OAuth2 client credentials flow');
  }

  if (!clientId) {
    throw new Error('Client ID is required for OAuth2 client credentials flow');
  }

  const requestConfig: RequestConfig = {
    method: 'POST',
    url: accessTokenUrl,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    data: '',
    responseType: 'arraybuffer'
  };

  const data: ClientCredentialsData = {
    grant_type: 'client_credentials'
  };

  if (scope && scope.trim() !== '') {
    data.scope = scope;
  }

  if (credentialsPlacement === 'basic_auth_header') {
    const secret = clientSecret ?? '';
    requestConfig.headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`;
  }

  if (credentialsPlacement !== 'basic_auth_header') {
    data.client_id = clientId;
  }

  if (clientSecret && clientSecret.trim() !== '' && credentialsPlacement !== 'basic_auth_header') {
    data.client_secret = clientSecret;
  }

  if (additionalParameters?.token?.length) {
    applyAdditionalParameters(requestConfig, data, additionalParameters.token);
  }

  requestConfig.data = qs.stringify(data);

  debug('oauth2')('> request');
  debug('oauth2')(JSON.stringify(requestConfig, null, 2));

  try {
    const httpClient = axiosInstance || axios;
    const response = await httpClient(requestConfig);
    const parsedData = safeParseJSONBuffer(response.data);

    if (parsedData && typeof parsedData === 'object') {
      parsedData.created_at = Date.now();
    }

    debug('oauth2')('> response');
    debug('oauth2')(JSON.stringify(parsedData, null, 2));
    return parsedData;
  } catch (err: any) {
    if (err?.response) {
      debug('oauth2')('< error');
      debug('oauth2')(JSON.stringify({
        status: err.response.status,
        statusText: err.response.statusText,
        data: err.response.data ? safeParseJSONBuffer(err.response.data) : null,
        headers: err.response.headers
      }, null, 2));
    } else {
      debug('oauth2')('< error');
      debug('oauth2')(err.message || err);
    }
    throw err;
  }
};

/**
 * Fetches an OAuth2 token using password grant
 */
const fetchTokenPassword = async (oauth2Config: OAuth2Config, axiosInstance?: AxiosInstance) => {
  const {
    accessTokenUrl,
    clientId,
    clientSecret,
    username,
    password,
    scope,
    credentialsPlacement = 'basic_auth_header',
    additionalParameters
  } = oauth2Config;

  if (!accessTokenUrl) {
    throw new Error('Access Token URL is required for OAuth2 password credentials flow');
  }

  if (!username) {
    throw new Error('Username is required for OAuth2 password credentials flow');
  }

  if (!password) {
    throw new Error('Password is required for OAuth2 password credentials flow');
  }

  if (!clientId) {
    throw new Error('Client ID is required for OAuth2 password credentials flow');
  }

  const requestConfig: RequestConfig = {
    method: 'POST',
    url: accessTokenUrl,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    data: '',
    responseType: 'arraybuffer'
  };

  const data: PasswordGrantData = {
    grant_type: 'password',
    username,
    password
  };

  if (scope && scope.trim() !== '') {
    data.scope = scope;
  }

  if (credentialsPlacement === 'basic_auth_header') {
    const secret = clientSecret ?? '';
    requestConfig.headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`;
  }

  if (credentialsPlacement !== 'basic_auth_header') {
    data.client_id = clientId;
  }

  if (clientSecret && clientSecret.trim() !== '' && credentialsPlacement !== 'basic_auth_header') {
    data.client_secret = clientSecret;
  }

  if (additionalParameters?.token?.length) {
    applyAdditionalParameters(requestConfig, data, additionalParameters.token);
  }

  requestConfig.data = qs.stringify(data);

  debug('oauth2')('> request');
  debug('oauth2')(JSON.stringify(requestConfig, null, 2));

  try {
    const httpClient = axiosInstance || axios;
    const response = await httpClient(requestConfig);
    const parsedData = safeParseJSONBuffer(response.data);

    if (parsedData && typeof parsedData === 'object') {
      parsedData.created_at = Date.now();
    }

    debug('oauth2')('< response');
    debug('oauth2')(JSON.stringify(parsedData, null, 2));
    return parsedData;
  } catch (err: any) {
    if (err?.response) {
      debug('oauth2')('< error');
      debug('oauth2')(JSON.stringify({
        status: err.response.status,
        statusText: err.response.statusText,
        data: err.response.data ? safeParseJSONBuffer(err.response.data) : null,
        headers: err.response.headers
      }, null, 2));
    } else {
      debug('oauth2')('< error');
      debug('oauth2')(err.message || err);
    }
    throw err;
  }
};

/**
 * Builds the OAuth2 `state` value. A user-configured state is sent as-is, matching the Bruno app
 * (it may carry data the IdP or redirect target relies on); an empty one gets a random value.
 * Either way the returned state must match exactly.
 */
export const generateState = (userState?: string | null): string => {
  const trimmedUserState = userState?.trim();
  return trimmedUserState || crypto.randomBytes(16).toString('hex');
};

// RFC 7636: 32 random bytes encode to a 43-character base64url verifier
export const generateCodeVerifier = (): string => crypto.randomBytes(32).toString('base64url');

export const generateCodeChallenge = (codeVerifier: string): string =>
  crypto.createHash('sha256').update(codeVerifier).digest('base64url');

interface AuthorizationUrlParams {
  authorizationUrl: string;
  clientId: string;
  callbackUrl: string;
  state: string;
  scope?: string;
  codeChallenge?: string | null;
  additionalParameters?: AdditionalParameter[];
}

/**
 * Builds the authorization request URL. Only `queryparams` additional parameters apply here:
 * the URL is opened in the user's browser, which cannot be given custom headers or a body.
 */
export const buildAuthorizationUrl = ({ authorizationUrl, clientId, callbackUrl, state, scope, codeChallenge, additionalParameters = [] }: AuthorizationUrlParams): string => {
  let url: URL;
  try {
    url = new URL(authorizationUrl);
  } catch {
    throw new Error(`Invalid authorization URL: ${authorizationUrl}`);
  }

  // Checked up front so a bad callback fails before the user is sent to sign in
  try {
    new URL(callbackUrl);
  } catch {
    throw new Error(`Invalid callback URL: ${callbackUrl}`);
  }

  url.searchParams.append('response_type', 'code');
  url.searchParams.append('client_id', clientId);
  url.searchParams.append('redirect_uri', callbackUrl);
  if (scope) {
    url.searchParams.append('scope', scope);
  }
  if (codeChallenge) {
    url.searchParams.append('code_challenge', codeChallenge);
    url.searchParams.append('code_challenge_method', 'S256');
  }
  url.searchParams.append('state', state);

  additionalParameters.forEach((param) => {
    if (param.enabled && param.name && param.sendIn === 'queryparams') {
      url.searchParams.append(param.name, param.value || '');
    }
  });

  return url.toString();
};

const getCallbackParam = (url: URL, name: string): string | null =>
  url.searchParams.get(name) ?? (url.hash ? new URLSearchParams(url.hash.substring(1)).get(name) : null);

/**
 * Extracts the authorization code from the URL the IdP redirected to. Fails closed, checking in
 * order: the configured callback target (origin and path), the state, then an IdP error or a
 * missing code.
 */
export const getAuthorizationCodeFromCallback = (callbackResponseUrl: string, expectedState: string, callbackUrl: string): string => {
  let url: URL;
  try {
    url = new URL(callbackResponseUrl);
  } catch {
    throw new Error('Invalid OAuth2 callback: not a valid URL');
  }

  const expectedCallback = new URL(callbackUrl);
  if (url.origin !== expectedCallback.origin || url.pathname !== expectedCallback.pathname) {
    throw new Error(`Invalid OAuth2 callback: expected a redirect to ${expectedCallback.origin}${expectedCallback.pathname}`);
  }

  // State comes first: until it matches, neither an `error` nor a `code` can be attributed to this
  // attempt, and an unverified error must not be reported (or cached) as a real IdP denial.
  // RFC 6749 (4.1.2.1) requires the IdP to echo the state on error responses too.
  if (!expectedState || getCallbackParam(url, 'state') !== expectedState) {
    throw new Error('OAuth2 state mismatch: the returned state does not match the issued state.');
  }

  const error = getCallbackParam(url, 'error');
  if (error) {
    const errorDescription = getCallbackParam(url, 'error_description');
    throw createOAuth2Error(
      OAUTH2_ERROR_CODES.AUTHORIZATION_DENIED,
      `OAuth2 authorization failed: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`,
      { oauth2Error: error }
    );
  }

  const code = url.searchParams.get('code');
  if (!code) {
    throw new Error('Invalid OAuth2 callback: missing authorization code');
  }

  return code;
};

const applyClientCredentials = (requestConfig: RequestConfig, data: Record<string, any>, { clientId, clientSecret, credentialsPlacement }: OAuth2Config) => {
  if (credentialsPlacement === 'basic_auth_header') {
    const secret = clientSecret ?? '';
    requestConfig.headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`;
    return;
  }

  data.client_id = clientId;
  if (clientSecret && clientSecret.trim() !== '') {
    data.client_secret = clientSecret;
  }
};

/**
 * Posts a token request. Debug output is limited to the URL and status because these bodies carry
 * the authorization code, PKCE verifier, client secret and tokens.
 */
const sendTokenRequest = async (requestConfig: RequestConfig, axiosInstance?: AxiosInstance) => {
  debug('oauth2')(`> ${requestConfig.method} ${requestConfig.url}`);

  try {
    const httpClient = axiosInstance || axios;
    const response = await httpClient(requestConfig);
    const parsedData = safeParseJSONBuffer(response.data);

    if (parsedData && typeof parsedData === 'object') {
      parsedData.created_at = Date.now();
    }

    debug('oauth2')(`< ${response.status}`);
    return parsedData;
  } catch (err: any) {
    debug('oauth2')(`< error ${err?.response?.status ?? err?.message}`);

    const errorData = err?.response?.data ? safeParseJSONBuffer(err.response.data) : null;
    if (errorData && typeof errorData === 'object' && errorData.error) {
      const description = errorData.error_description ? ` - ${errorData.error_description}` : '';
      throw new Error(`OAuth2 token request failed with status ${err.response.status}: ${errorData.error}${description}`);
    }
    throw err;
  }
};

const createTokenRequestConfig = (url: string): RequestConfig => ({
  method: 'POST',
  url,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json'
  },
  data: '',
  responseType: 'arraybuffer'
});

/**
 * Fetches an OAuth2 token using the authorization code grant. `authorize` performs the
 * interactive sign-in; the state and PKCE verifier live only for this call.
 */
const fetchTokenAuthorizationCode = async (oauth2Config: OAuth2Config, authorize?: AuthorizeUser, axiosInstance?: AxiosInstance) => {
  const { authorizationUrl, accessTokenUrl, callbackUrl, clientId, scope, state, pkce, additionalParameters } = oauth2Config;

  if (!authorizationUrl) {
    throw new Error('Authorization URL is required for OAuth2 authorization code flow');
  }

  if (!clientId) {
    throw new Error('Client ID is required for OAuth2 authorization code flow');
  }

  if (!authorize) {
    throw new Error('OAuth2 authorization code flow requires interactive sign-in, which is not available in this runtime');
  }

  const effectiveCallbackUrl = callbackUrl || BRUNO_OAUTH2_CALLBACK_URL;
  const expectedState = generateState(state);
  const codeVerifier = pkce ? generateCodeVerifier() : null;

  const authorizeUrl = buildAuthorizationUrl({
    authorizationUrl,
    clientId,
    callbackUrl: effectiveCallbackUrl,
    state: expectedState,
    scope,
    codeChallenge: codeVerifier ? generateCodeChallenge(codeVerifier) : null,
    additionalParameters: additionalParameters?.authorization
  });

  const callbackResponseUrl = await authorize(authorizeUrl, { callbackUrl: effectiveCallbackUrl });
  const code = getAuthorizationCodeFromCallback(callbackResponseUrl, expectedState, effectiveCallbackUrl);

  const requestConfig = createTokenRequestConfig(accessTokenUrl);
  const data: Record<string, any> = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: effectiveCallbackUrl
  };
  applyClientCredentials(requestConfig, data, oauth2Config);
  if (codeVerifier) {
    data.code_verifier = codeVerifier;
  }
  if (additionalParameters?.token?.length) {
    applyAdditionalParameters(requestConfig, data, additionalParameters.token);
  }
  requestConfig.data = qs.stringify(data);

  return sendTokenRequest(requestConfig, axiosInstance);
};

/**
 * Exchanges a refresh token for new credentials. Resolves with null on any failure so the caller
 * can fall back to a fresh authorization.
 */
const refreshAccessToken = async (oauth2Config: OAuth2Config, refreshToken: string, axiosInstance?: AxiosInstance) => {
  const { accessTokenUrl, refreshTokenUrl, additionalParameters } = oauth2Config;

  const requestConfig = createTokenRequestConfig(refreshTokenUrl || accessTokenUrl);
  const data: Record<string, any> = {
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  };
  applyClientCredentials(requestConfig, data, oauth2Config);

  try {
    if (additionalParameters?.refresh?.length) {
      applyAdditionalParameters(requestConfig, data, additionalParameters.refresh);
    }
    requestConfig.data = qs.stringify(data);

    const credentials = await sendTokenRequest(requestConfig, axiosInstance);
    if (!credentials?.access_token || credentials.error) {
      return null;
    }

    // IdPs that don't rotate refresh tokens omit it from the response; keep the one we have
    if (!credentials.refresh_token) {
      credentials.refresh_token = refreshToken;
    }
    return credentials;
  } catch (err: any) {
    debug('oauth2')(`refresh failed: ${err?.message || err}`);
    return null;
  }
};

/**
 * Check if a token is expired
 */
const isTokenExpired = (credentials: any): boolean => {
  if (!credentials?.access_token) {
    return true;
  }
  if (!credentials?.expires_in || !credentials.created_at) {
    return false; // No expiration info, assume valid
  }
  const expiryTime = credentials.created_at + credentials.expires_in * 1000;
  return Date.now() > expiryTime;
};

/**
 * Manages OAuth2 token retrieval and storage
 */
export const getOAuth2Token = async (oauth2Config: OAuth2Config, tokenStore: TokenStore, verbose: string, axiosInstance?: AxiosInstance, options: GetOAuth2TokenOptions = {}): Promise<string | null> => {
  const {
    grantType,
    accessTokenUrl,
    credentialsId = 'default',
    autoFetchToken = true,
    autoRefreshToken = false,
    tokenSource = 'access_token'
  } = oauth2Config;

  if (verbose) {
    debug.enable('oauth2');
  }

  // Checked before the token URL: grants such as implicit have no token URL, and callers must learn
  // the config can never be honored rather than send the request unauthenticated
  if (!grantType) {
    throw createOAuth2Error(OAUTH2_ERROR_CODES.UNSUPPORTED_GRANT, 'Grant type is required for OAuth2');
  }

  if (!['client_credentials', 'password', 'authorization_code'].includes(grantType)) {
    // Implicit returns tokens in the URL fragment, which only the Bruno app's browser window can read
    if (grantType === 'implicit') {
      throw createOAuth2Error(OAUTH2_ERROR_CODES.UNSUPPORTED_GRANT, `Interactive OAuth2 grant type '${grantType}' is not supported in this runtime. Supported grant types are authorization_code, client_credentials and password. Use the Bruno app for implicit authorization, or provide a pre-fetched access token.`);
    }
    throw createOAuth2Error(OAUTH2_ERROR_CODES.UNSUPPORTED_GRANT, `Unsupported grant type: ${grantType}. Supported types: authorization_code, client_credentials, password`);
  }

  if (!accessTokenUrl) {
    throw new Error('Access token URL is required for OAuth2');
  }

  let tokenResponse;

  // Check if we already have credentials stored
  const existingToken = await tokenStore.getCredential({ url: accessTokenUrl, credentialsId });

  if (existingToken) {
    // Check if token is expired
    if (!isTokenExpired(existingToken)) {
      // Token is valid, use it
      return tokenSource === 'id_token' ? existingToken.id_token : existingToken.access_token;
    }

    // Refreshing avoids sending the user through the browser sign-in again
    if (grantType === 'authorization_code' && autoRefreshToken && existingToken.refresh_token) {
      tokenResponse = await refreshAccessToken(oauth2Config, existingToken.refresh_token, axiosInstance);
    }

    if (!tokenResponse) {
      if (autoFetchToken) {
        // Clear expired token and proceed to fetch new token
        await tokenStore.deleteCredential({ url: accessTokenUrl, credentialsId });
      } else {
        // Return expired token if autoFetchToken is disabled
        return tokenSource === 'id_token' ? existingToken.id_token : existingToken.access_token;
      }
    }
  } else {
    // No stored credentials
    if (!autoFetchToken) {
      // Don't fetch token if autoFetchToken is disabled
      return null;
    }
    // Otherwise, proceed to fetch new token
  }

  if (!tokenResponse) {
    if (grantType === 'client_credentials') {
      tokenResponse = await fetchTokenClientCredentials(oauth2Config, axiosInstance);
    } else if (grantType === 'password') {
      tokenResponse = await fetchTokenPassword(oauth2Config, axiosInstance);
    } else if (grantType === 'authorization_code') {
      tokenResponse = await fetchTokenAuthorizationCode(oauth2Config, options.authorize, axiosInstance);
    } else {
      throw new Error(`Unsupported grant type: ${grantType}`);
    }
  }

  if (tokenResponse.error) {
    throw new Error(JSON.stringify(tokenResponse));
  }

  if (!tokenResponse || !tokenResponse.access_token) {
    throw new Error('No access token received from server');
  }

  if (tokenResponse.expires_in && tokenResponse.created_at) {
    tokenResponse.expires_at = tokenResponse.created_at + tokenResponse.expires_in * 1000;
  }

  const saved = await tokenStore.saveCredential({ url: accessTokenUrl, credentialsId, credentials: tokenResponse });
  if (!saved) {
    console.warn('OAuth2: Failed to save token to store, but proceeding with token');
  }

  return tokenSource === 'id_token' ? tokenResponse.id_token : tokenResponse.access_token;
};
