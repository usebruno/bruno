import OAuth2Client from './oauth2Client';

import qs from 'qs';
import { cloneDeep, get } from 'lodash';
import { safeParseJSON, safeStringifyJSON } from '../../../utils/common';
import { makeAxiosInstance } from '../../../utils/network/axios-instance';
import { authorizeUserInWindow } from './authorizeUserInWindow';
import { generateCodeChallenge, generateCodeVerifier, isTokenExpired } from '../../../utils/auth/oauth';

class ElectronOAuth2Client extends OAuth2Client {
  constructor(store) {
    super(store);
  }

  async getOAuth2TokenUsingAuthorizationCode(params) {
    const { request, collectionUid, forceFetch = false, certsAndProxyConfig } = params;
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

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
              if (!autoFetchToken) {
                return { collectionUid, url, credentials: storedCredentials, credentialsId };
              }
            }
          } else {
            if (!autoFetchToken) {
              return { collectionUid, url, credentials: storedCredentials, credentialsId };
            }
            this.clearOauth2Credentials({ collectionUid, url, credentialsId });
          }
        }
      } else if (!autoFetchToken) {
        return { collectionUid, url, credentials: storedCredentials, credentialsId };
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

    const oauth2Credentials = {
      grant_type: 'authorization_code',
      code: authorizationCode,
      redirect_uri: callbackUrl,
      client_id: clientId
    };
    if (clientSecret && credentialsPlacement !== 'basic_auth_header') {
      oauth2Credentials.client_secret = clientSecret;
    }
    if (pkce) {
      oauth2Credentials['code_verifier'] = codeVerifier;
    }
    if (scope) {
      oauth2Credentials.scope = scope;
    }

    requestCopy.data = qs.stringify(oauth2Credentials);
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

      this.persistOauth2Credentials({ collectionUid, url, credentials: parsedResponseData, credentialsId });

      return { collectionUid, url, credentials: parsedResponseData, credentialsId, debugInfo };
    } catch (error) {
      return Promise.reject(safeStringifyJSON(error?.response?.data));
    }
  }

  async getOAuth2AuthorizationCode(request, codeChallenge, collectionUid) {
    const { oauth2: { callbackUrl, clientId, authorizationUrl, scope, state, pkce, accessTokenUrl } } = request;

    const authorizationUrlWithQueryParams = new URL(authorizationUrl);
    authorizationUrlWithQueryParams.searchParams.append('response_type', 'code');
    authorizationUrlWithQueryParams.searchParams.append('client_id', clientId);
    if (callbackUrl) {
      authorizationUrlWithQueryParams.searchParams.append('redirect_uri', callbackUrl);
    }
    if (scope) {
      authorizationUrlWithQueryParams.searchParams.append('scope', scope);
    }
    if (pkce) {
      authorizationUrlWithQueryParams.searchParams.append('code_challenge', codeChallenge);
      authorizationUrlWithQueryParams.searchParams.append('code_challenge_method', 'S256');
    }
    if (state) {
      authorizationUrlWithQueryParams.searchParams.append('state', state);
    }

    try {
      const authorizeUrl = authorizationUrlWithQueryParams.toString();
      const { authorizationCode, debugInfo } = await authorizeUserInWindow({
        authorizeUrl,
        callbackUrl,
        session: this.store.getSessionIdOfCollection({ collectionUid, url: accessTokenUrl })
      });
      return { authorizationCode, debugInfo };
    } catch (err) {
      throw err;
    }
  }
}

export default ElectronOAuth2Client;
