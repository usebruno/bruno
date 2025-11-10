import get from 'lodash/get';

/**
 * Resolves the effective auth configuration by determining whether to use collection or request auth
 * @param {Object} collectionAuth - The collection-level auth configuration
 * @param {Object} requestAuth - The request-level auth configuration
 * @returns {Object} The effective auth configuration to use
 */
export const resolveEffectiveAuth = (collectionAuth, requestAuth) => {
  return collectionAuth && ['inherit'].includes(requestAuth?.mode) ? collectionAuth : requestAuth;
};

/**
 * Finds OAuth2 credentials for a given credentials ID and collection UID
 * @param {Array} oauth2Credentials - Array of OAuth2 credentials
 * @param {string} credentialsId - The credentials ID to search for
 * @param {string} collectionUid - The collection UID to match
 * @returns {Object|undefined} The matching credential entry or undefined if not found
 */
export const findOAuth2Credentials = (oauth2Credentials, credentialsId, collectionUid) => {
  return oauth2Credentials.find((cred) => cred.credentialsId === credentialsId && cred.collectionUid === collectionUid);
};

/**
 * Resolves the OAuth2 token value, using actual token if interpolation is enabled
 * @param {Object} collection - The collection object containing OAuth2 credentials
 * @param {string} credentialsId - The credentials ID to use
 * @param {boolean} shouldInterpolate - Whether to interpolate and use actual token
 * @returns {string} The token value (actual token or placeholder)
 */
export const resolveOAuth2Token = (collection, credentialsId, shouldInterpolate) => {
  if (shouldInterpolate) {
    // Try to find the access token in collection.oauth2Credentials
    const oauth2Credentials = get(collection, 'oauth2Credentials', []);
    const collectionUid = get(collection, 'uid');

    // Find credentials matching credentialsId and collectionUid
    const credentialEntry = findOAuth2Credentials(oauth2Credentials, credentialsId, collectionUid);
    const accessToken = get(credentialEntry, 'credentials.access_token');

    // Use actual token if found, otherwise use placeholder
    return accessToken || `{{$oauth2.${credentialsId}.access_token}}`;
  } else {
    // If interpolation is disabled, always use placeholder
    return `{{$oauth2.${credentialsId}.access_token}}`;
  }
};

export const getAuthHeaders = (collectionRootAuth, requestAuth, collection, shouldInterpolate = false) => {
  // Discovered edge case where code generation fails when you create a collection which has not been saved yet:
  // Collection auth therefore null, and request inherits from collection, therefore it is also null
  // TypeError: Cannot read properties of undefined (reading 'mode')
  //     at getAuthHeaders
  if (!collectionRootAuth && !requestAuth) {
    return [];
  }

  const auth = resolveEffectiveAuth(collectionRootAuth, requestAuth);

  switch (auth.mode) {
    case 'basic': {
      const username = get(auth, 'basic.username', '');
      const password = get(auth, 'basic.password', '');
      const basicToken = Buffer.from(`${username}:${password}`).toString('base64');

      return [
        {
          enabled: true,
          name: 'Authorization',
          value: `Basic ${basicToken}`
        }
      ];
    }
    case 'bearer':
      return [
        {
          enabled: true,
          name: 'Authorization',
          value: `Bearer ${get(auth, 'bearer.token', '')}`
        }
      ];
    case 'apikey': {
      const apiKeyAuth = get(auth, 'apikey', {});
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
    }
    case 'oauth2': {
      const oauth2Config = get(auth, 'oauth2', {});
      const credentialsId = get(oauth2Config, 'credentialsId', 'credentials');
      const tokenPlacement = get(oauth2Config, 'tokenPlacement', 'header');
      const tokenHeaderPrefix = get(oauth2Config, 'tokenHeaderPrefix', 'Bearer');

      // Only add header if token placement is 'header' (not 'url')
      if (tokenPlacement === 'header') {
        const tokenValue = resolveOAuth2Token(collection, credentialsId, shouldInterpolate);

        return [
          {
            enabled: true,
            name: 'Authorization',
            value: `${tokenHeaderPrefix} ${tokenValue}`.trim()
          }
        ];
      }
      // If tokenPlacement is 'url', token goes in query params (handled elsewhere in HAR builder)
      return [];
    }
    default:
      return [];
  }
};
