import get from 'lodash/get';

export const getAuthHeaders = (collectionRootAuth, requestAuth, collection, shouldInterpolate = false) => {
  // Discovered edge case where code generation fails when you create a collection which has not been saved yet:
  // Collection auth therefore null, and request inherits from collection, therefore it is also null
  // TypeError: Cannot read properties of undefined (reading 'mode')
  //     at getAuthHeaders
  if (!collectionRootAuth && !requestAuth) {
    return [];
  }

  const auth = collectionRootAuth && ['inherit'].includes(requestAuth?.mode) ? collectionRootAuth : requestAuth;

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
    case 'oauth2':
      const oauth2Config = get(auth, 'oauth2', {});
      const credentialsId = get(oauth2Config, 'credentialsId', 'credentials');
      const tokenPlacement = get(oauth2Config, 'tokenPlacement', 'header');
      const tokenHeaderPrefix = get(oauth2Config, 'tokenHeaderPrefix', 'Bearer');

      // Only add header if token placement is 'header' (not 'url')
      if (tokenPlacement === 'header') {
        let tokenValue;

        // If interpolation is enabled, try to use the actual token
        if (shouldInterpolate) {
          // Try to find the access token in collection.oauth2Credentials
          const oauth2Credentials = get(collection, 'oauth2Credentials', []);
          const collectionUid = get(collection, 'uid');

          // Find credentials matching credentialsId and collectionUid
          const credentialEntry = oauth2Credentials.find((cred) => cred.credentialsId === credentialsId && cred.collectionUid === collectionUid);

          const accessToken = get(credentialEntry, 'credentials.access_token');

          // Use actual token if found, otherwise use placeholder
          tokenValue = accessToken || `{{$oauth2.${credentialsId}.access_token}}`;
        } else {
          // If interpolation is disabled, always use placeholder
          tokenValue = `{{$oauth2.${credentialsId}.access_token}}`;
        }

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
    default:
      return [];
  }
};
