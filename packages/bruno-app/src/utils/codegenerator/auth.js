import get from 'lodash/get';

/**
 * Get authentication headers for code generation.
 * 
 * @param {Object} resolvedAuthOrCollectionAuth - Either the resolved auth object (new usage)
 *                                                 or collection root auth (legacy usage)
 * @param {Object} requestOrRequestAuth - Either the request object (new usage)
 *                                         or request auth (legacy usage)
 * @returns {Array} Array of header objects with enabled, name, and value properties
 */
export const getAuthHeaders = (resolvedAuthOrCollectionAuth, requestOrRequestAuth) => {
  // Handle null/undefined inputs
  if (!resolvedAuthOrCollectionAuth && !requestOrRequestAuth) {
    return [];
  }

  // Determine auth object to use
  let auth;

  // Check if second param is a legacy requestAuth (has 'mode' directly) or new request object (has 'auth.mode')
  const isLegacySecondParam = requestOrRequestAuth?.mode !== undefined;
  const isNewUsageSecondParam = requestOrRequestAuth?.auth?.mode !== undefined;

  if (isLegacySecondParam) {
    // Legacy usage: first param is collectionAuth, second is requestAuth
    // Use collectionAuth if requestAuth.mode is 'inherit', otherwise use requestAuth
    if (requestOrRequestAuth.mode === 'inherit') {
      auth = resolvedAuthOrCollectionAuth;
    } else {
      auth = requestOrRequestAuth;
    }
  } else if (isNewUsageSecondParam) {
    // New usage: request object passed as second param
    // Prefer first param if it has a valid resolved auth, otherwise use request.auth
    if (resolvedAuthOrCollectionAuth?.mode &&
      resolvedAuthOrCollectionAuth.mode !== 'inherit' &&
      resolvedAuthOrCollectionAuth.mode !== 'none') {
      auth = resolvedAuthOrCollectionAuth;
    } else {
      auth = requestOrRequestAuth.auth;
    }
  } else {
    // First param only - new usage with resolved auth passed directly
    auth = resolvedAuthOrCollectionAuth;
  }

  // If no valid auth or mode is none/inherit, return empty
  if (!auth || !auth.mode || auth.mode === 'none' || auth.mode === 'inherit') {
    return [];
  }

  switch (auth.mode) {
    case 'basic':
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
    case 'bearer':
      return [
        {
          enabled: true,
          name: 'Authorization',
          value: `Bearer ${get(auth, 'bearer.token', '')}`
        }
      ];
    case 'apikey':
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
    default:
      return [];
  }
};

