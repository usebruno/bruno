import get from 'lodash/get';
import { find } from 'lodash';
import { interpolate } from '@usebruno/common';
import { getAllVariables } from 'utils/collections/index';

export const getAuthHeaders = (requestAuth, collection = null, item = null) => {
  // Auth inheritance is resolved upstream, so requestAuth should never have mode 'inherit'
  if (!requestAuth) {
    return [];
  }

  switch (requestAuth.mode) {
    case 'basic':
      const username = get(requestAuth, 'basic.username', '');
      const password = get(requestAuth, 'basic.password', '');
      const basicToken = Buffer.from(`${username}:${password}`).toString('base64');

      return [
        {
          enabled: true,
          name: 'Authorization',
          value: `Basic ${basicToken}`
        }
      ];
    case 'bearer':
      return [
        {
          enabled: true,
          name: 'Authorization',
          value: `Bearer ${get(requestAuth, 'bearer.token', '')}`
        }
      ];
    case 'apikey':
      const apiKeyAuth = get(requestAuth, 'apikey', {});
      const key = get(apiKeyAuth, 'key', '');
      const value = get(apiKeyAuth, 'value', '');
      const placement = get(apiKeyAuth, 'placement', 'header');

      if (placement === 'header') {
        return [
          {
            enabled: true,
            name: key,
            value: value
          }
        ];
      }
      return [];
    case 'oauth2': {
      const oauth2Config = get(requestAuth, 'oauth2', {});
      const tokenPlacement = get(oauth2Config, 'tokenPlacement', 'header');
      const tokenHeaderPrefix = get(oauth2Config, 'tokenHeaderPrefix', 'Bearer');

      // Only add header if token placement is 'header'
      if (tokenPlacement === 'header') {
        // Try to get access token from persisted credentials
        let accessToken = '<access_token>';

        if (collection && item) {
          try {
            const grantType = get(oauth2Config, 'grantType', '');
            // For implicit grant type, use authorizationUrl; for others, use accessTokenUrl
            const urlToLookup = grantType === 'implicit'
              ? get(oauth2Config, 'authorizationUrl', '')
              : get(oauth2Config, 'accessTokenUrl', '');
            const credentialsId = get(oauth2Config, 'credentialsId', 'credentials');
            const collectionUid = get(collection, 'uid');

            if (urlToLookup && collectionUid) {
              // Interpolate the URL with variables
              const variables = getAllVariables(collection, item);
              const interpolatedUrl = interpolate(urlToLookup, variables);

              // Look up stored credentials
              const credentialsData = find(
                collection?.oauth2Credentials || [],
                (creds) =>
                  creds?.url === interpolatedUrl
                  && creds?.collectionUid === collectionUid
                  && creds?.credentialsId === credentialsId
              );

              if (credentialsData?.credentials?.access_token) {
                accessToken = credentialsData.credentials.access_token;
              }
            }
          } catch (error) {
            console.error('Error retrieving OAuth2 access token:', error);
            // Fall back to placeholder if lookup fails
          }
        }

        // Build the authorization header value
        // If tokenHeaderPrefix is empty, just use the token
        // Otherwise, use the format: "prefix token"
        // Always trim the final result for consistent formatting
        const headerValue = (
          tokenHeaderPrefix
            ? `${tokenHeaderPrefix} ${accessToken}`
            : accessToken
        ).trim();

        return [
          {
            enabled: true,
            name: 'Authorization',
            value: headerValue
          }
        ];
      }
      // If tokenPlacement is 'url', this function does not add any auth headers;
      // token placement in the URL/query params must be handled elsewhere.
      return [];
    }
    default:
      return [];
  }
};
