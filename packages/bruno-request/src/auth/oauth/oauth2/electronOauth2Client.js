import OAuth2Client from './oauth2Client';

import { cloneDeep, get } from 'lodash';
import qs from 'qs';
import { generateCodeVerifier, generateCodeChallenge, isTokenExpired } from '../../../utils/auth/oauth';
import { safeParseJSON, safeStringifyJSON } from '../../../utils/common';
import { makeAxiosInstance } from '../../../utils/network/index';

class ElectronOAuth2Client extends OAuth2Client {
  constructor(store) {
    super(store);
  }

  async getOAuth2TokenUsingAuthorizationCode(params) {
    const { request, collectionUid, forceFetch = false, certsAndProxyConfig } = params;
    let codeVerifier = generateCodeVerifier();
    let codeChallenge = generateCodeChallenge(codeVerifier);

    let requestCopy = cloneDeep(request);
    const oAuth = get(requestCopy, 'oauth2', {});
    const {
      clientId,
      clientSecret,
      callbackUrl,
      scope,
      pkce,
      credentialsPlacement,
      authorizationUrl,
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

    const { authorizationCode, debugInfo } = await this.getOAuth2AuthorizationCode(
      requestCopy,
      codeChallenge,
      collectionUid
    );

    // Configure request
    requestCopy = this.setupOAuthRequest(requestCopy, {
      clientId,
      clientSecret,
      credentialsPlacement
    });

    // Build OAuth data
    const oauthData = this.buildOAuthData({
      clientId,
      clientSecret,
      authorizationCode,
      callbackUrl,
      credentialsPlacement,
      codeVerifier,
      pkce,
      scope
    });

    // Update request with OAuth data
    requestCopy.data = qs.stringify(oauthData);
    requestCopy.url = url;

    try {
      const { proxyMode, proxyConfig, httpsAgentRequestFields, interpolationOptions } = certsAndProxyConfig;
      const axiosInstance = makeAxiosInstance({
        proxyMode,
        proxyConfig,
        httpsAgentRequestFields,
        interpolationOptions
      });

      const { requestInfo, responseInfo, debugInfo } = this.setupAxiosInterceptors(axiosInstance);

      const response = await axiosInstance(requestCopy);
      const parsedResponseData = safeParseJSON(
        Buffer.isBuffer(response.data) ? response.data?.toString() : response.data
      );

      if (!debugInfo) {
        debugInfo = { data: [] };
      } else if (!debugInfo.data) {
        debugInfo.data = [];
      }

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
          error: responseInfo?.error,
          timeline: responseInfo?.timeline
        },
        fromCache: false,
        completed: true,
        requests: []
      });

      this.persistOauth2Credentials({ collectionUid, url, credentials: parsedResponseData, credentialsId });

      return { collectionUid, url, credentials: parsedResponseData, credentialsId, debugInfo };
    } catch (error) {
      return Promise.reject(safeStringifyJSON(error?.response?.data));
    }
  }
}

export default ElectronOAuth2Client;