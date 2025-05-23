import get from 'lodash/get';

export const getAuthHeaders = (collectionRootAuth, requestAuth) => {
  console.log(`auth.js getAuthHeaders.collectionRootAuth: ${collectionRootAuth}`);
  console.log(`auth.js getAuthHeaders.requestAuth: ${requestAuth}`);
  // auth.js getAuthHeaders.collectionRootAuth: undefined
  // auth.js:5 auth.js getAuthHeaders.requestAuth: undefined

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
    default:
      return [];
  }
};
