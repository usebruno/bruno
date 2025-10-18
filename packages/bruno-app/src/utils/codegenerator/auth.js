import get from 'lodash/get';

export const getAuthHeaders = (collectionRootAuth, requestAuth) => {

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
    default:
      return [];
  }
};
