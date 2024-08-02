import get from 'lodash/get';

export const getAuthHeaders = (collectionRootAuth, requestAuth) => {
  const auth = collectionRootAuth && ['inherit', 'none'].includes(requestAuth.mode) ? collectionRootAuth : requestAuth;

  switch (auth.mode) {
    case 'basic':
      const username = get(auth, 'basic.username');
      const password = get(auth, 'basic.password');
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
          value: `Bearer ${get(auth, 'bearer.token')}`
        }
      ];
    default:
      return [];
  }
};
