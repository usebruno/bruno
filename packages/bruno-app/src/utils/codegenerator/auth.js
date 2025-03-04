import get from 'lodash/get';

export const getAuthHeaders = (collectionRootAuth, requestAuth) => {
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
      const apiKeyName = get(auth, 'apikey.key', '');
      
      if (!apiKeyName) {
        return [];
      }
      
      return [
        {
          enabled: true,
          name: apiKeyName,
          value: get(auth, 'apikey.value', '')
        }
      ];

    case 'oauth2':
      return [
        {
          enabled: true,
          name: 'Authorization',
          value: `Bearer ${get(auth, 'oauth2.token', '')}`
        }
      ];
    default:
      return [];
  }
};
