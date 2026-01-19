import axios, { AxiosInstance, AxiosRequestConfig, ResponseType } from 'axios';
import qs from 'qs';
import debug from 'debug';

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

export interface OAuth2Config {
  grantType: 'client_credentials' | 'password';
  accessTokenUrl: string;
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  scope?: string;
  credentialsPlacement?: 'basic_auth_header' | 'body';
  credentialsId?: string;
  autoRefreshToken?: boolean;
  autoFetchToken?: boolean;
  additionalParameters?: {
    token?: AdditionalParameter[];
  };
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
export const getOAuth2Token = async (oauth2Config: OAuth2Config, tokenStore: TokenStore, verbose: string, axiosInstance?: AxiosInstance): Promise<string | null> => {
  const {
    grantType,
    accessTokenUrl,
    credentialsId = 'default',
    autoFetchToken = true
  } = oauth2Config;

  if (verbose) {
    debug.enable('oauth2');
  }

  if (!grantType) {
    throw new Error('Grant type is required for OAuth2');
  }

  if (!accessTokenUrl) {
    throw new Error('Access token URL is required for OAuth2');
  }

  if (!['client_credentials', 'password'].includes(grantType)) {
    throw new Error(`Unsupported grant type: ${grantType}. Supported types: client_credentials, password`);
  }

  // Check if we already have credentials stored
  const existingToken = await tokenStore.getCredential({ url: accessTokenUrl, credentialsId });

  if (existingToken) {
    // Check if token is expired
    if (!isTokenExpired(existingToken)) {
      // Token is valid, use it
      return existingToken.access_token;
    } else {
      // Token is expired
      if (autoFetchToken) {
        // Clear expired token and proceed to fetch new token
        await tokenStore.deleteCredential({ url: accessTokenUrl, credentialsId });
      } else {
        // Return expired token if autoFetchToken is disabled
        return existingToken.access_token;
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

  let tokenResponse;

  if (grantType === 'client_credentials') {
    tokenResponse = await fetchTokenClientCredentials(oauth2Config, axiosInstance);
  } else if (grantType === 'password') {
    tokenResponse = await fetchTokenPassword(oauth2Config, axiosInstance);
  } else {
    throw new Error(`Unsupported grant type: ${grantType}`);
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

  return tokenResponse.access_token;
};
