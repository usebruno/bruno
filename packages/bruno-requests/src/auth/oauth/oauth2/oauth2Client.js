import { cloneDeep, get } from 'lodash';
import qs from 'qs';

import { isTokenExpired } from '../../../utils/auth/oauth';
import { safeParseJSON, safeStringifyJSON } from '../../../utils/common';
import { makeAxiosInstance } from '../../../utils/network/axios-instance';

class OAuth2Client {
  store;
  constructor(store) {
    this.store = store;
  }

  async getOAuth2TokenUsingAuthorizationCode(_params) {
    throw new Error('Authorization Code Grant is not supported in this context.');
  }

  async getOAuth2TokenUsingClientCredentials({ request, collectionUid, forceFetch = false, certsAndProxyConfig = {} }) {
    let requestCopy = cloneDeep(request);
    const oAuth = get(requestCopy, 'oauth2', {});
    const { clientId, clientSecret, scope, credentialsPlacement, credentialsId, autoRefreshToken, autoFetchToken } =
      oAuth;
    const url = requestCopy?.oauth2?.accessTokenUrl;

    if (!forceFetch) {
      const storedCredentials = this.getStoredOauth2Credentials({ collectionUid, url, credentialsId });

      if (storedCredentials) {
        if (!isTokenExpired(storedCredentials)) {
          return { collectionUid, url, credentials: storedCredentials, credentialsId };
        } else {
          if (autoRefreshToken && storedCredentials.refresh_token) {
            try {
              const refreshedCredentialsData = await this.refreshOauth2Token({
                requestCopy,
                collectionUid,
                certsAndProxyConfig
              });
              return { collectionUid, url, credentials: refreshedCredentialsData.credentials, credentialsId };
            } catch (error) {
              this.clearOauth2Credentials({ collectionUid, url, credentialsId });
              if (autoFetchToken) {
              } else {
                return { collectionUid, url, credentials: storedCredentials, credentialsId };
              }
            }
          } else if (autoRefreshToken && !storedCredentials.refresh_token) {
            if (autoFetchToken) {
              this.clearOauth2Credentials({ collectionUid, url, credentialsId });
            } else {
              return { collectionUid, url, credentials: storedCredentials, credentialsId };
            }
          } else if (!autoRefreshToken && autoFetchToken) {
            this.clearOauth2Credentials({ collectionUid, url, credentialsId });
          } else {
            return { collectionUid, url, credentials: storedCredentials, credentialsId };
          }
        }
      } else {
        if (autoFetchToken && !storedCredentials) {
        } else {
          return { collectionUid, url, credentials: storedCredentials, credentialsId };
        }
      }
    }

    requestCopy = this.setupOAuthRequest(requestCopy, {
      clientId,
      clientSecret,
      credentialsPlacement
    });

    let oauth2Credentials = {
      grant_type: 'client_credentials',
      client_id: clientId
    };
    if (clientSecret && credentialsPlacement !== 'basic_auth_header') {
      oauth2Credentials.client_secret = clientSecret;
    }
    if (scope) {
      oauth2Credentials.scope = scope;
    }

    requestCopy.data = qs.stringify(oauth2Credentials);
    requestCopy.url = url;

    const axiosInstance = makeAxiosInstance(certsAndProxyConfig);
    const { requestInfo, responseInfo, debugInfo } = this.setupAxiosInterceptors(axiosInstance);

    try {
      const { parsedResponseData, debugInfo } = await this.makeOAuth2Request(requestCopy, certsAndProxyConfig);

      this.persistOauth2Credentials({ collectionUid, url, credentials: parsedResponseData, credentialsId });

      return { collectionUid, url, credentials: parsedResponseData, credentialsId, debugInfo };
    } catch (error) {
      return Promise.reject(safeStringifyJSON(error?.response?.data));
    }
  }

  async getOAuth2TokenUsingPasswordCredentials({
    request,
    collectionUid,
    forceFetch = false,
    certsAndProxyConfig = {}
  }) {
    let requestCopy = cloneDeep(request);
    const oAuth = get(requestCopy, 'oauth2', {});
    const {
      username,
      password,
      clientId,
      clientSecret,
      scope,
      credentialsPlacement,
      credentialsId,
      autoRefreshToken,
      autoFetchToken
    } = oAuth;
    const url = requestCopy?.oauth2?.accessTokenUrl;

    if (!forceFetch) {
      const storedCredentials = this.getStoredOauth2Credentials({ collectionUid, url, credentialsId });

      if (storedCredentials) {
        if (!isTokenExpired(storedCredentials)) {
          return { collectionUid, url, credentials: storedCredentials, credentialsId };
        } else {
          if (autoRefreshToken && storedCredentials.refresh_token) {
            try {
              const refreshedCredentialsData = await this.refreshOauth2Token({
                requestCopy,
                collectionUid,
                certsAndProxyConfig
              });
              return { collectionUid, url, credentials: refreshedCredentialsData.credentials, credentialsId };
            } catch (error) {
              this.clearOauth2Credentials({ collectionUid, url, credentialsId });
              if (autoFetchToken) {
              } else {
                return { collectionUid, url, credentials: storedCredentials, credentialsId };
              }
            }
          } else if (autoRefreshToken && !storedCredentials.refresh_token) {
            if (autoFetchToken) {
              this.clearOauth2Credentials({ collectionUid, url, credentialsId });
            } else {
              return { collectionUid, url, credentials: storedCredentials, credentialsId };
            }
          } else if (!autoRefreshToken && autoFetchToken) {
            this.clearOauth2Credentials({ collectionUid, url, credentialsId });
          } else {
            return { collectionUid, url, credentials: storedCredentials, credentialsId };
          }
        }
      } else {
        if (autoFetchToken && !storedCredentials) {
        } else {
          return { collectionUid, url, credentials: storedCredentials, credentialsId };
        }
      }
    }

    requestCopy = this.setupOAuthRequest(requestCopy, {
      clientId,
      clientSecret,
      credentialsPlacement
    });

    const oauth2Credentials = {
      grant_type: 'password',
      username,
      password,
      client_id: clientId
    };
    if (clientSecret && credentialsPlacement !== 'basic_auth_header') {
      oauth2Credentials.client_secret = clientSecret;
    }
    if (scope) {
      oauth2Credentials.scope = scope;
    }

    requestCopy.data = qs.stringify(oauth2Credentials);
    requestCopy.url = url;

    const axiosInstance = makeAxiosInstance(certsAndProxyConfig);
    const { requestInfo, responseInfo, debugInfo } = this.setupAxiosInterceptors(axiosInstance);

    try {
      const { parsedResponseData, debugInfo } = await this.makeOAuth2Request(requestCopy, certsAndProxyConfig);

      this.persistOauth2Credentials({ collectionUid, url, credentials: parsedResponseData, credentialsId });

      return { collectionUid, url, credentials: parsedResponseData, credentialsId, debugInfo };
    } catch (error) {
      return Promise.reject(safeStringifyJSON(error?.response?.data));
    }
  }

  async makeOAuth2Request(requestConfig, axiosConfig = {}) {
    const axiosInstance = makeAxiosInstance(axiosConfig);
    const { requestInfo, responseInfo, debugInfo } = this.setupAxiosInterceptors(axiosInstance);

    try {
      const response = await axiosInstance(requestConfig);
      const parsedResponseData = safeParseJSON(
        Buffer.isBuffer(response.data) ? response.data.toString() : response.data
      );

      debugInfo.data.push({
        requestId: Date.now().toString(),
        request: {
          url: requestInfo?.url,
          method: requestInfo?.method,
          headers: requestInfo?.headers || {},
          data: requestInfo?.data,
          error: null
        },
        response: {
          url: responseInfo?.url,
          headers: responseInfo?.headers,
          data: parsedResponseData,
          status: responseInfo?.status,
          statusText: responseInfo?.statusText,
          timeline: responseInfo?.timeline,
          error: null
        },
        fromCache: false,
        completed: true,
        requests: []
      });

      return { parsedResponseData, debugInfo };
    } catch (error) {
      return Promise.reject(safeStringifyJSON(error?.response?.data));
    }
  }

  async refreshOauth2Token({ requestCopy, collectionUid, certsAndProxyConfig }) {
    const oAuth = get(requestCopy, 'oauth2', {});
    const { clientId, clientSecret, credentialsId } = oAuth;
    const url = oAuth.refreshTokenUrl ? oAuth.refreshTokenUrl : oAuth.accessTokenUrl;

    const credentials = this.getStoredOauth2Credentials({ collectionUid, url, credentialsId });

    if (!credentials?.refresh_token) {
      this.clearOauth2Credentials({ collectionUid, url, credentialsId });
      // Proceed without token
      return { collectionUid, url, credentials: null, credentialsId };
    } else {
      requestCopy = this.setupOAuthRequest(requestCopy, {
        clientId,
        clientSecret,
        credentialsPlacement: oAuth.credentialsPlacement
      });

      const oauth2CredentialsData = {
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: credentials.refresh_token
      };
      if (clientSecret) {
        oauth2CredentialsData.client_secret = clientSecret;
      }

      requestCopy.data = qs.stringify(oauth2Credentials);
      requestCopy.url = url;

      try {
        const { parsedResponseData, debugInfo } = await this.makeOAuth2Request(requestCopy, certsAndProxyConfig);

        if (parsedResponseData?.error) {
          this.clearOauth2Credentials({ collectionUid, url, credentialsId });
          return { collectionUid, url, credentials: null, credentialsId, debugInfo };
        }

        this.persistOauth2Credentials({ collectionUid, url, credentials: parsedResponseData, credentialsId });
        return { collectionUid, url, credentials: parsedResponseData, credentialsId, debugInfo };
      } catch (error) {
        this.clearOauth2Credentials({ collectionUid, url, credentialsId });
        // Proceed without token
        return { collectionUid, url, credentials: null, credentialsId, debugInfo };
      }
    }
  }

  setupAxiosInterceptors(axiosInstance) {
    let requestInfo = null;
    let responseInfo = null;
    let debugInfo = { data: [] };

    axiosInstance.interceptors.request.use((config) => {
      const requestData = typeof config?.data === 'string' ? config?.data : safeStringifyJSON(config?.data);
      requestInfo = {
        method: config.method.toUpperCase(),
        url: config.url,
        headers: config.headers,
        data: requestData,
        timestamp: Date.now()
      };
      return config;
    });

    axiosInstance.interceptors.response.use(
      (response) => {
        responseInfo = {
          url: response?.url,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: response.data,
          timestamp: Date.now(),
          timeline: response?.timeline
        };
        return response;
      },
      (error) => {
        if (error.response) {
          responseInfo = {
            url: error?.response?.url,
            status: error.response.status,
            statusText: error.response.statusText,
            headers: error.response.headers,
            data: error.response.data,
            timestamp: Date.now(),
            timeline: error?.response?.timeline,
            error: 'fetching access token failed! check timeline network logs'
          };
        } else if (error?.code) {
          responseInfo = {
            status: '-',
            statusText: error.code,
            headers: error?.config?.headers,
            data: safeStringifyJSON(error?.errors),
            timeline: error?.response?.timeline
          };
        }
        return Promise.reject(error);
      }
    );

    return { requestInfo, responseInfo, debugInfo };
  }

  setupOAuthRequest(requestCopy, { clientId, clientSecret, credentialsPlacement }) {
    return {
      ...requestCopy,
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        ...(credentialsPlacement === 'basic_auth_header' && {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
        })
      },
      responseType: 'arraybuffer'
    };
  }

  // Utility functions
  persistOauth2Credentials({ collectionUid, url, credentials, credentialsId }) {
    if (credentials?.error || !credentials?.access_token) return;
    const enhancedCredentials = {
      ...credentials,
      created_at: Date.now()
    };
    this.store.updateCredentialsForCollection({ collectionUid, url, credentials: enhancedCredentials, credentialsId });
  }

  clearOauth2Credentials({ collectionUid, url, credentialsId }) {
    this.store.clearCredentialsForCollection({ collectionUid, url, credentialsId });
  }

  getStoredOauth2Credentials({ collectionUid, url, credentialsId }) {
    try {
      const credentials = this.store.getCredentialsForCollection({ collectionUid, url, credentialsId });
      return credentials;
    } catch (error) {
      return null;
    }
  }
}

export default OAuth2Client;
